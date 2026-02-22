-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."MarketAccountStatus" AS ENUM ('ACTIVE', 'REAUTH_REQUIRED', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'PROCESSING', 'PARTIAL_FAILED', 'COMPLETED', 'CANCELED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."OrderLegStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT,
    "maxPriceDeltaPct" DECIMAL(65,30) NOT NULL DEFAULT 5,
    "approvalSpendCapCents" INTEGER DEFAULT 50000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DECIMAL(65,30) NOT NULL,
    "longitude" DECIMAL(65,30) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarketAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "externalAccountId" TEXT,
    "encryptedCredential" TEXT NOT NULL,
    "encryptedSession" TEXT,
    "status" "public"."MarketAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastRefreshedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentMethodRef" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "tokenRef" TEXT NOT NULL,
    "last4" TEXT,
    "brand" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CatalogItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarketSku" (
    "id" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "externalSkuId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "unit" TEXT NOT NULL,
    "packageSize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketSku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductMapping" (
    "id" TEXT NOT NULL,
    "marketSkuId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "confidence" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OfferSnapshot" (
    "id" TEXT NOT NULL,
    "marketSkuId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "deliveryFeeCents" INTEGER NOT NULL,
    "serviceFeeCents" INTEGER NOT NULL,
    "taxEstimateCents" INTEGER NOT NULL,
    "inStock" BOOLEAN NOT NULL,
    "confidence" DECIMAL(65,30) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubstitutionRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "allowSubstitution" BOOLEAN NOT NULL DEFAULT true,
    "maxPriceIncreasePct" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "preferredBrands" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubstitutionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OptimizationPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "quoteHash" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "projectedSavingsCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptimizationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlanLeg" (
    "id" TEXT NOT NULL,
    "optimizationPlanId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "marketAccountId" TEXT,
    "itemSubtotalCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "lineItems" JSONB NOT NULL,
    "deliveryWindow" TEXT,
    "reliabilityScore" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApprovalBundle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optimizationPlanId" TEXT NOT NULL,
    "quoteHash" TEXT NOT NULL,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approvalBundleId" TEXT NOT NULL,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "totalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderLeg" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "marketAccountId" TEXT NOT NULL,
    "status" "public"."OrderLegStatus" NOT NULL DEFAULT 'PENDING',
    "totalCents" INTEGER NOT NULL,
    "externalOrderId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConnectorPolicy" (
    "id" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "mode" TEXT NOT NULL DEFAULT 'HYBRID',
    "robotsCompliant" BOOLEAN NOT NULL DEFAULT true,
    "tosCompliant" BOOLEAN NOT NULL DEFAULT true,
    "throttleRpm" INTEGER NOT NULL DEFAULT 30,
    "killSwitchEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectorPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConnectorHealth" (
    "id" TEXT NOT NULL,
    "connectorPolicyId" TEXT NOT NULL,
    "successRate" DECIMAL(65,30) NOT NULL,
    "latencyMsP95" INTEGER NOT NULL,
    "errorRate" DECIMAL(65,30) NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectorHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "userId" TEXT,
    "requestHash" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "UserAddress_userId_idx" ON "public"."UserAddress"("userId");

-- CreateIndex
CREATE INDEX "MarketAccount_userId_idx" ON "public"."MarketAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketAccount_userId_market_key" ON "public"."MarketAccount"("userId", "market");

-- CreateIndex
CREATE INDEX "PaymentMethodRef_userId_idx" ON "public"."PaymentMethodRef"("userId");

-- CreateIndex
CREATE INDEX "CatalogItem_normalizedName_idx" ON "public"."CatalogItem"("normalizedName");

-- CreateIndex
CREATE INDEX "MarketSku_market_name_idx" ON "public"."MarketSku"("market", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MarketSku_market_externalSkuId_key" ON "public"."MarketSku"("market", "externalSkuId");

-- CreateIndex
CREATE INDEX "ProductMapping_catalogItemId_idx" ON "public"."ProductMapping"("catalogItemId");

-- CreateIndex
CREATE INDEX "OfferSnapshot_market_zip_fetchedAt_idx" ON "public"."OfferSnapshot"("market", "zip", "fetchedAt");

-- CreateIndex
CREATE INDEX "Cart_userId_status_idx" ON "public"."Cart"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_catalogItemId_key" ON "public"."CartItem"("cartId", "catalogItemId");

-- CreateIndex
CREATE INDEX "SubstitutionRule_userId_catalogItemId_idx" ON "public"."SubstitutionRule"("userId", "catalogItemId");

-- CreateIndex
CREATE INDEX "OptimizationPlan_userId_cartId_createdAt_idx" ON "public"."OptimizationPlan"("userId", "cartId", "createdAt");

-- CreateIndex
CREATE INDEX "PlanLeg_optimizationPlanId_market_idx" ON "public"."PlanLeg"("optimizationPlanId", "market");

-- CreateIndex
CREATE INDEX "ApprovalBundle_userId_status_expiresAt_idx" ON "public"."ApprovalBundle"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "Order_userId_status_createdAt_idx" ON "public"."Order"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderLeg_orderId_status_idx" ON "public"."OrderLeg"("orderId", "status");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "public"."OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectorPolicy_market_key" ON "public"."ConnectorPolicy"("market");

-- CreateIndex
CREATE INDEX "ConnectorPolicy_enabled_killSwitchEnabled_idx" ON "public"."ConnectorPolicy"("enabled", "killSwitchEnabled");

-- CreateIndex
CREATE INDEX "ConnectorHealth_connectorPolicyId_checkedAt_idx" ON "public"."ConnectorHealth"("connectorPolicyId", "checkedAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_entity_createdAt_idx" ON "public"."AuditLog"("action", "entity", "createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyKey_userId_createdAt_idx" ON "public"."IdempotencyKey"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_endpoint_key" ON "public"."IdempotencyKey"("key", "endpoint");

-- AddForeignKey
ALTER TABLE "public"."UserAddress" ADD CONSTRAINT "UserAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketAccount" ADD CONSTRAINT "MarketAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentMethodRef" ADD CONSTRAINT "PaymentMethodRef_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketSku" ADD CONSTRAINT "MarketSku_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "public"."CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductMapping" ADD CONSTRAINT "ProductMapping_marketSkuId_fkey" FOREIGN KEY ("marketSkuId") REFERENCES "public"."MarketSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductMapping" ADD CONSTRAINT "ProductMapping_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "public"."CatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OfferSnapshot" ADD CONSTRAINT "OfferSnapshot_marketSkuId_fkey" FOREIGN KEY ("marketSkuId") REFERENCES "public"."MarketSku"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "public"."CatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubstitutionRule" ADD CONSTRAINT "SubstitutionRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OptimizationPlan" ADD CONSTRAINT "OptimizationPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OptimizationPlan" ADD CONSTRAINT "OptimizationPlan_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlanLeg" ADD CONSTRAINT "PlanLeg_optimizationPlanId_fkey" FOREIGN KEY ("optimizationPlanId") REFERENCES "public"."OptimizationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalBundle" ADD CONSTRAINT "ApprovalBundle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalBundle" ADD CONSTRAINT "ApprovalBundle_optimizationPlanId_fkey" FOREIGN KEY ("optimizationPlanId") REFERENCES "public"."OptimizationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_approvalBundleId_fkey" FOREIGN KEY ("approvalBundleId") REFERENCES "public"."ApprovalBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderLeg" ADD CONSTRAINT "OrderLeg_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderLeg" ADD CONSTRAINT "OrderLeg_marketAccountId_fkey" FOREIGN KEY ("marketAccountId") REFERENCES "public"."MarketAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderEvent" ADD CONSTRAINT "OrderEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConnectorHealth" ADD CONSTRAINT "ConnectorHealth_connectorPolicyId_fkey" FOREIGN KEY ("connectorPolicyId") REFERENCES "public"."ConnectorPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

