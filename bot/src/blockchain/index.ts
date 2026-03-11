import { TonClient, WalletContractV4, internal, toNano, Address, Cell, contractAddress, StateInit, beginCell, storeStateInit } from "@ton/ton";
import { mnemonicToPrivateKey, KeyPair } from "@ton/crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- Op-codes (must match contracts/escrow.tolk) ---
const OP_DEPOSIT = 0x1;
const OP_CONFIRM = 0x2;
const OP_CANCEL = 0x3;
const OP_RESOLVE = 0x4;
const OP_TIMEOUT = 0x5;

// Contract states
export const ContractState = {
  UNFUNDED: 0,
  FUNDED: 1,
  COMPLETED: 2,
  CANCELLED: 3,
  RESOLVED: 4,
} as const;

export interface DealStateOnChain {
  state: number;
  balance: bigint;
  buyer: Address;
  seller: Address;
  arbiter: Address;
  amount: bigint;
  timeout: number;
}

// --- Singleton client ---

let tonClient: TonClient | null = null;

export function getTonClient(): TonClient {
  if (!tonClient) {
    tonClient = new TonClient({
      endpoint: process.env.TON_TESTNET_ENDPOINT || "https://testnet.toncenter.com/api/v2/jsonRPC",
      apiKey: process.env.TON_API_KEY,
    });
  }
  return tonClient;
}

// --- Arbiter wallet ---

let arbiterKeyPair: KeyPair | null = null;
let arbiterWallet: WalletContractV4 | null = null;

async function getArbiterWallet() {
  if (!arbiterKeyPair || !arbiterWallet) {
    const mnemonic = process.env.ARBITER_WALLET_MNEMONIC;
    if (!mnemonic) throw new Error("ARBITER_WALLET_MNEMONIC not set");
    arbiterKeyPair = await mnemonicToPrivateKey(mnemonic.split(" "));
    arbiterWallet = WalletContractV4.create({
      workchain: 0,
      publicKey: arbiterKeyPair.publicKey,
    });
  }
  return { wallet: arbiterWallet, keyPair: arbiterKeyPair };
}

export async function getArbiterAddress(): Promise<Address> {
  const { wallet } = await getArbiterWallet();
  return wallet.address;
}

// --- Contract deployment ---

// Pre-compiled code cell hex will be stored here after izTolkMcp compilation
let escrowCodeCell: Cell | null = null;

export function setEscrowCode(hexBoc: string) {
  escrowCodeCell = Cell.fromBoc(Buffer.from(hexBoc, "hex"))[0];
}

export function loadEscrowCodeFromFile(): boolean {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const hexPath = path.join(__dirname, "../../../contracts/compiled/escrow.hex");
    if (fs.existsSync(hexPath)) {
      const hex = fs.readFileSync(hexPath, "utf-8").trim();
      setEscrowCode(hex);
      console.log("Escrow code loaded from contracts/compiled/escrow.hex");
      return true;
    }
  } catch (e) {
    console.warn("Could not load escrow code from file:", e);
  }
  return false;
}

export function getEscrowCode(): Cell {
  if (!escrowCodeCell) {
    // Try loading from file first
    if (!loadEscrowCodeFromFile()) {
      throw new Error(
        "Escrow code cell not set. Compile contract via izTolkMcp and save hex to contracts/compiled/escrow.hex",
      );
    }
  }
  return escrowCodeCell!;
}

function buildInitData(params: {
  buyer: Address;
  seller: Address;
  arbiter: Address;
  amount: bigint;
  timeout: number;
}): Cell {
  return beginCell()
    .storeAddress(params.buyer)
    .storeAddress(params.seller)
    .storeAddress(params.arbiter)
    .storeCoins(params.amount)
    .storeUint(params.timeout, 32)
    .storeUint(0, 8) // state = UNFUNDED
    .endCell();
}

