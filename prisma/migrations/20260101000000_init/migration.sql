-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEBIT', 'REFUND');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "failureRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sms_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parts" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'pending',
    "providerId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_attempts" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "messageId" TEXT,
    "amount" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sms_providers_name_key" ON "sms_providers"("name");

-- CreateIndex
CREATE INDEX "sms_messages_userId_createdAt_idx" ON "sms_messages"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "sms_messages_userId_status_idx" ON "sms_messages"("userId", "status");

-- CreateIndex
CREATE INDEX "sms_messages_userId_recipient_idx" ON "sms_messages"("userId", "recipient");

-- CreateIndex
CREATE INDEX "provider_attempts_providerId_attemptedAt_idx" ON "provider_attempts"("providerId", "attemptedAt");

-- CreateIndex
CREATE INDEX "provider_attempts_messageId_idx" ON "provider_attempts"("messageId");

-- CreateIndex
CREATE INDEX "credit_transactions_walletId_createdAt_idx" ON "credit_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "credit_transactions_messageId_type_key" ON "credit_transactions"("messageId", "type");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "sms_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_attempts" ADD CONSTRAINT "provider_attempts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "sms_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_attempts" ADD CONSTRAINT "provider_attempts_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "sms_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Safety net (not expressible in schema.prisma): balances can never go negative.
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_balance_non_negative" CHECK ("balance" >= 0);
ALTER TABLE "sms_providers" ADD CONSTRAINT "sms_providers_balance_non_negative" CHECK ("balance" >= 0);
