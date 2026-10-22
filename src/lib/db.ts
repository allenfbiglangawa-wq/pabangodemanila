import { PrismaClient } from "@prisma/client";

/**
 * On Cloudflare Workers (PRISMA_ADAPTER=pg) Prisma talks to Postgres through the
 * `pg` driver adapter, and each request gets its own client: Workers do not let
 * one request reuse another request's network connection. Elsewhere there is one
 * shared client.
 */
function createClient(): PrismaClient {
  if (process.env.PRISMA_ADAPTER === "pg") {
    // Loaded lazily so local development never needs the adapter.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg");
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl() }) });
  }
  const url = databaseUrl();
  return new PrismaClient(url !== process.env.DATABASE_URL ? { datasourceUrl: url } : undefined);
}

/** Vercel/Prisma Postgres may set only POSTGRES_URL, or an Accelerate URL in DATABASE_URL. */
function databaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  return (!dbUrl || dbUrl.startsWith("prisma+")) && process.env.POSTGRES_URL ? process.env.POSTGRES_URL : dbUrl;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const perRequest = new WeakMap<object, PrismaClient>();

function requestScope(): object | undefined {
  if (process.env.PRISMA_ADAPTER !== "pg") return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare") as typeof import("@opennextjs/cloudflare");
    return getCloudflareContext().ctx;
  } catch {
    return undefined; // build scripts and seeding run outside a request
  }
}

function current(): PrismaClient {
  const scope = requestScope();
  if (!scope) return (globalForPrisma.prisma ??= createClient());
  let client = perRequest.get(scope);
  if (!client) perRequest.set(scope, (client = createClient()));
  return client;
}

export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const client = current();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { createClient };

export type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;
