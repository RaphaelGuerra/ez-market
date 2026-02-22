import { env } from "../../config/env.js";
import { OptimizationResult } from "../../types/domain.js";

type ItemOffer = {
  market: string;
  catalogItemId: string;
  externalSkuId: string;
  unitPriceCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  taxEstimateCents: number;
  quantity: number;
  inStock: boolean;
  confidence: number;
  deliveryWindow: string;
};

function groupedByItem(offers: ItemOffer[]): Map<string, ItemOffer[]> {
  const map = new Map<string, ItemOffer[]>();
  for (const offer of offers) {
    const list = map.get(offer.catalogItemId) ?? [];
    list.push(offer);
    map.set(offer.catalogItemId, list);
  }
  return map;
}

export function computeOptimizedPlan(
  offers: ItemOffer[],
  options?: { maxMarkets?: number }
): OptimizationResult {
  const maxMarkets = options?.maxMarkets ?? env.MAX_MARKETS_PER_ORDER;
  const byItem = groupedByItem(offers.filter((offer) => offer.inStock));

  if (byItem.size === 0) {
    throw new Error("No in-stock offers found");
  }

  const chosenPerItem: ItemOffer[] = [];

  for (const itemOffers of byItem.values()) {
    const cheapest = [...itemOffers].sort((a, b) => {
      const aTotal = a.unitPriceCents * a.quantity + a.taxEstimateCents;
      const bTotal = b.unitPriceCents * b.quantity + b.taxEstimateCents;
      return aTotal - bTotal;
    })[0];
    chosenPerItem.push(cheapest);
  }

  const itemCountByMarket = new Map<string, number>();
  for (const offer of chosenPerItem) {
    itemCountByMarket.set(offer.market, (itemCountByMarket.get(offer.market) ?? 0) + 1);
  }

  const selectedMarkets = [...itemCountByMarket.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxMarkets)
    .map(([market]) => market);

  const selectedSet = new Set(selectedMarkets);

  const reassigned = chosenPerItem.map((offer) => {
    if (selectedSet.has(offer.market)) {
      return offer;
    }

    const alternatives = (byItem.get(offer.catalogItemId) ?? []).filter((candidate) =>
      selectedSet.has(candidate.market)
    );

    if (alternatives.length === 0) {
      return offer;
    }

    return [...alternatives].sort(
      (a, b) => a.unitPriceCents * a.quantity - b.unitPriceCents * b.quantity
    )[0];
  });

  const legsMap = new Map<string, OptimizationResult["legs"][number]>();

  for (const offer of reassigned) {
    const key = offer.market;
    const subtotal = offer.unitPriceCents * offer.quantity;
    const fee = offer.deliveryFeeCents + offer.serviceFeeCents;

    if (!legsMap.has(key)) {
      legsMap.set(key, {
        market: key,
        itemSubtotalCents: 0,
        feeCents: fee,
        taxCents: 0,
        totalCents: 0,
        deliveryWindow: offer.deliveryWindow,
        reliabilityScore: offer.confidence,
        lineItems: []
      });
    }

    const leg = legsMap.get(key)!;
    leg.itemSubtotalCents += subtotal;
    leg.taxCents += offer.taxEstimateCents;
    leg.reliabilityScore = Number(((leg.reliabilityScore + offer.confidence) / 2).toFixed(3));
    leg.lineItems.push({
      catalogItemId: offer.catalogItemId,
      quantity: offer.quantity,
      unitPriceCents: offer.unitPriceCents,
      subtotalCents: subtotal,
      externalSkuId: offer.externalSkuId
    });
  }

  const legs = [...legsMap.values()].map((leg) => ({
    ...leg,
    totalCents: leg.itemSubtotalCents + leg.feeCents + leg.taxCents
  }));

  legs.sort((a, b) => a.totalCents - b.totalCents);

  const subtotalCents = legs.reduce((acc, leg) => acc + leg.itemSubtotalCents, 0);
  const feeCents = legs.reduce((acc, leg) => acc + leg.feeCents, 0);
  const taxCents = legs.reduce((acc, leg) => acc + leg.taxCents, 0);
  const totalCents = subtotalCents + feeCents + taxCents;

  const marketTotals = new Map<string, number>();
  for (const offer of offers.filter((offer) => offer.inStock)) {
    const total = offer.unitPriceCents * offer.quantity + offer.deliveryFeeCents + offer.serviceFeeCents + offer.taxEstimateCents;
    marketTotals.set(offer.market, (marketTotals.get(offer.market) ?? 0) + total);
  }

  const baseline = [...marketTotals.values()].sort((a, b) => a - b)[0] ?? totalCents;
  const projectedSavingsCents = Math.max(0, baseline - totalCents);

  return {
    subtotalCents,
    feeCents,
    taxCents,
    totalCents,
    projectedSavingsCents,
    legs
  };
}
