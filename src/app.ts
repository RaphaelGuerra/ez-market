import Fastify from "fastify";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";
import authPlugin from "./plugins/auth.js";
import { logger } from "./utils/logger.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { marketsRoutes } from "./modules/markets/markets.routes.js";
import { catalogRoutes } from "./modules/catalog/catalog.routes.js";
import { cartRoutes } from "./modules/cart/cart.routes.js";
import { pricingRoutes } from "./modules/pricing/pricing.routes.js";
import { optimizerRoutes } from "./modules/optimizer/optimizer.routes.js";
import { checkoutRoutes } from "./modules/checkout/checkout.routes.js";
import { ordersRoutes } from "./modules/orders/orders.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";

export async function buildApp() {
  const app = Fastify({ logger });

  await app.register(cors, { origin: true });
  await app.register(sensible);
  await app.register(authPlugin);
  await app.register(fastifyStatic, {
    root: join(process.cwd(), "web"),
    prefix: "/app/"
  });

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/app", async (_request, reply) => {
    return reply.redirect("/app/");
  });

  await app.register(authRoutes, { prefix: "/v1/auth" });
  await app.register(usersRoutes, { prefix: "/v1/users" });
  await app.register(marketsRoutes, { prefix: "/v1/markets" });
  await app.register(catalogRoutes, { prefix: "/v1/catalog" });
  await app.register(cartRoutes, { prefix: "/v1/cart" });
  await app.register(pricingRoutes, { prefix: "/v1/pricing" });
  await app.register(optimizerRoutes, { prefix: "/v1/optimizer" });
  await app.register(checkoutRoutes, { prefix: "/v1/checkout" });
  await app.register(ordersRoutes, { prefix: "/v1/orders" });
  await app.register(adminRoutes, { prefix: "/v1/admin" });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    if ((error as any).name === "ZodError") {
      return reply.code(400).send({ message: "Validation error", details: (error as any).issues });
    }

    return reply.code(500).send({ message: "Internal server error" });
  });

  return app;
}
