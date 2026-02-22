export type ConnectorQuoteInput = {
  zip: string;
  city: string;
  items: Array<{ catalogItemId: string; name: string; quantity: number }>;
};

export type ConnectorQuoteItem = {
  catalogItemId: string;
  externalSkuId: string;
  unitPriceCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  taxEstimateCents: number;
  inStock: boolean;
  confidence: number;
  deliveryWindow: string;
};

export type ConnectorQuoteResult = {
  market: string;
  items: ConnectorQuoteItem[];
  fetchedAt: string;
  expiresAt: string;
};

export type PlaceOrderInput = {
  accountExternalId?: string;
  lineItems: Array<{
    externalSkuId: string;
    quantity: number;
  }>;
  paymentTokenRef: string;
  deliveryAddress: {
    line1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
};

export type PlaceOrderResult = {
  success: boolean;
  externalOrderId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export interface MarketConnector {
  market: string;
  mode: "API" | "SCRAPE";
  getQuotes(input: ConnectorQuoteInput): Promise<ConnectorQuoteResult>;
  placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult>;
}
