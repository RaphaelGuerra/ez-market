import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { buildPriceQuote } from "./pricing.service.js";

const quoteSchema = z.object({
  cartId: z.string().optional()
});

export const pricingRoutes: FastifyPluginAsync = async (app) => {
  app.post("/quote", { preHandler: app.authenticate }, async (request, reply) => {
    const body = quoteSchema.parse(request.body ?? {});

    try {
      const quote = await buildPriceQuote(request.user.userId, body.cartId);
      return {
        cartId: quote.cartId,
        city: quote.city,
        zip: quote.zip,
        freshnessTs: quote.freshnessTs,
        offers: quote.offers
      };
    } catch (error) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : "Quote generation failed"
      });
    }
  });
};
