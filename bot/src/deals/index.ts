import { randomUUID } from "crypto";
import { Address, toNano } from "@ton/ton";
import {
  createDeal,
  getDealById,
  getDealsByUser,
  getActiveDeals,
  updateDealStatus,
  type Deal,
  type DealStatus,
} from "../db/index.js";
import {
  deployEscrowContract,
  confirmDeal as confirmOnChain,
  cancelDeal as cancelOnChain,
  resolveDeal as resolveOnChain,
  triggerTimeout as triggerTimeoutOnChain,
  getDealStateOnChain,
  ContractState,
  buildDepositPayload,
} from "../blockchain/index.js";
import type { ParsedDeal } from "../ai/index.js";

// --- State machine ---
// created → confirmed → funded → delivered → completed
//                     → funded → disputed → resolved
//                                        → cancelled (arbiter cancel)
// created/confirmed → cancelled (either party)
// delivered + 7 days → completed (auto-timeout)

const VALID_TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  created: ["confirmed", "cancelled"],
  confirmed: ["funded", "cancelled"],
  funded: ["delivered", "disputed", "completed"],
  delivered: ["completed", "disputed"],
  completed: [],
  disputed: ["resolved", "cancelled"],
  resolved: [],
  expired: [],
  cancelled: [],
};

function canTransition(from: DealStatus, to: DealStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// --- Public API ---

export function createNewDeal(parsed: ParsedDeal, sellerId: number, buyerId: number): Deal {
  const id = randomUUID().slice(0, 8);
  return createDeal({
    id,
    seller_id: sellerId,
    buyer_id: buyerId,
    amount: parsed.amount!,
    currency: parsed.currency,
    description: parsed.description!,
  });
}

export function confirmDealByCounterparty(dealId: string): Deal | null {
  const deal = getDealById(dealId);
  if (!deal || !canTransition(deal.status, "confirmed")) return null;
  updateDealStatus(dealId, "confirmed");
  return getDealById(dealId);
}

export async function deployContractForDeal(
  dealId: string,
  buyerWallet: string,
  sellerWallet: string,
): Promise<{ deal: Deal; contractAddress: string } | null> {
  const deal = getDealById(dealId);
  if (!deal || deal.status !== "confirmed") return null;

  const buyer = Address.parse(buyerWallet);
  const seller = Address.parse(sellerWallet);
  const amount = toNano(deal.amount.toString());

  // 7 days timeout from now (will be extended after delivery marking)
  const timeoutSeconds = 14 * 24 * 60 * 60; // 14 days max

  const contractAddr = await deployEscrowContract({
    buyer,
    seller,
    amount,
    timeoutSeconds,
  });

  const contractAddress = contractAddr.toString();
  updateDealStatus(dealId, "confirmed", { contract_address: contractAddress });
  return { deal: getDealById(dealId)!, contractAddress };
}

export function markDealFunded(dealId: string): Deal | null {
  const deal = getDealById(dealId);
  if (!deal || !canTransition(deal.status, "funded")) return null;
  updateDealStatus(dealId, "funded");
  return getDealById(dealId);
}

export function markDelivered(dealId: string): Deal | null {
  const deal = getDealById(dealId);
  if (!deal || !canTransition(deal.status, "delivered")) return null;

  const now = new Date();
  const timeoutAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  updateDealStatus(dealId, "delivered", {
    delivered_at: now.toISOString(),
    timeout_at: timeoutAt.toISOString(),
  });
  return getDealById(dealId);
}

export async function completeDeal(dealId: string): Promise<Deal | null> {
  const deal = getDealById(dealId);
  if (!deal || !canTransition(deal.status, "completed")) return null;
  if (!deal.contract_address) return null;

  await confirmOnChain(Address.parse(deal.contract_address));
  updateDealStatus(dealId, "completed");
  return getDealById(dealId);
}

export function openDispute(dealId: string): Deal | null {
  const deal = getDealById(dealId);
  if (!deal || !canTransition(deal.status, "disputed")) return null;
  updateDealStatus(dealId, "disputed");
  return getDealById(dealId);
}

export async function resolveDispute(dealId: string, sellerPercent: number): Promise<Deal | null> {
  const deal = getDealById(dealId);
  if (!deal || deal.status !== "disputed") return null;
  if (!deal.contract_address) return null;

  await resolveOnChain(Address.parse(deal.contract_address), sellerPercent);
  updateDealStatus(dealId, "resolved");
  return getDealById(dealId);
}

export function cancelDeal(dealId: string): Deal | null {
  const deal = getDealById(dealId);
  if (!deal || !canTransition(deal.status, "cancelled")) return null;
  updateDealStatus(dealId, "cancelled");
  return getDealById(dealId);
}

export async function cancelFundedDeal(dealId: string): Promise<Deal | null> {
  const deal = getDealById(dealId);
  if (!deal || deal.status !== "disputed") return null;
  if (!deal.contract_address) return null;

  await cancelOnChain(Address.parse(deal.contract_address));
  updateDealStatus(dealId, "cancelled");
  return getDealById(dealId);
}

// --- Monitoring ---

export async function checkFundingStatus(dealId: string): Promise<boolean> {
  const deal = getDealById(dealId);
  if (!deal || deal.status !== "confirmed" || !deal.contract_address) return false;

  const state = await getDealStateOnChain(Address.parse(deal.contract_address));
  if (state && state.state === ContractState.FUNDED) {
    markDealFunded(dealId);
    return true;
  }
  return false;
}

// --- Timeout checker ---

export async function checkTimeouts(): Promise<Deal[]> {
  const deals = getActiveDeals();
  const expired: Deal[] = [];

  for (const deal of deals) {
    if (deal.status !== "delivered" || !deal.timeout_at || !deal.contract_address) continue;

    const timeoutAt = new Date(deal.timeout_at).getTime();
    if (Date.now() >= timeoutAt) {
      try {
        await triggerTimeoutOnChain(Address.parse(deal.contract_address));
        updateDealStatus(deal.id, "completed");
        expired.push(getDealById(deal.id)!);
      } catch {
        // Contract timeout might not be reached yet on-chain
      }
    }
  }

  return expired;
}

// --- Helpers ---

export function getDepositPayloadBase64(): string {
  return buildDepositPayload().toBoc().toString("base64");
}

export { getDealById, getDealsByUser, getActiveDeals };
