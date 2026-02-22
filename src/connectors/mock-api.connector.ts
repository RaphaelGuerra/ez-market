import { MarketConnector, ConnectorQuoteInput, ConnectorQuoteResult, PlaceOrderInput, PlaceOrderResult } from "./types.js";

function hashNumber(input: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const spread = max - min + 1;
  return min + (Math.abs(hash) % spread);
}

export class MockApiConnector implements MarketConnector {
  market = "market_api";
  mode = "API" as const;

  async getQuotes(input: ConnectorQuoteInput): Promise<ConnectorQuoteResult> {
    const now = new Date();
    return {
      market: this.market,
      fetchedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
      items: input.items.map((item) => {
        const unitPriceCents = hashNumber(`${item.catalogItemId}-api`, 199, 1299);
        return {
          catalogItemId: item.catalogItemId,
          externalSkuId: `api-${item.catalogItemId}`,
          unitPriceCents,
          deliveryFeeCents: 499,
          serviceFeeCents: 199,
          taxEstimateCents: Math.round(unitPriceCents * item.quantity * 0.08),
          inStock: hashNumber(`${item.catalogItemId}-stock-api`, 0, 10) > 1,
          confidence: 0.92,
          deliveryWindow: "Today 6pm-8pm"
        };
      })
    };
  }

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    const failureSeed = hashNumber(JSON.stringify(input.lineItems), 1, 100);
    if (failureSeed < 9) {
      return {
        success: false,
        errorCode: "TEMPORARY_DOWNSTREAM_ERROR",
        errorMessage: "Market API timeout"
      };
    }

    return {
      success: true,
      externalOrderId: `api-order-${Date.now()}`
    };
  }
}
