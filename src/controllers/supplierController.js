const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Register a new supplier
const registerSupplier = async (req, res) => {
  const { medicalStoreId } = req.params;
  const { 
    supplierCode, 
    name, 
    address, 
    phone, 
    email, 
    distributorCode, 
    ntnNo, 
    companyId, 
    medicalStoreId: bodyMedicalStoreId, 
    isActive 
  } = req.body;

  try {
    // Debug log for received data
    console.log('Request Params:', req.params, 'Request Body:', req.body);

    // Validate required fields
    if (!name || !address || !distributorCode || !companyId) {
      return res.status(400).json({
        error: 'Name, address, distributor code, and company ID are required.',
      });
    }

    // Convert medicalStoreId and companyId to numbers
    const storeId = Number(medicalStoreId);
    const compId = Number(companyId);
    if (isNaN(storeId) || isNaN(compId)) {
      return res.status(400).json({
        error: 'Invalid medical store ID or company ID. Both must be numbers.',
      });
    }

    // Validate medicalStoreId from body matches params (if provided)
    if (bodyMedicalStoreId !== undefined && Number(bodyMedicalStoreId) !== storeId) {
      return res.status(400).json({
        error: `Medical store ID in body (${bodyMedicalStoreId}) does not match URL parameter (${medicalStoreId}).`,
      });
    }

    // Check if the medical store exists
    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: storeId },
    });
    if (!medicalStore) {
      return res.status(404).json({
        error: `Medical store with ID ${storeId} not found.`,
      });
    }

    // Check if the company exists and belongs to the medical store
    const company = await prisma.company.findUnique({
      where: { id: compId },
    });
    if (!company) {
      return res.status(404).json({
        error: `Company with ID ${companyId} not found.`,
      });
    }
    if (company.medicalStoreId !== storeId) {
      return res.status(403).json({
        error: `Company with ID ${companyId} does not belong to medical store with ID ${storeId}.`,
      });
    }

    // Check if supplier already exists (using supplierCode and medicalStoreId)
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        supplierCode: supplierCode || null, // Handle nullable supplierCode
        medicalStoreId: storeId,
      },
    });
    if (existingSupplier) {
      return res.status(409).json({
        error: `Supplier with code '${supplierCode || 'null'}' already exists for medical store ID ${storeId}.`,
      });
    }

    // Create supplier in a transaction with audit log
    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: {
          supplierCode,
          name,
          address,
          phone,
          email,
          distributorCode,
          ntnNo,
          companyId: compId,
          medicalStoreId: storeId,
          isActive: isActive === undefined ? true : isActive,
        },
        include: {
          medicalStore: true,
          company: true,
          medicines: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: 1, // Fallback userId since authentication is removed
          action: 'CREATE',
          entity: 'Supplier',
          entityId: supplier.id,
          description: `Registered supplier: ${JSON.stringify({
            supplierCode,
            name,
            address,
            phone,
            email,
            distributorCode,
            ntnNo,
            companyId,
            medicalStoreId: storeId,
            isActive: supplier.isActive,
          })}`,
        },
      });

      return supplier;
    });

    res.status(201).json({
      message: 'Supplier registered successfully',
      supplier: result,
    });
  } catch (error) {
    console.error('Error registering supplier:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({
        error: `Foreign key constraint failed: Invalid company ID or medical store ID.`,
      });
    }
    if (error.code) {
      return res.status(500).json({
        error: `Prisma error occurred: ${error.message}`,
      });
    }
    res.status(500).json({
      error: 'An unexpected error occurred while registering the supplier.',
    });
  }
};

// Get all suppliers for a specific medical store
const getSuppliersByMedicalStore = async (req, res) => {
  const { medicalStoreId } = req.params;

  try {
    // Validate medicalStoreId
    const storeId = Number(medicalStoreId);
    if (isNaN(storeId)) {
      return res.status(400).json({
        error: 'Invalid medical store ID. It must be a number.',
      });
    }

    // Check if the medical store exists
    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: storeId },
    });
    if (!medicalStore) {
      return res.status(404).json({
        error: `Medical store with ID ${storeId} not found.`,
      });
    }

    // Fetch suppliers
    const suppliers = await prisma.supplier.findMany({
      where: {
        medicalStoreId: storeId,
        isActive: true,
      },
      include: {
        medicalStore: true,
        company: true,
        medicines: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      message: 'Suppliers fetched successfully',
      suppliers,
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      error: 'An error occurred while fetching suppliers.',
    });
  }
};

