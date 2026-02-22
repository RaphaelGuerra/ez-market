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

export class MockScrapeConnector implements MarketConnector {
  market = "market_scrape";
  mode = "SCRAPE" as const;

  async getQuotes(input: ConnectorQuoteInput): Promise<ConnectorQuoteResult> {
    const now = new Date();
    return {
      market: this.market,
      fetchedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 4 * 60 * 1000).toISOString(),
      items: input.items.map((item) => {
        const unitPriceCents = hashNumber(`${item.catalogItemId}-scrape`, 149, 1399);
        return {
          catalogItemId: item.catalogItemId,
          externalSkuId: `scrape-${item.catalogItemId}`,
          unitPriceCents,
          deliveryFeeCents: 599,
          serviceFeeCents: 149,
          taxEstimateCents: Math.round(unitPriceCents * item.quantity * 0.075),
          inStock: hashNumber(`${item.catalogItemId}-stock-scrape`, 0, 10) > 2,
          confidence: 0.83,
          deliveryWindow: "Today 7pm-9pm"
        };
      })
    };
  }

  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    const failureSeed = hashNumber(JSON.stringify(input.deliveryAddress), 1, 100);
    if (failureSeed < 14) {
      return {
        success: false,
        errorCode: "REAUTH_REQUIRED",
        errorMessage: "Scraped session expired"
      };
    }

    return {
      success: true,
      externalOrderId: `scrape-order-${Date.now()}`
    };
  }
}
