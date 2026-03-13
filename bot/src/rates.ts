// TON price fetching via tonapi.io with 60-second in-memory cache

export type FiatCurrency = "USD" | "EUR" | "RUB";
export type Currency = FiatCurrency | "TON";

interface CachedRates {
  prices: Record<FiatCurrency, number>; // TON price in each fiat currency
  fetchedAt: number;
}

const CACHE_TTL_MS = 60_000;
const TONAPI_URL = "https://tonapi.io/v2/rates?tokens=ton&currencies=usd,eur,rub";

let cache: CachedRates | null = null;

export async function fetchTonPrice(): Promise<Record<FiatCurrency, number> | null> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.prices;
  }

  try {
    const res = await fetch(TONAPI_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return cache?.prices ?? null;

    const data = await res.json();
    const tonRates = data?.rates?.TON?.prices;
    if (!tonRates) return cache?.prices ?? null;

    const prices: Record<FiatCurrency, number> = {
      USD: tonRates.USD,
      EUR: tonRates.EUR,
      RUB: tonRates.RUB,
    };

    cache = { prices, fetchedAt: Date.now() };
    return prices;
  } catch (e) {
    console.warn("Failed to fetch TON price:", e);
    return cache?.prices ?? null;
  }
}

export async function convertToTon(amount: number, currency: Currency): Promise<{ tonAmount: number; rate: number } | null> {
  if (currency === "TON") {
    return { tonAmount: amount, rate: 1 };
  }

  const prices = await fetchTonPrice();
  if (!prices || !prices[currency]) return null;

  const rate = prices[currency]; // e.g. TON = $2.50
  const tonAmount = amount / rate;

  return { tonAmount: Math.round(tonAmount * 100) / 100, rate };
}
