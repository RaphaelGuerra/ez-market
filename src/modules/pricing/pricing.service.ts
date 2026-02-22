import { prisma } from "../../db/prisma.js";
import { allConnectors } from "../../connectors/registry.js";
import { env } from "../../config/env.js";
import { haversineDistanceKm } from "../../utils/geo.js";
import { getOrCreateActiveCart } from "../cart/cart.service.js";
import { writeAuditLog } from "../../utils/audit.js";

export type PriceQuoteContext = {
  cartId: string;
  zip: string;
  city: string;
  freshnessTs: string;
  offers: Array<{
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
    fetchedAt: string;
    expiresAt: string;
    deliveryWindow: string;
  }>;
};

export async function buildPriceQuote(userId: string, cartId?: string): Promise<PriceQuoteContext> {
  const cart = cartId
    ? await prisma.cart.findFirst({
        where: { id: cartId, userId },
        include: { items: { include: { catalogItem: true } } }
      })
    : await getOrCreateActiveCart(userId);

  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }

  const address = await prisma.userAddress.findFirst({
    where: { userId, isDefault: true },
    orderBy: { createdAt: "desc" }
  });

  if (!address) {
    throw new Error("Default address is required before pricing");
  }

  const distance = haversineDistanceKm(
    { lat: Number(address.latitude), lon: Number(address.longitude) },
    { lat: env.CITY_LAT, lon: env.CITY_LON }
  );

  if (distance > env.CITY_RADIUS_KM || address.city.toLowerCase() !== env.CITY_NAME.toLowerCase()) {
    throw new Error(`Address is outside supported city (${env.CITY_NAME})`);
  }

  const policies = await prisma.connectorPolicy.findMany({
    where: { enabled: true, killSwitchEnabled: false }
  });

  const enabledMarkets = new Set(policies.map((policy) => policy.market));
  const connectors = allConnectors().filter((connector) => enabledMarkets.has(connector.market));

  if (connectors.length === 0) {
    throw new Error("No active market connectors available");
  }

  const quotePayload = {
    zip: address.zip,
    city: address.city,
    items: cart.items.map((item) => ({
      catalogItemId: item.catalogItemId,
      name: item.catalogItem.name,
      quantity: item.quantity
    }))
  };

  const results = await Promise.all(connectors.map((connector) => connector.getQuotes(quotePayload)));
  const freshnessTs = new Date().toISOString();

  const offers: PriceQuoteContext["offers"] = [];

  for (const quote of results) {
    for (const quoteItem of quote.items) {
      const cartItem = cart.items.find((item) => item.catalogItemId === quoteItem.catalogItemId);
      if (!cartItem) {
        continue;
      }

      const marketSku = await prisma.marketSku.upsert({
        where: {
          market_externalSkuId: {
            market: quote.market,
            externalSkuId: quoteItem.externalSkuId
          }
        },
        create: {
          market: quote.market,
          externalSkuId: quoteItem.externalSkuId,
          catalogItemId: quoteItem.catalogItemId,
          name: cartItem.catalogItem.name,
          brand: cartItem.catalogItem.brand,
          unit: cartItem.catalogItem.unit
        },
        update: {
          catalogItemId: quoteItem.catalogItemId,
          name: cartItem.catalogItem.name,
          brand: cartItem.catalogItem.brand,
          unit: cartItem.catalogItem.unit
        }
      });

      await prisma.offerSnapshot.create({
        data: {
          marketSkuId: marketSku.id,
          market: quote.market,
          zip: address.zip,
          priceCents: quoteItem.unitPriceCents,
          deliveryFeeCents: quoteItem.deliveryFeeCents,
          serviceFeeCents: quoteItem.serviceFeeCents,
          taxEstimateCents: quoteItem.taxEstimateCents,
          inStock: quoteItem.inStock,
          confidence: quoteItem.confidence,
          expiresAt: new Date(quote.expiresAt)
        }
      });

      offers.push({
        market: quote.market,
        catalogItemId: quoteItem.catalogItemId,
        externalSkuId: quoteItem.externalSkuId,
        unitPriceCents: quoteItem.unitPriceCents,
        deliveryFeeCents: quoteItem.deliveryFeeCents,
        serviceFeeCents: quoteItem.serviceFeeCents,
        taxEstimateCents: quoteItem.taxEstimateCents,
        quantity: cartItem.quantity,
        inStock: quoteItem.inStock,
        confidence: quoteItem.confidence,
        fetchedAt: quote.fetchedAt,
        expiresAt: quote.expiresAt,
        deliveryWindow: quoteItem.deliveryWindow
      });
    }
  }

  await writeAuditLog({
    userId,
    action: "PRICING_QUOTE_GENERATED",
    entity: "Cart",
    entityId: cart.id,
    metadata: {
      markets: Array.from(enabledMarkets),
      offers: offers.length
    }
  });

  return {
    cartId: cart.id,
    zip: address.zip,
    city: address.city,
    freshnessTs,
    offers
  };
}
