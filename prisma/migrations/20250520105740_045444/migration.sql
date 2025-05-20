-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'CREDIT');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('CUSTOMER_DEMAND', 'EMPLOYEE_BENEFIT', 'GOVERNMENT_SERVANT', 'PENSIONER');

-- CreateEnum
CREATE TYPE "ReturnType" AS ENUM ('CUSTOMER_RETURN', 'COMPANY_RETURN');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" INTEGER,
    "medicalStoreId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalStore" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "ntnNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "companyCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "mobile" TEXT,
    "distributorCode" TEXT,
    "ntnNumber" TEXT,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "medicalStoreId" INTEGER NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "supplierCode" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "distributorCode" TEXT NOT NULL,
    "ntnNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" INTEGER NOT NULL,
    "medicalStoreId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "formula" TEXT,
    "description" TEXT,
    "minquantity" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variation" (
    "id" SERIAL NOT NULL,
    "medicineId" INTEGER NOT NULL,
    "potency" TEXT NOT NULL,
    "packaging" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "unitsPerPack" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" SERIAL NOT NULL,
    "batchNo" TEXT NOT NULL,
    "mfgDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "variationId" INTEGER NOT NULL,
    "purchaseOrderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineInstance" (
    "id" SERIAL NOT NULL,
    "variationId" INTEGER NOT NULL,
    "batchId" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubUnit" (
    "id" SERIAL NOT NULL,
    "unitId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unitType" TEXT NOT NULL,
    "subUnitCount" INTEGER NOT NULL,
    "subUnitPrice" DOUBLE PRECISION NOT NULL,
    "isSold" BOOLEAN NOT NULL DEFAULT false,
    "isReturnedByCustomer" BOOLEAN NOT NULL DEFAULT false,
    "isReturnedToSupplier" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineLocation" (
    "id" SERIAL NOT NULL,
    "medicalStoreId" INTEGER NOT NULL,
    "medicineId" INTEGER NOT NULL,
    "medicineInstanceId" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "rank" TEXT,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalStoreMedicine" (
    "id" SERIAL NOT NULL,
    "medicalStoreId" INTEGER NOT NULL,
    "medicineId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalStoreMedicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineExpiry" (
    "id" SERIAL NOT NULL,
    "medicineId" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "isNearExpiry" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineExpiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransaction" (
    "id" SERIAL NOT NULL,
    "medicalStoreId" INTEGER NOT NULL,
    "medicineInstanceId" INTEGER NOT NULL,
    "purchaseOrderId" INTEGER,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "medicalStoreId" INTEGER NOT NULL,
    "supplierId" INTEGER,
    "userId" INTEGER NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "totalCost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "customerName" TEXT,
    "customerLocation" TEXT,
    "customerContact" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "changeCash" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION DEFAULT 0.0,
    "discountType" "DiscountType",
    "itemsCost" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION DEFAULT 0.0,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION,
    "bill" DOUBLE PRECISION NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'Paid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoldItems" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "medicineId" INTEGER NOT NULL,
    "batchId" INTEGER,
    "subUnitId" INTEGER,
    "packing" TEXT,
    "quantity" INTEGER NOT NULL,
    "retailPrice" DOUBLE PRECISION NOT NULL,
    "discountPrice" DOUBLE PRECISION,
    "margin" DOUBLE PRECISION NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoldItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnedItems" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "medicineId" INTEGER NOT NULL,
    "batchId" INTEGER,
    "subUnitId" INTEGER,
    "packing" TEXT,
    "quantity" INTEGER NOT NULL,
    "retailPrice" DOUBLE PRECISION NOT NULL,
    "discountPrice" DOUBLE PRECISION,
    "margin" DOUBLE PRECISION NOT NULL,
    "returnType" "ReturnType" NOT NULL,
    "returnedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnedItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_employeeId_idx" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalStore_ownerId_key" ON "MedicalStore"("ownerId");

-- CreateIndex
CREATE INDEX "MedicalStore_ownerId_idx" ON "MedicalStore"("ownerId");

-- CreateIndex
CREATE INDEX "Company_companyCode_idx" ON "Company"("companyCode");

-- CreateIndex
CREATE INDEX "Company_medicalStoreId_idx" ON "Company"("medicalStoreId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_companyCode_medicalStoreId_key" ON "Company"("companyCode", "medicalStoreId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_supplierCode_key" ON "Supplier"("supplierCode");

-- CreateIndex
CREATE INDEX "Supplier_companyId_idx" ON "Supplier"("companyId");

-- CreateIndex
CREATE INDEX "Supplier_medicalStoreId_idx" ON "Supplier"("medicalStoreId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_supplierCode_medicalStoreId_key" ON "Supplier"("supplierCode", "medicalStoreId");

-- CreateIndex
CREATE INDEX "Medicine_companyId_idx" ON "Medicine"("companyId");

-- CreateIndex
CREATE INDEX "Medicine_supplierId_idx" ON "Medicine"("supplierId");

-- CreateIndex
CREATE INDEX "Variation_medicineId_idx" ON "Variation"("medicineId");

-- CreateIndex
CREATE INDEX "Batch_variationId_idx" ON "Batch"("variationId");

-- CreateIndex
CREATE INDEX "Batch_purchaseOrderId_idx" ON "Batch"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "MedicineInstance_variationId_idx" ON "MedicineInstance"("variationId");

-- CreateIndex
CREATE INDEX "MedicineInstance_batchId_idx" ON "MedicineInstance"("batchId");

-- CreateIndex
CREATE INDEX "SubUnit_unitId_idx" ON "SubUnit"("unitId");

-- CreateIndex
CREATE INDEX "MedicineLocation_medicalStoreId_idx" ON "MedicineLocation"("medicalStoreId");

-- CreateIndex
CREATE INDEX "MedicineLocation_medicineId_idx" ON "MedicineLocation"("medicineId");

-- CreateIndex
CREATE INDEX "MedicineLocation_medicineInstanceId_idx" ON "MedicineLocation"("medicineInstanceId");

-- CreateIndex
CREATE INDEX "MedicalStoreMedicine_medicalStoreId_idx" ON "MedicalStoreMedicine"("medicalStoreId");

-- CreateIndex
CREATE INDEX "MedicalStoreMedicine_medicineId_idx" ON "MedicalStoreMedicine"("medicineId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalStoreMedicine_medicalStoreId_medicineId_key" ON "MedicalStoreMedicine"("medicalStoreId", "medicineId");

-- CreateIndex
CREATE INDEX "MedicineExpiry_medicineId_idx" ON "MedicineExpiry"("medicineId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineExpiry_medicineId_expiryDate_key" ON "MedicineExpiry"("medicineId", "expiryDate");

-- CreateIndex
CREATE INDEX "StockTransaction_medicalStoreId_idx" ON "StockTransaction"("medicalStoreId");

-- CreateIndex
CREATE INDEX "StockTransaction_medicineInstanceId_idx" ON "StockTransaction"("medicineInstanceId");

-- CreateIndex
CREATE INDEX "StockTransaction_purchaseOrderId_idx" ON "StockTransaction"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_medicalStoreId_idx" ON "PurchaseOrder"("medicalStoreId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_userId_idx" ON "PurchaseOrder"("userId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "SoldItems_orderId_idx" ON "SoldItems"("orderId");

-- CreateIndex
CREATE INDEX "SoldItems_medicineId_idx" ON "SoldItems"("medicineId");

-- CreateIndex
CREATE INDEX "SoldItems_batchId_idx" ON "SoldItems"("batchId");

-- CreateIndex
CREATE INDEX "SoldItems_subUnitId_idx" ON "SoldItems"("subUnitId");

-- CreateIndex
CREATE INDEX "ReturnedItems_orderId_idx" ON "ReturnedItems"("orderId");

-- CreateIndex
CREATE INDEX "ReturnedItems_medicineId_idx" ON "ReturnedItems"("medicineId");

-- CreateIndex
CREATE INDEX "ReturnedItems_batchId_idx" ON "ReturnedItems"("batchId");

-- CreateIndex
CREATE INDEX "ReturnedItems_subUnitId_idx" ON "ReturnedItems"("subUnitId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalStore" ADD CONSTRAINT "MedicalStore_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_medicalStoreId_fkey" FOREIGN KEY ("medicalStoreId") REFERENCES "MedicalStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_medicalStoreId_fkey" FOREIGN KEY ("medicalStoreId") REFERENCES "MedicalStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variation" ADD CONSTRAINT "Variation_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineInstance" ADD CONSTRAINT "MedicineInstance_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineInstance" ADD CONSTRAINT "MedicineInstance_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubUnit" ADD CONSTRAINT "SubUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "MedicineInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineLocation" ADD CONSTRAINT "MedicineLocation_medicalStoreId_fkey" FOREIGN KEY ("medicalStoreId") REFERENCES "MedicalStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineLocation" ADD CONSTRAINT "MedicineLocation_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineLocation" ADD CONSTRAINT "MedicineLocation_medicineInstanceId_fkey" FOREIGN KEY ("medicineInstanceId") REFERENCES "MedicineInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalStoreMedicine" ADD CONSTRAINT "MedicalStoreMedicine_medicalStoreId_fkey" FOREIGN KEY ("medicalStoreId") REFERENCES "MedicalStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalStoreMedicine" ADD CONSTRAINT "MedicalStoreMedicine_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineExpiry" ADD CONSTRAINT "MedicineExpiry_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_medicalStoreId_fkey" FOREIGN KEY ("medicalStoreId") REFERENCES "MedicalStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_medicineInstanceId_fkey" FOREIGN KEY ("medicineInstanceId") REFERENCES "MedicineInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_medicalStoreId_fkey" FOREIGN KEY ("medicalStoreId") REFERENCES "MedicalStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldItems" ADD CONSTRAINT "SoldItems_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldItems" ADD CONSTRAINT "SoldItems_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldItems" ADD CONSTRAINT "SoldItems_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldItems" ADD CONSTRAINT "SoldItems_subUnitId_fkey" FOREIGN KEY ("subUnitId") REFERENCES "SubUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnedItems" ADD CONSTRAINT "ReturnedItems_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnedItems" ADD CONSTRAINT "ReturnedItems_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnedItems" ADD CONSTRAINT "ReturnedItems_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnedItems" ADD CONSTRAINT "ReturnedItems_subUnitId_fkey" FOREIGN KEY ("subUnitId") REFERENCES "SubUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
