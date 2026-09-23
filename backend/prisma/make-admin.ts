import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/auth.js";

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "Admin@gmail.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "Admin@123";
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", passwordHash: hashPassword(password) },
    create: { email, passwordHash: hashPassword(password), role: "ADMIN" },
  });

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: { status: "ACTIVE", planType: "MONTHLY", renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    create: { userId: user.id, status: "ACTIVE", planType: "MONTHLY", renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  });

  console.log(`Admin access enabled for ${email}`);
  console.log("Role: ADMIN | Subscription: ACTIVE");
}

main().catch((error) => {
  console.error("Could not enable admin access", error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
