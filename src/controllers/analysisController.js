const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


// Get daily sales analysis
async function getDailySalesAnalysis(req, res) {
  try {
    const { medicalStoreId } = req.params;
    const { startDate } = req.query;

    // Validate inputs
    if (!medicalStoreId) {
      return res.status(400).json({ error: 'MedicalStoreId is required' });
    }

    // Check if medical store exists
    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: parseInt(medicalStoreId) }
    });
    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    // Determine date range
    const now = startDate ? new Date(startDate) : new Date();
    const start = new Date(now.setHours(0, 0, 0, 0));
    const end = new Date(now.setHours(23, 59, 59, 999));

    // Fetch sales and returns data
    const [soldItems, returnedItems] = await Promise.all([
      prisma.soldItems.findMany({
        where: {
          medicine: {
            stores: {
              some: {
                medicalStoreId: parseInt(medicalStoreId)
              }
            }
          },
          saleDate: {
            gte: start,
            lte: end
          }
        },
        include: {
          medicine: {
            include: {
              instances: {
                where: {
                  batchId: { equals: prisma.soldItems.fields.batchId }
                }
              }
            }
          }
        }
      }),
      prisma.returnedItems.findMany({
        where: {
          medicine: {
            stores: {
              some: {
                medicalStoreId: parseInt(medicalStoreId)
              }
            }
          },
          returnedDate: {
            gte: start,
            lte: end
          }
        }
      })
    ]);

    // Calculate metrics
    const totalSales = soldItems.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);
    const discountAmount = soldItems.reduce((sum, item) => sum + (item.discountPrice || 0) * item.quantity, 0);
    const profit = soldItems.reduce((sum, item) => {
      const instance = item.medicine.instances.find(inst => inst.batchId === item.batchId);
      const purchasePrice = instance ? instance.purchasePrice : 0;
      return sum + ((item.retailPrice - purchasePrice) * item.quantity);
    }, 0);
    const totalReturnsAmount = returnedItems.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);

    res.status(200).json({
      message: 'Daily sales analysis fetched successfully',
      data: {
        period: 'daily',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalSales,
        discountAmount,
        profit,
        totalReturnsAmount
      }
    });
  } catch (error) {
    console.error('Error fetching daily sales analysis:', error.message);
    res.status(500).json({ error: 'Failed to fetch daily sales analysis', details: error.message });
  }
}

// Get weekly sales analysis
async function getWeeklySalesAnalysis(req, res) {
  try {
    const { medicalStoreId } = req.params;
    const { startDate } = req.query;

    // Validate inputs
    if (!medicalStoreId) {
      return res.status(400).json({ error: 'MedicalStoreId is required' });
    }

    // Check if medical store exists
    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: parseInt(medicalStoreId) }
    });
    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    // Determine date range
    const now = startDate ? new Date(startDate) : new Date();
    const start = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Monday
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    // Fetch sales and returns data
    const [soldItems, returnedItems] = await Promise.all([
      prisma.soldItems.findMany({
        where: {
          medicine: {
            stores: {
              some: {
                medicalStoreId: parseInt(medicalStoreId)
              }
            }
          },
          saleDate: {
            gte: start,
            lte: end
          }
        },
        include: {
          medicine: {
            include: {
              instances: {
                where: {
                  batchId: { equals: prisma.soldItems.fields.batchId }
                }
              }
            }
          }
        }
      }),
      prisma.returnedItems.findMany({
        where: {
          medicine: {
            stores: {
              some: {
                medicalStoreId: parseInt(medicalStoreId)
              }
            }
          },
          returnedDate: {
            gte: start,
            lte: end
          }
        }
      })
    ]);

    // Calculate metrics
    const totalSales = soldItems.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);
    const discountAmount = soldItems.reduce((sum, item) => sum + (item.discountPrice || 0) * item.quantity, 0);
    const profit = soldItems.reduce((sum, item) => {
      const instance = item.medicine.instances.find(inst => inst.batchId === item.batchId);
      const purchasePrice = instance ? instance.purchasePrice : 0;
      return sum + ((item.retailPrice - purchasePrice) * item.quantity);
    }, 0);
    const totalReturnsAmount = returnedItems.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);

    res.status(200).json({
      message: 'Weekly sales analysis fetched successfully',
      data: {
        period: 'weekly',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalSales,
        discountAmount,
        profit,
        totalReturnsAmount
      }
    });
  } catch (error) {
    console.error('Error fetching weekly sales analysis:', error.message);
    res.status(500).json({ error: 'Failed to fetch weekly sales analysis', details: error.message });
  }
}

