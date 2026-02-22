import { describe, expect, it } from "vitest";
import { computeOptimizedPlan } from "../src/modules/optimizer/optimizer.service.js";

describe("computeOptimizedPlan", () => {
  it("minimizes total and returns split legs", () => {
    const offers = [
      {
        market: "market_api",
        catalogItemId: "milk",
        externalSkuId: "api-milk",
        unitPriceCents: 400,
        deliveryFeeCents: 500,
        serviceFeeCents: 100,
        taxEstimateCents: 32,
        quantity: 1,
        inStock: true,
        confidence: 0.9,
        deliveryWindow: "Today"
      },
      {
        market: "market_scrape",
        catalogItemId: "milk",
        externalSkuId: "scrape-milk",
        unitPriceCents: 350,
        deliveryFeeCents: 550,
        serviceFeeCents: 120,
        taxEstimateCents: 28,
        quantity: 1,
        inStock: true,
        confidence: 0.82,
        deliveryWindow: "Today"
      },
      {
        market: "market_api",
        catalogItemId: "eggs",
        externalSkuId: "api-eggs",
        unitPriceCents: 300,
        deliveryFeeCents: 500,
        serviceFeeCents: 100,
        taxEstimateCents: 24,
        quantity: 1,
        inStock: true,
        confidence: 0.92,
        deliveryWindow: "Today"
      },
      {
        market: "market_scrape",
        catalogItemId: "eggs",
        externalSkuId: "scrape-eggs",
        unitPriceCents: 280,
        deliveryFeeCents: 550,
        serviceFeeCents: 120,
        taxEstimateCents: 22,
        quantity: 1,
        inStock: true,
        confidence: 0.8,
        deliveryWindow: "Today"
      }
    ];

    const plan = computeOptimizedPlan(offers, { maxMarkets: 2 });

    expect(plan.totalCents).toBeGreaterThan(0);
    expect(plan.legs.length).toBeGreaterThan(0);
    expect(plan.projectedSavingsCents).toBeGreaterThanOrEqual(0);
  });

  it("throws when no in-stock offers are available", () => {
    expect(() =>
      computeOptimizedPlan([
        {
          market: "market_api",
          catalogItemId: "milk",
          externalSkuId: "api-milk",
          unitPriceCents: 300,
          deliveryFeeCents: 300,
          serviceFeeCents: 100,
          taxEstimateCents: 30,
          quantity: 1,
          inStock: false,
          confidence: 0.9,
          deliveryWindow: "Tonight"
        }
      ])
    ).toThrow("No in-stock offers found");
  });
});
