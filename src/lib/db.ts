import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Vercel's Prisma Postgres integration may set DATABASE_URL to an Accelerate
// (prisma+postgres://) URL; connect directly through POSTGRES_URL instead.
const url = process.env.DATABASE_URL?.startsWith("prisma+") && process.env.POSTGRES_URL ? process.env.POSTGRES_URL : undefined;

export const db = globalForPrisma.prisma ?? new PrismaClient(url ? { datasourceUrl: url } : undefined);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;
