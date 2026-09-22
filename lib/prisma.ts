import { PrismaClient } from "@prisma/client";

// Singleton pattern recommandé pour Next.js en environnement serverless.
// IMPORTANT (voir audit sécurité / brief technique) : en production, ajouter
// un pooler de connexions (PgBouncer, Neon pooled connection, ou Prisma
// Accelerate) — sans ça, le nombre de connexions PostgreSQL peut s'épuiser
// sous charge sur une plateforme serverless comme Vercel.

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
