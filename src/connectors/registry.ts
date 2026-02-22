import { MockApiConnector } from "./mock-api.connector.js";
import { MockScrapeConnector } from "./mock-scrape.connector.js";
import { MarketConnector } from "./types.js";

const connectors: MarketConnector[] = [new MockApiConnector(), new MockScrapeConnector()];

export function allConnectors(): MarketConnector[] {
  return connectors;
}

export function connectorForMarket(market: string): MarketConnector | undefined {
  return connectors.find((c) => c.market === market);
}
