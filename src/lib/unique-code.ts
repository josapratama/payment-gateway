import { prisma } from "./prisma";

/**
 * Generate a unique 3-digit code (100 - 999) that doesn't collide with
 * any active PENDING transaction of the same base amount.
 */
export async function generateUniqueCode(baseAmount: number): Promise<{
  uniqueCode: number;
  totalAmount: number;
}> {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

  // Fetch pending transactions with roughly matching base amount (+- 1000)
  const existingPending = await prisma.transaction.findMany({
    where: {
      status: "PENDING",
      amount: baseAmount,
      createdAt: { gte: threeHoursAgo },
    },
    select: { uniqueCode: true },
  });

  const usedCodes = new Set(existingPending.map((p) => p.uniqueCode));

  // Find a free code between 101 and 999
  let code = 0;
  for (let i = 0; i < 50; i++) {
    const candidate = Math.floor(Math.random() * 899) + 101; // 101 - 999
    if (!usedCodes.has(candidate)) {
      code = candidate;
      break;
    }
  }

  // Fallback sequential if all random failed
  if (code === 0) {
    for (let c = 101; c <= 999; c++) {
      if (!usedCodes.has(c)) {
        code = c;
        break;
      }
    }
  }

  return {
    uniqueCode: code,
    totalAmount: baseAmount + code,
  };
}