// Get monthly sales analysis
async function getMonthlySalesAnalysis(req, res) {
  try {
    const { medicalStoreId } = req.params;
    const { startDate } = req.query;

    // Validate inputs
    if (!medicalStoreId) {
      return res.status(400).json({ error: 'MedicalStoreId is required' });
    }

    // Check if medical store exists
    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: parseInt(medicalStoreId) }
    });
    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    // Determine date range
    const now = startDate ? new Date(startDate) : new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch sales and returns data
    const [soldItems, returnedItems] = await Promise.all([
      prisma.soldItems.findMany({
        where: {
          medicine: {
            stores: {
              some: {
                medicalStoreId: parseInt(medicalStoreId)
              }
            }
          },
          saleDate: {
            gte: start,
            lte: end
          }
        },
        include: {
          medicine: {
            include: {
              instances: {
                where: {
                  batchId: { equals: prisma.soldItems.fields.batchId }
                }
              }
            }
          }
        }
      }),
      prisma.returnedItems.findMany({
        where: {
          medicine: {
            stores: {
              some: {
                medicalStoreId: parseInt(medicalStoreId)
              }
            }
          },
          returnedDate: {
            gte: start,
            lte: end
          }
        }
      })
    ]);

    // Calculate metrics
    const totalSales = soldItems.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);
    const discountAmount = soldItems.reduce((sum, item) => sum + (item.discountPrice || 0) * item.quantity, 0);
    const profit = soldItems.reduce((sum, item) => {
      const instance = item.medicine.instances.find(inst => inst.batchId === item.batchId);
      const purchasePrice = instance ? instance.purchasePrice : 0;
      return sum + ((item.retailPrice - purchasePrice) * item.quantity);
    }, 0);
    const totalReturnsAmount = returnedItems.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);

    res.status(200).json({
      message: 'Monthly sales analysis fetched successfully',
      data: {
        period: 'monthly',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalSales,
        discountAmount,
        profit,
        totalReturnsAmount
      }
    });
  } catch (error) {
    console.error('Error fetching monthly sales analysis:', error.message);
    res.status(500).json({ error: 'Failed to fetch monthly sales analysis', details: error.message });
  }
}

// Get yearly sales analysis
async function getYearlySalesAnalysis(req, res) {
  try {
    const { medicalStoreId } = req.params;
    const { startDate } = req.query;

    // Validate inputs
    if (!medicalStoreId) {
      return res.status(400).json({ error: 'MedicalStoreId is required' });
    }

    // Check if medical store exists
    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: parseInt(medicalStoreId) }
    });
    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    // Determine date range
    const now = startDate ? new Date(startDate) : new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    // Fetch sales and returns data
    const [soldItems, returnedItems] = await Promise.all([
      prisma.soldItems.findMany({
        where: {
          medicine: {
            stores: {
              some: {
                medicalStoreId: parseInt(medicalStoreId)
              }
            }
          },
          saleDate: {
            gte: start,
            lte: end
          }
        },
        include: {
          medicine: {
            include: {
              instances: {
                where: {
                  batchId: { equals: prisma.soldItems.fields.batchId }
                }
              }
            }
          }
        }
      }),
      prisma.returnedItems.findMany({
        where: {
          medicine: {
            stores: {
              some: {
                medicalStoreId: parseInt(medicalStoreId)
              }
            }
          },
          returnedDate: {
            gte: start,
            lte: end
          }
        }
      })
    ]);

    // Calculate metrics
    const totalSales = soldItems.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);
    const discountAmount = soldItems.reduce((sum, item) => sum + (item.discountPrice || 0) * item.quantity, 0);
    const profit = soldItems.reduce((sum, item) => {
      const instance = item.medicine.instances.find(inst => inst.batchId === item.batchId);
      const purchasePrice = instance ? instance.purchasePrice : 0;
      return sum + ((item.retailPrice - purchasePrice) * item.quantity);
    }, 0);
    const totalReturnsAmount = returnedItems.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);

    res.status(200).json({
      message: 'Yearly sales analysis fetched successfully',
      data: {
        period: 'yearly',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalSales,
        discountAmount,
        profit,
        totalReturnsAmount
      }
    });
  } catch (error) {
    console.error('Error fetching yearly sales analysis:', error.message);
    res.status(500).json({ error: 'Failed to fetch yearly sales analysis', details: error.message });
  }
}

module.exports = {
  getDailySalesAnalysis,
  getWeeklySalesAnalysis,
  getMonthlySalesAnalysis,
  getYearlySalesAnalysis
};