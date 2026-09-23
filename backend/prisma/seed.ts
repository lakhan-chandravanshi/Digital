import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/auth.js";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@digitalheroes.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-this-password";
  const passwordHash = hashPassword(adminPassword);
  await prisma.user.upsert({ 
    where: { email: adminEmail }, 
    update: { role: "ADMIN" }, 
    create: { email: adminEmail, passwordHash, role: "ADMIN" } 
  });
  for (const charity of [
    { title: "The Good Growth Fund", description: "Backing local projects that help people and communities flourish.", spotlightFlag: true },
    { title: "Open Water Alliance", description: "Protecting clean water access and restoring the places we all share.", spotlightFlag: true },
    { title: "Bright Futures", description: "Helping young people find confidence, opportunity, and a fair start.", spotlightFlag: false },
  ]) await prisma.charity.upsert({ where: { title: charity.title }, update: charity, create: charity });
}

main().finally(() => prisma.$disconnect());
