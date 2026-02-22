import fastifyJwt from "@fastify/jwt";
import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { env } from "../config/env.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string; email: string };
    user: { userId: string; email: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}

async function authPlugin(app: FastifyInstance) {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: "7d"
    }
  });

  app.decorate("authenticate", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ message: "Unauthorized" });
    }
  });
}

export default fp(authPlugin);