// Get a supplier by ID and medical store ID
const getSupplierById = async (req, res) => {
  const { supplierId, medicalStoreId } = req.params;

  try {
    // Validate IDs
    const storeId = Number(medicalStoreId);
    const suppId = Number(supplierId);
    if (isNaN(storeId) || isNaN(suppId)) {
      return res.status(400).json({
        error: 'Invalid medical store ID or supplier ID. Both must be numbers.',
      });
    }

    // Check if the medical store exists
    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: storeId },
    });
    if (!medicalStore) {
      return res.status(404).json({
        error: `Medical store with ID ${storeId} not found.`,
      });
    }

    // Fetch the supplier
    const supplier = await prisma.supplier.findUnique({
      where: { id: suppId },
      include: {
        medicalStore: true,
        company: true,
        medicines: true,
      },
    });

    if (!supplier) {
      return res.status(404).json({
        error: `Supplier with ID ${supplierId} not found.`,
      });
    }

    // Verify the supplier belongs to the specified medical store
    if (supplier.medicalStoreId !== storeId) {
      return res.status(403).json({
        error: `Supplier with ID ${supplierId} does not belong to medical store with ID ${storeId}.`,
      });
    }

    res.status(200).json({
      message: 'Supplier retrieved successfully',
      supplier,
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({
      error: `An error occurred while fetching the supplier with ID ${supplierId}.`,
    });
  }
};

// Update a supplier
const updateSupplier = async (req, res) => {
  const { supplierId, medicalStoreId } = req.params;
  const { 
    supplierCode, 
    name, 
    address, 
    phone, 
    email, 
    distributorCode, 
    ntnNo, 
    companyId, 
    medicalStoreId: bodyMedicalStoreId, 
    isActive 
  } = req.body;

  try {
    // Validate required fields
    if (!name || !address || !distributorCode || !companyId) {
      return res.status(400).json({
        error: 'Name, address, distributor code, and company ID are required.',
      });
    }

    // Convert IDs to numbers
    const storeId = Number(medicalStoreId);
    const suppId = Number(supplierId);
    const compId = Number(companyId);
    if (isNaN(storeId) || isNaN(suppId) || isNaN(compId)) {
      return res.status(400).json({
        error: 'Invalid medical store ID, supplier ID, or company ID. All must be numbers.',
      });
    }

    // Validate medicalStoreId from body matches params (if provided)
    if (bodyMedicalStoreId !== undefined && Number(bodyMedicalStoreId) !== storeId) {
      return res.status(400).json({
        error: `Medical store ID in body (${bodyMedicalStoreId}) does not match URL parameter (${medicalStoreId}).`,
      });
    }

    // Check if the medical store exists
    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: storeId },
    });
    if (!medicalStore) {
      return res.status(404).json({
        error: `Medical store with ID ${storeId} not found.`,
      });
    }

    // Check if the company exists and belongs to the medical store
    const company = await prisma.company.findUnique({
      where: { id: compId },
    });
    if (!company) {
      return res.status(404).json({
        error: `Company with ID ${companyId} not found.`,
      });
    }
    if (company.medicalStoreId !== storeId) {
      return res.status(403).json({
        error: `Company with ID ${companyId} does not belong to medical store with ID ${storeId}.`,
      });
    }

    // Check if the supplier exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id: suppId },
    });
    if (!existingSupplier) {
      return res.status(404).json({
        error: `Supplier with ID ${supplierId} not found.`,
      });
    }

    // Verify the supplier belongs to the specified medical store
    if (existingSupplier.medicalStoreId !== storeId) {
      return res.status(403).json({
        error: `Supplier with ID ${supplierId} does not belong to medical store with ID ${storeId}.`,
      });
    }

    // Check for duplicate supplierCode (excluding the current supplier)
    if (supplierCode !== existingSupplier.supplierCode) {
      const duplicateSupplier = await prisma.supplier.findFirst({
        where: {
          supplierCode: supplierCode || null,
          medicalStoreId: storeId,
          NOT: { id: suppId },
        },
      });
      if (duplicateSupplier) {
        return res.status(409).json({
          error: `Supplier with code '${supplierCode || 'null'}' already exists for medical store ID ${storeId}.`,
        });
      }
    }

    // Update supplier in a transaction with audit log
    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.update({
        where: { id: suppId },
        data: {
          supplierCode,
          name,
          address,
          phone,
          email,
          distributorCode,
          ntnNo,
          companyId: compId,
          medicalStoreId: storeId,
          isActive: isActive !== undefined ? isActive : existingSupplier.isActive,
        },
        include: {
          medicalStore: true,
          company: true,
          medicines: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: 1, // Fallback userId since authentication is removed
          action: 'UPDATE',
          entity: 'Supplier',
          entityId: supplier.id,
          description: `Updated supplier: ${JSON.stringify({
           supplierCode,
            name,
            address,
            phone,
            email,
            distributorCode,
            ntnNo,
            companyId,
            medicalStoreId: storeId,
            isActive: supplier.isActive,
          })}`,
        },
      });

      return supplier;
    });

    res.status(200).json({
      message: 'Supplier updated successfully',
      supplier: result,
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({
        error: `Foreign key constraint failed: Invalid company ID or medical store ID.`,
      });
    }
    if (error.code) {
      return res.status(500).json({
        error: `Prisma error occurred: ${error.message}`,
      });
    }
    res.status(500).json({
      error: `An error occurred while updating the supplier with ID ${supplierId}.`,
    });
  }
};

