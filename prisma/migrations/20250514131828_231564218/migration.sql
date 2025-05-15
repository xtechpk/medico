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
    "distributorCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ntnNo" TEXT,
    "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "medicalStoreId" INTEGER NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "formula" TEXT,
    "description" TEXT,
    "minquantity" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "MedicineInstance" (
    "id" SERIAL NOT NULL,
    "medicineId" INTEGER NOT NULL,
    "batchId" INTEGER,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineInstance_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Batch" (
    "id" SERIAL NOT NULL,
    "serial" TEXT NOT NULL,
    "purchaseOrderId" INTEGER,
    "mfgDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "medicineId" INTEGER,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "medicalStoreId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "totalCost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
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
    "packing" TEXT,
    "quantity" INTEGER NOT NULL,
    "retailPrice" DOUBLE PRECISION NOT NULL,
    "discountPrice" DOUBLE PRECISION,
    "margin" DOUBLE PRECISION NOT NULL,
    "returnType" "ReturnType",
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
CREATE UNIQUE INDEX "Company_companyCode_medicalStoreId_key" ON "Company"("companyCode", "medicalStoreId");

-- CreateIndex
CREATE INDEX "Medicine_name_idx" ON "Medicine"("name");

-- CreateIndex
CREATE INDEX "Medicine_formula_idx" ON "Medicine"("formula");

-- CreateIndex
CREATE INDEX "MedicalStoreMedicine_medicalStoreId_medicineId_idx" ON "MedicalStoreMedicine"("medicalStoreId", "medicineId");

-- CreateIndex
CREATE INDEX "MedicineInstance_medicineId_idx" ON "MedicineInstance"("medicineId");

-- CreateIndex
CREATE INDEX "MedicineInstance_batchId_idx" ON "MedicineInstance"("batchId");

-- CreateIndex
CREATE INDEX "MedicineLocation_medicalStoreId_medicineId_idx" ON "MedicineLocation"("medicalStoreId", "medicineId");

-- CreateIndex
CREATE INDEX "MedicineLocation_medicineInstanceId_idx" ON "MedicineLocation"("medicineInstanceId");

-- CreateIndex
CREATE INDEX "MedicineExpiry_medicineId_idx" ON "MedicineExpiry"("medicineId");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_serial_key" ON "Batch"("serial");

-- CreateIndex
CREATE INDEX "Batch_serial_idx" ON "Batch"("serial");

-- CreateIndex
CREATE INDEX "Batch_medicineId_idx" ON "Batch"("medicineId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_medicalStoreId_idx" ON "PurchaseOrder"("medicalStoreId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_userId_idx" ON "PurchaseOrder"("userId");

-- CreateIndex
CREATE INDEX "StockTransaction_medicalStoreId_idx" ON "StockTransaction"("medicalStoreId");

-- CreateIndex
CREATE INDEX "StockTransaction_medicineInstanceId_idx" ON "StockTransaction"("medicineInstanceId");

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
CREATE INDEX "ReturnedItems_orderId_idx" ON "ReturnedItems"("orderId");

-- CreateIndex
CREATE INDEX "ReturnedItems_medicineId_idx" ON "ReturnedItems"("medicineId");

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
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalStoreMedicine" ADD CONSTRAINT "MedicalStoreMedicine_medicalStoreId_fkey" FOREIGN KEY ("medicalStoreId") REFERENCES "MedicalStore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalStoreMedicine" ADD CONSTRAINT "MedicalStoreMedicine_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineInstance" ADD CONSTRAINT "MedicineInstance_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineInstance" ADD CONSTRAINT "MedicineInstance_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineLocation" ADD CONSTRAINT "MedicineLocation_medicalStoreId_fkey" FOREIGN KEY ("medicalStoreId") REFERENCES "MedicalStore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineLocation" ADD CONSTRAINT "MedicineLocation_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineLocation" ADD CONSTRAINT "MedicineLocation_medicineInstanceId_fkey" FOREIGN KEY ("medicineInstanceId") REFERENCES "MedicineInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineExpiry" ADD CONSTRAINT "MedicineExpiry_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_medicalStoreId_fkey" FOREIGN KEY ("medicalStoreId") REFERENCES "MedicalStore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_medicalStoreId_fkey" FOREIGN KEY ("medicalStoreId") REFERENCES "MedicalStore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_medicineInstanceId_fkey" FOREIGN KEY ("medicineInstanceId") REFERENCES "MedicineInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldItems" ADD CONSTRAINT "SoldItems_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldItems" ADD CONSTRAINT "SoldItems_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoldItems" ADD CONSTRAINT "SoldItems_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnedItems" ADD CONSTRAINT "ReturnedItems_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnedItems" ADD CONSTRAINT "ReturnedItems_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnedItems" ADD CONSTRAINT "ReturnedItems_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
