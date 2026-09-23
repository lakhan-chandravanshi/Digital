CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "Role" AS ENUM ('SUBSCRIBER', 'ADMIN');
CREATE TYPE "PlanType" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELED', 'PAST_DUE');
CREATE TYPE "DrawStatus" AS ENUM ('SIMULATED', 'PUBLISHED');
CREATE TYPE "DrawLogic" AS ENUM ('RANDOM', 'WEIGHTED');
CREATE TYPE "MatchType" AS ENUM ('FIVE_MATCH', 'FOUR_MATCH', 'THREE_MATCH');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID');

CREATE TABLE "User" ("id" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "role" "Role" NOT NULL DEFAULT 'SUBSCRIBER', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Subscription" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "stripeCustomerId" TEXT, "stripeSubscriptionId" TEXT, "status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE', "planType" "PlanType" NOT NULL, "renewalDate" TIMESTAMP(3), CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Score" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "scoreValue" INTEGER NOT NULL, "scoreDate" DATE NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Score_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Charity" ("id" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "imageUrl" TEXT, "spotlightFlag" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Charity_pkey" PRIMARY KEY ("id"));
CREATE TABLE "CharityEvent" ("id" TEXT NOT NULL, "charityId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "eventDate" TIMESTAMP(3) NOT NULL, "location" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CharityEvent_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Donation" ("id" TEXT NOT NULL, "userId" TEXT, "charityId" TEXT NOT NULL, "amount" DECIMAL(12,2) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Donation_pkey" PRIMARY KEY ("id"));
CREATE TABLE "UserCharitySetting" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "charityId" TEXT NOT NULL, "contributionPercentage" DECIMAL(5,2) NOT NULL, CONSTRAINT "UserCharitySetting_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Draw" ("id" TEXT NOT NULL, "drawDate" TIMESTAMP(3) NOT NULL, "status" "DrawStatus" NOT NULL, "drawLogic" "DrawLogic" NOT NULL, "winningNumbers" INTEGER[], "totalPoolAmount" DECIMAL(12,2) NOT NULL, "rolloverAmount" DECIMAL(12,2) NOT NULL DEFAULT 0, CONSTRAINT "Draw_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Winner" ("id" TEXT NOT NULL, "drawId" TEXT NOT NULL, "userId" TEXT NOT NULL, "matchType" "MatchType" NOT NULL, "prizeAmount" DECIMAL(12,2) NOT NULL, "proofImageUrl" TEXT, "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING', "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'PENDING', CONSTRAINT "Winner_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
CREATE INDEX "Score_userId_scoreDate_idx" ON "Score"("userId", "scoreDate");
CREATE UNIQUE INDEX "Score_userId_scoreDate_key" ON "Score"("userId", "scoreDate");
CREATE INDEX "CharityEvent_charityId_eventDate_idx" ON "CharityEvent"("charityId", "eventDate");
CREATE INDEX "Donation_charityId_createdAt_idx" ON "Donation"("charityId", "createdAt");
CREATE UNIQUE INDEX "UserCharitySetting_userId_key" ON "UserCharitySetting"("userId");
CREATE INDEX "Winner_verificationStatus_payoutStatus_idx" ON "Winner"("verificationStatus", "payoutStatus");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Score" ADD CONSTRAINT "Score_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CharityEvent" ADD CONSTRAINT "CharityEvent_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCharitySetting" ADD CONSTRAINT "UserCharitySetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCharitySetting" ADD CONSTRAINT "UserCharitySetting_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Winner" ADD CONSTRAINT "Winner_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "Draw"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Winner" ADD CONSTRAINT "Winner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
