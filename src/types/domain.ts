export type OfferQuote = {
  market: string;
  catalogItemId: string;
  quantity: number;
  unitPriceCents: number;
  itemSubtotalCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  taxEstimateCents: number;
  inStock: boolean;
  confidence: number;
  externalSkuId: string;
  fetchedAt: string;
  expiresAt: string;
};

export type PlanLineItem = {
  catalogItemId: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  externalSkuId: string;
};

export type PlanLegResult = {
  market: string;
  itemSubtotalCents: number;
  feeCents: number;
  taxCents: number;
  totalCents: number;
  deliveryWindow: string;
  reliabilityScore: number;
  lineItems: PlanLineItem[];
};

export type OptimizationResult = {
  subtotalCents: number;
  feeCents: number;
  taxCents: number;
  totalCents: number;
  projectedSavingsCents: number;
  legs: PlanLegResult[];
};