export function computeContractAddress(params: {
  buyer: Address;
  seller: Address;
  arbiter: Address;
  amount: bigint;
  timeout: number;
}): Address {
  const code = getEscrowCode();
  const data = buildInitData(params);
  return contractAddress(0, { code, data });
}

export async function deployEscrowContract(params: {
  buyer: Address;
  seller: Address;
  amount: bigint;
  timeoutSeconds: number;
}): Promise<Address> {
  const client = getTonClient();
  const { wallet, keyPair } = await getArbiterWallet();
  const arbiterAddress = wallet.address;

  const timeout = Math.floor(Date.now() / 1000) + params.timeoutSeconds;
  const code = getEscrowCode();
  const data = buildInitData({
    buyer: params.buyer,
    seller: params.seller,
    arbiter: arbiterAddress,
    amount: params.amount,
    timeout,
  });

  const stateInit: StateInit = { code, data };
  const addr = contractAddress(0, stateInit);

  // Deploy via arbiter wallet
  const walletContract = client.open(wallet);
  const seqno = await walletContract.getSeqno();

  await walletContract.sendTransfer({
    secretKey: keyPair.secretKey,
    seqno,
    messages: [
      internal({
        to: addr,
        value: toNano("0.05"), // deploy fee
        init: stateInit,
        body: beginCell().endCell(),
      }),
    ],
  });

  return addr;
}

// --- Arbiter operations ---

async function sendToContract(contractAddr: Address, body: Cell) {
  const client = getTonClient();
  const { wallet, keyPair } = await getArbiterWallet();
  const walletContract = client.open(wallet);
  const seqno = await walletContract.getSeqno();

  await walletContract.sendTransfer({
    secretKey: keyPair.secretKey,
    seqno,
    messages: [
      internal({
        to: contractAddr,
        value: toNano("0.03"), // gas fee
        body,
      }),
    ],
  });
}

export async function confirmDeal(contractAddr: Address) {
  const body = beginCell().storeUint(OP_CONFIRM, 32).storeUint(0, 64).endCell();
  await sendToContract(contractAddr, body);
}

export async function cancelDeal(contractAddr: Address) {
  const body = beginCell().storeUint(OP_CANCEL, 32).storeUint(0, 64).endCell();
  await sendToContract(contractAddr, body);
}

export async function resolveDeal(contractAddr: Address, sellerPercent: number) {
  const body = beginCell()
    .storeUint(OP_RESOLVE, 32)
    .storeUint(0, 64)
    .storeUint(sellerPercent, 8)
    .endCell();
  await sendToContract(contractAddr, body);
}

export async function triggerTimeout(contractAddr: Address) {
  const body = beginCell().storeUint(OP_TIMEOUT, 32).storeUint(0, 64).endCell();
  await sendToContract(contractAddr, body);
}

// --- Contract state reader ---

export async function getDealStateOnChain(contractAddr: Address): Promise<DealStateOnChain | null> {
  const client = getTonClient();

  try {
    const result = await client.runMethod(contractAddr, "getDealState");
    const state = result.stack.readNumber();
    const balance = result.stack.readBigNumber();
    const buyer = result.stack.readAddress();
    const seller = result.stack.readAddress();
    const arbiter = result.stack.readAddress();
    const amount = result.stack.readBigNumber();
    const timeout = result.stack.readNumber();

    return { state, balance, buyer, seller, arbiter, amount, timeout };
  } catch {
    // Contract might not be deployed yet
    return null;
  }
}

// --- Transaction monitoring ---

export async function pollContractState(
  contractAddr: Address,
  expectedState: number,
  timeoutMs: number = 120000,
  intervalMs: number = 5000,
): Promise<DealStateOnChain | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const state = await getDealStateOnChain(contractAddr);
    if (state && state.state >= expectedState) {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return null;
}

// --- Deposit link for Mini App ---

export function buildDepositPayload(): Cell {
  return beginCell().storeUint(OP_DEPOSIT, 32).storeUint(0, 64).endCell();
}
