const { PrismaClient } = require('@prisma/client'); // Import PrismaClient
const prisma = new PrismaClient(); // Initialize Prisma client

// Create a new company
const createCompany = async (req, res) => {
  const { medicalStoreId } = req.params;
  const { 
    companyCode, 
    name, 
    address, 
    phone, 
    mobile, 
    distributorCode, 
    ntnNo, 
    isActive,
    medicalStoreId: bodyMedicalStoreId // Optional medicalStoreId in body
  } = req.body;

  try {
    // Debug log for received data
    console.log('Request Params:', req.params, 'Request Body:', req.body);

    // Validate required fields
    if (!companyCode || !name || !address) {
      return res.status(400).json({
        error: 'Company code, name, and address are required.',
      });
    }

    // Convert medicalStoreId from params to a number
    const storeId = Number(medicalStoreId);
    if (isNaN(storeId)) {
      return res.status(400).json({
        error: 'Invalid medical store ID in URL. It must be a number.',
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

    // Create the new company
    const company = await prisma.company.create({
      data: {
        companyCode,
        name,
        address,
        phone,
        mobile,
        distributorCode,
        ntnNo,
        medicalStoreId: storeId,
        isActive: isActive === undefined ? true : isActive, // Default to true if not provided
      },
      include: {
        medicalStore: true,
        suppliers: true,
        medicines: true, // Include medicines relation
      },
    });

    // Return success response
    res.status(201).json({
      message: 'Company registered successfully!',
      company,
    });
  } catch (error) {
    console.error('Error creating company:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002' && error.meta?.target?.includes('companyCode_medicalStoreId')) {
      return res.status(400).json({
        error: `A company with the code '${companyCode}' already exists in the medical store with ID ${medicalStoreId}.`,
      });
    }

    // Handle other Prisma errors
    if (error.code) {
      return res.status(500).json({
        error: `Prisma error occurred: ${error.message}`,
      });
    }

    // Handle unexpected errors
    res.status(500).json({
      error: 'An unexpected error occurred while creating the company.',
    });
  }
};

// Get all companies for a specific medical store
const getAllCompanies = async (req, res) => {
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

    // Fetch companies for the medical store
    const companies = await prisma.company.findMany({
      where: {
        medicalStoreId: storeId,
        isActive: true,
      },
      include: {
        medicalStore: true,
        suppliers: true,
        medicines: true, // Include medicines relation
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      message: 'Companies retrieved successfully!',
      companies,
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      error: 'An error occurred while fetching companies.',
    });
  }
};

// Get a company by ID and medical store ID
const getCompanyById = async (req, res) => {
  const { id, medicalStoreId } = req.params;

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

    // Fetch the company
    const company = await prisma.company.findUnique({
      where: { id: Number(id) },
      include: {
        medicalStore: true,
        suppliers: true,
        medicines: true, // Include medicines relation
      },
    });

    if (!company) {
      return res.status(404).json({
        error: `Company with ID ${id} not found.`,
      });
    }

    // Verify the company belongs to the specified medical store
    if (company.medicalStoreId !== storeId) {
      return res.status(403).json({
        error: `Company with ID ${id} does not belong to medical store with ID ${storeId}.`,
      });
    }

    res.status(200).json({
      message: 'Company retrieved successfully!',
      company,
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({
      error: `An error occurred while fetching the company with ID ${id}.`,
    });
  }
};

// Update a company
const updateCompany = async (req, res) => {
  const { id, medicalStoreId } = req.params;
  const { 
    companyCode, 
    name, 
    address, 
    phone, 
    mobile, 
    distributorCode, 
    ntnNo, 
    isActive,
    medicalStoreId: bodyMedicalStoreId // Optional medicalStoreId in body
  } = req.body;

  try {
    // Validate required fields
    if (!companyCode || !name || !address) {
      return res.status(400).json({
        error: 'Company code, name, and address are required.',
      });
    }

    // Convert medicalStoreId from params to a number
    const storeId = Number(medicalStoreId);
    if (isNaN(storeId)) {
      return res.status(400).json({
        error: 'Invalid medical store ID in URL. It must be a number.',
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

    // Check if the company exists
    const companyExists = await prisma.company.findUnique({
      where: { id: Number(id) },
    });

    if (!companyExists) {
      return res.status(404).json({
        error: `Company with ID ${id} not found.`,
      });
    }

    // Verify the company belongs to the specified medical store
    if (companyExists.medicalStoreId !== storeId) {
      return res.status(403).json({
        error: `Company with ID ${id} does not belong to medical store with ID ${storeId}.`,
      });
    }

    // Update the company
    const company = await prisma.company.update({
      where: { id: Number(id) },
      data: {
        companyCode,
        name,
        address,
        phone,
        mobile,
        distributorCode,
        ntnNo,
        medicalStoreId: storeId,
        isActive: isActive !== undefined ? isActive : companyExists.isActive,
      },
      include: {
        medicalStore: true,
        suppliers: true,
        medicines: true, // Include medicines relation
      },
    });

    res.status(200).json({
      message: 'Company updated successfully!',
      company,
    });
  } catch (error) {
    console.error('Error updating company:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002' && error.meta?.target?.includes('companyCode_medicalStoreId')) {
      return res.status(400).json({
        error: `A company with the code '${companyCode}' already exists in the medical store with ID ${medicalStoreId}.`,
      });
    }

    // Handle other Prisma errors
    if (error.code) {
      return res.status(500).json({
        error: `Prisma error occurred: ${error.message}`,
      });
    }

    res.status(500).json({
      error: `An error occurred while updating the company with ID ${id}.`,
    });
  }
};

// Delete a company (soft delete by setting isActive to false)
const deleteCompany = async (req, res) => {
  const { id, medicalStoreId } = req.params;

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

    // Check if the company exists
    const company = await prisma.company.findUnique({
      where: { id: Number(id) },
    });

    if (!company) {
      return res.status(404).json({
        error: `Company with ID ${id} not found.`,
      });
    }

    // Verify the company belongs to the specified medical store
    if (company.medicalStoreId !== storeId) {
      return res.status(403).json({
        error: `Company with ID ${id} does not belong to medical store with ID ${storeId}.`,
      });
    }

    // Check if the company has associated suppliers or medicines
    const suppliers = await prisma.supplier.count({
      where: { companyId: Number(id), isActive: true },
    });
    const medicines = await prisma.medicine.count({
      where: { companyId: Number(id), isActive: true },
    });

    if (suppliers > 0 || medicines > 0) {
      return res.status(400).json({
        error: 'Cannot delete company with associated active suppliers or medicines.',
      });
    }

    // Soft delete by setting isActive to false
    const updatedCompany = await prisma.company.update({
      where: { id: Number(id) },
      data: { isActive: false },
      include: {
        medicalStore: true,
        suppliers: true,
        medicines: true,
      },
    });

    res.status(200).json({
      message: `Company with ID ${id} has been deactivated.`,
      company: updatedCompany,
    });
  } catch (error) {
    console.error('Error deactivating company:', error);
    res.status(500).json({
      error: `An error occurred while deactivating the company with ID ${id}.`,
    });
  }
};

module.exports = {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
};