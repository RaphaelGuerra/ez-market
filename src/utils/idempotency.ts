import { prisma } from "../db/prisma.js";
import { stableHash } from "./hash.js";

type CachedResponse = {
  statusCode: number;
  response: unknown;
};

export async function loadIdempotentResponse(input: {
  key?: string;
  endpoint: string;
}): Promise<CachedResponse | null> {
  if (!input.key) {
    return null;
  }

  const entry = await prisma.idempotencyKey.findUnique({
    where: {
      key_endpoint: {
        key: input.key,
        endpoint: input.endpoint
      }
    }
  });

  if (!entry) {
    return null;
  }

  return {
    statusCode: entry.statusCode,
    response: entry.response
  };
}

export async function storeIdempotentResponse(input: {
  key?: string;
  endpoint: string;
  userId?: string;
  request: unknown;
  response: unknown;
  statusCode: number;
}) {
  if (!input.key) {
    return;
  }

  await prisma.idempotencyKey.upsert({
    where: {
      key_endpoint: {
        key: input.key,
        endpoint: input.endpoint
      }
    },
    update: {
      response: input.response,
      statusCode: input.statusCode,
      requestHash: stableHash(input.request)
    },
    create: {
      key: input.key,
      endpoint: input.endpoint,
      userId: input.userId,
      requestHash: stableHash(input.request),
      response: input.response,
      statusCode: input.statusCode
    }
  });
}
