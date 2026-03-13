import { randomUUID } from "crypto";
import { Address, toNano } from "@ton/ton";
import {
  createDeal,
  getDealById,
  getDealsByUser,
  getActiveDeals,
  updateDealStatus,
  updateDealRate,
  updateCompletionTime,
  updateLastActive,
  incrementCancelled,
  incrementDisputes,
  trackRepeatClient,
  getGroupsForDeal,
  updateGroupStatsOnCompletion,
  type Deal,
  type DealStatus,
} from "../db/index.js";
import { convertToTon, type Currency } from "../rates.js";
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

const RATE_LOCK_SECONDS = 15 * 60; // 15 minutes
const MAX_DEAL_AMOUNT_TON = 100;

export async function createNewDeal(parsed: ParsedDeal, sellerId: number, buyerId: number): Promise<Deal> {
  const id = randomUUID().slice(0, 8);
  const currency = parsed.currency as Currency;
  const originalAmount = parsed.amount!;

  let tonAmount = originalAmount;
  let exchangeRate: number | undefined;
  let rateExpiresAt: number | undefined;
  let originalCurrency: string | undefined;

  if (currency !== "TON") {
    const result = await convertToTon(originalAmount, currency);
    if (result) {
      tonAmount = result.tonAmount;
      exchangeRate = result.rate;
      rateExpiresAt = Math.floor(Date.now() / 1000) + RATE_LOCK_SECONDS;
      originalCurrency = currency;
    }
    // If conversion fails, tonAmount stays as originalAmount (fallback)
  }

  if (tonAmount > MAX_DEAL_AMOUNT_TON) {
    throw new Error(`Maximum deal amount is ${MAX_DEAL_AMOUNT_TON} TON during launch period.`);
  }

  return await createDeal({
    id,
    seller_id: sellerId,
    buyer_id: buyerId,
    amount: tonAmount,
    currency: "TON",
    description: parsed.description!,
    original_amount: originalCurrency ? originalAmount : undefined,
    original_currency: originalCurrency,
    exchange_rate: exchangeRate,
    rate_expires_at: rateExpiresAt,
  });
}

export async function confirmDealByCounterparty(dealId: string): Promise<Deal | null> {
  const deal = await getDealById(dealId);
  if (!deal || !canTransition(deal.status, "confirmed")) return null;
  await updateDealStatus(dealId, "confirmed");
  return await getDealById(dealId);
}

export async function deployContractForDeal(
  dealId: string,
  buyerWallet: string,
  sellerWallet: string,
): Promise<{ deal: Deal; contractAddress: string } | null> {
  const deal = await getDealById(dealId);
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
  await updateDealStatus(dealId, "confirmed", { contract_address: contractAddress });
  return { deal: (await getDealById(dealId))!, contractAddress };
}

export async function markDealFunded(dealId: string): Promise<Deal | null> {
  const deal = await getDealById(dealId);
  if (!deal || !canTransition(deal.status, "funded")) return null;
  await updateDealStatus(dealId, "funded");
  return await getDealById(dealId);
}

export async function markDelivered(dealId: string): Promise<Deal | null> {
  const deal = await getDealById(dealId);
  if (!deal || !canTransition(deal.status, "delivered")) return null;

  const now = new Date();
  const timeoutAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await updateDealStatus(dealId, "delivered", {
    delivered_at: now.toISOString(),
    timeout_at: timeoutAt.toISOString(),
  });
  return await getDealById(dealId);
}

export async function completeDeal(dealId: string): Promise<Deal | null> {
  const deal = await getDealById(dealId);
  if (!deal || !canTransition(deal.status, "completed")) return null;
  if (!deal.contract_address) return null;

  await confirmOnChain(Address.parse(deal.contract_address));
  await updateDealStatus(dealId, "completed");

  // Metrics collection
  const createdAt = new Date(deal.created_at).getTime();
  const completionDays = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
  await updateCompletionTime(deal.seller_id, completionDays);
  await updateCompletionTime(deal.buyer_id, completionDays);
  await updateLastActive(deal.seller_id);
  await updateLastActive(deal.buyer_id);

  // Check repeat clients
  const buyerDeals = await getDealsByUser(deal.buyer_id);
  const hasRepeat = buyerDeals.some(d => d.id !== dealId && d.seller_id === deal.seller_id && d.status === "completed");
  if (hasRepeat) {
    await trackRepeatClient(deal.seller_id);
  }

  // Update group stats
  const groups = await getGroupsForDeal(dealId);
  for (const groupId of groups) {
    await updateGroupStatsOnCompletion(groupId, deal.amount);
  }

  return await getDealById(dealId);
}

