import { PrismaClient } from "@prisma/client";

// Reuse one PrismaClient during development (Next.js hot reload creates new modules).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
