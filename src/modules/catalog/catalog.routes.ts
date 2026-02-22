import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";

const searchQuerySchema = z.object({
  q: z.string().default(""),
  city: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(25)
});

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  app.get("/search", { preHandler: app.authenticate }, async (request, reply) => {
    const query = searchQuerySchema.parse(request.query);

    if (query.city && query.city.toLowerCase() !== env.CITY_NAME.toLowerCase()) {
      return reply.code(400).send({ message: `MVP supports only ${env.CITY_NAME}` });
    }

    const items = await prisma.catalogItem.findMany({
      where: {
        active: true,
        OR: [
          { normalizedName: { contains: query.q.toLowerCase() } },
          { name: { contains: query.q, mode: "insensitive" } },
          { category: { contains: query.q, mode: "insensitive" } }
        ]
      },
      take: query.limit,
      orderBy: [{ category: "asc" }, { name: "asc" }]
    });

    return {
      city: env.CITY_NAME,
      count: items.length,
      items
    };
  });
};