export async function openDispute(dealId: string): Promise<Deal | null> {
  const deal = await getDealById(dealId);
  if (!deal || !canTransition(deal.status, "disputed")) return null;
  await updateDealStatus(dealId, "disputed");

  // Metrics: track dispute opened for both parties
  await incrementDisputes(deal.buyer_id, "disputes_opened");
  await incrementDisputes(deal.seller_id, "disputes_opened");

  return await getDealById(dealId);
}

export async function resolveDispute(dealId: string, sellerPercent: number): Promise<Deal | null> {
  const deal = await getDealById(dealId);
  if (!deal || deal.status !== "disputed") return null;
  if (!deal.contract_address) return null;

  await resolveOnChain(Address.parse(deal.contract_address), sellerPercent);
  await updateDealStatus(dealId, "resolved");

  // Metrics: track disputes_lost for the party that got < 50%
  if (sellerPercent < 50) {
    await incrementDisputes(deal.seller_id, "disputes_lost");
  } else if (sellerPercent > 50) {
    await incrementDisputes(deal.buyer_id, "disputes_lost");
  }
  // If exactly 50/50 — neither side "lost"

  // Update group stats (resolution counts as completion)
  const groups = await getGroupsForDeal(dealId);
  for (const groupId of groups) {
    await updateGroupStatsOnCompletion(groupId, deal.amount);
  }

  return await getDealById(dealId);
}

export async function cancelDeal(dealId: string): Promise<Deal | null> {
  const deal = await getDealById(dealId);
  if (!deal || !canTransition(deal.status, "cancelled")) return null;
  await updateDealStatus(dealId, "cancelled");

  // Metrics: track cancellation for both parties
  await incrementCancelled(deal.seller_id);
  await incrementCancelled(deal.buyer_id);

  return await getDealById(dealId);
}

export async function cancelFundedDeal(dealId: string): Promise<Deal | null> {
  const deal = await getDealById(dealId);
  if (!deal || deal.status !== "disputed") return null;
  if (!deal.contract_address) return null;

  await cancelOnChain(Address.parse(deal.contract_address));
  await updateDealStatus(dealId, "cancelled");
  return await getDealById(dealId);
}

// --- Monitoring ---

export async function checkFundingStatus(dealId: string): Promise<boolean> {
  const deal = await getDealById(dealId);
  if (!deal || deal.status !== "confirmed" || !deal.contract_address) return false;

  const state = await getDealStateOnChain(Address.parse(deal.contract_address));
  if (state && state.state === ContractState.FUNDED) {
    await markDealFunded(dealId);
    return true;
  }
  return false;
}

// --- Timeout checker ---

export async function checkTimeouts(): Promise<Deal[]> {
  const deals = await getActiveDeals();
  const expired: Deal[] = [];

  for (const deal of deals) {
    if (deal.status !== "delivered" || !deal.timeout_at || !deal.contract_address) continue;

    const timeoutAt = new Date(deal.timeout_at).getTime();
    if (Date.now() >= timeoutAt) {
      try {
        await triggerTimeoutOnChain(Address.parse(deal.contract_address));
        await updateDealStatus(deal.id, "completed");
        expired.push((await getDealById(deal.id))!);
      } catch {
        // Contract timeout might not be reached yet on-chain
      }
    }
  }

  return expired;
}

// --- Rate re-quote ---

export async function requoteExpiredRates(): Promise<Deal[]> {
  const deals = await getActiveDeals();
  const requoted: Deal[] = [];
  const now = Math.floor(Date.now() / 1000);

  for (const deal of deals) {
    if (deal.status !== "created" && deal.status !== "confirmed") continue;
    if (!deal.original_currency || !deal.rate_expires_at) continue;
    if (now < deal.rate_expires_at) continue;

    const result = await convertToTon(deal.original_amount!, deal.original_currency as Currency);
    if (result) {
      const newExpiry = now + RATE_LOCK_SECONDS;
      await updateDealRate(deal.id, result.tonAmount, result.rate, newExpiry);
      requoted.push((await getDealById(deal.id))!);
    }
  }

  return requoted;
}

// --- Helpers ---

export function getDepositPayloadBase64(): string {
  return buildDepositPayload().toBoc().toString("base64");
}

export { getDealById, getDealsByUser, getActiveDeals };