// Delete a supplier (soft delete by setting isActive to false)
const deleteSupplier = async (req, res) => {
  const { supplierId, medicalStoreId } = req.params;

  try {
    // Validate IDs
    const storeId = Number(medicalStoreId);
    const suppId = Number(supplierId);
    if (isNaN(storeId) || isNaN(suppId)) {
      return res.status(400).json({
        error: 'Invalid medical store ID or supplier ID. Both must be numbers.',
      });
    }

    // Check if the medical store exists
    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: storeId },
    });
    if (!medicalStore) {
      return res.status(404).json({
        error: `Medical store with ID ${storeId} not found.`,
      });
    }

    // Check if the supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: suppId },
    });
    if (!supplier) {
      return res.status(404).json({
        error: `Supplier with ID ${supplierId} not found.`,
      });
    }

    // Verify the supplier belongs to the specified medical store
    if (supplier.medicalStoreId !== storeId) {
      return res.status(403).json({
        error: `Supplier with ID ${supplierId} does not belong to medical store with ID ${storeId}.`,
      });
    }

    // Check if the supplier has associated medicines
    const medicines = await prisma.medicine.count({
      where: { supplierId: suppId, isActive: true },
    });
    if (medicines > 0) {
      return res.status(400).json({
        error: 'Cannot delete supplier with associated active medicines.',
      });
    }

    // Soft delete supplier in a transaction with audit log
    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.update({
        where: { id: suppId },
        data: { isActive: false },
        include: {
          medicalStore: true,
          company: true,
          medicines: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: 1, // Fallback userId since authentication is removed
          action: 'DELETE',
          entity: 'Supplier',
          entityId: supplier.id,
          description: `Deactivated supplier with ID: ${supplierId} for medicalStoreId: ${storeId}`,
        },
      });

      return supplier;
    });

    res.status(200).json({
      message: `Supplier with ID ${supplierId} has been deactivated.`,
      supplier: result,
    });
  } catch (error) {
    console.error('Error deactivating supplier:', error);
    res.status(500).json({
      error: `An error occurred while deactivating the supplier with ID ${supplierId}.`,
    });
  }
};

module.exports = {
  registerSupplier,
  getSuppliersByMedicalStore,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
};