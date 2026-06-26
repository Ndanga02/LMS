import { beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@/lib/generated/prisma";

// Prisma 7 uses env DATABASE_URL automatically — no datasources option
const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
export { cleanDatabase, seedTestData } from "./helpers";
