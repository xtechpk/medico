const { PrismaClient } = require('@prisma/client'); // Import PrismaClient
const prisma = new PrismaClient(); // Initialize Prisma client

// Create a new company
const createCompany = async (req, res) => {
  const { 
    companyCode, 
    name, 
    address, 
    phone, 
    mobile, 
    distributorCode, 
    ntnNo, 
    medicalStoreId,
    isActive // Optional field
  } = req.body;

  try {
    // Debug log for received data
    console.log('Request Body:', req.body);

    // Validate required fields
    if (!companyCode || !name || !address || !distributorCode || !medicalStoreId) {
      return res.status(400).json({
        error: 'Company code, name, address, distributor code, and medical store ID are required.',
      });
    }

    // Convert medicalStoreId to a number to avoid type issues
    const storeId = Number(medicalStoreId);
    console.log('Converted medicalStoreId:', storeId);

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
    });

    // Return success response
    res.status(201).json({
      message: 'Company registered successfully!',
      company,
    });
  } catch (error) {
    console.error('Error creating company:', error);

    // Handle unique constraint violation (P2002)
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


// Get all companies by medicalStoreId with counts for total, active, and inactive companies
const getCompaniesByMedicalStoreId = async (req, res) => {
  const { medicalStoreId } = req.params; // Extract medicalStoreId from request params

  try {
    // Convert medicalStoreId to a number (ensure it's valid)
    const storeId = Number(medicalStoreId);
    if (isNaN(storeId)) {
      return res.status(400).json({
        error: 'Invalid medicalStoreId. It must be a numeric value.',
      });
    }

    // Fetch companies associated with the given medicalStoreId
    const companies = await prisma.company.findMany({
      where: {
        medicalStoreId: storeId, // Filter by medicalStoreId
      },
    });

    // Check if companies exist
    if (companies.length === 0) {
      return res.status(404).json({
        error: `No companies found for medical store with ID ${storeId}.`,
      });
    }

    // Calculate counts
    const totalCount = companies.length;
    const activeCount = companies.filter(company => company.isActive).length;
    const inactiveCount = totalCount - activeCount;

    // Return the list of companies along with the counts
    res.status(200).json({
      message: 'Companies retrieved successfully!',
      counts: {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
      },
      companies,
    });
  } catch (error) {
    console.error('Error retrieving companies:', error);

    // Handle unexpected errors
    res.status(500).json({
      error: 'An error occurred while retrieving companies.',
    });
  }
};


// Update a company by ID (including isActive status, excluding medicalStoreId)
const updateCompany = async (req, res) => {
  const { id } = req.params; // Extract company ID from request params
  const {
    companyCode,
    name,
    address,
    phone,
    mobile,
    distributorCode,
    ntnNo,
    isActive, // Add isActive to the fields that can be updated
  } = req.body; // Extract fields to update from the request body

  try {
    // Convert ID to a number and validate
    const companyId = Number(id);
    if (isNaN(companyId)) {
      return res.status(400).json({
        error: 'Invalid company ID. It must be a numeric value.',
      });
    }

    // Check if the company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!existingCompany) {
      return res.status(404).json({
        error: `Company with ID ${companyId} not found.`,
      });
    }

    // Update the company (including isActive, excluding medicalStoreId)
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        companyCode,
        name,
        address,
        phone,
        mobile,
        distributorCode,
        ntnNo,
        ...(isActive !== undefined && { isActive }), // Only update isActive if it's provided
      },
    });

    // Return success response
    res.status(200).json({
      message: 'Company updated successfully!',
      company: updatedCompany,
    });
  } catch (error) {
    console.error('Error updating company:', error);

    // Handle unique constraint violation (P2002)
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: `A company with the code '${companyCode}' already exists.`,
      });
    }

    // Handle unexpected errors
    res.status(500).json({
      error: 'An error occurred while updating the company.',
    });
  }
};

module.exports = { createCompany, getCompaniesByMedicalStoreId , updateCompany};