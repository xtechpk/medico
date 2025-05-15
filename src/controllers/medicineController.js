const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

// Register a new medicine with optional batch details
async function registerMedicine(req, res) {
  try {
    const {
      name,
      formula,
      description,
      minquantity,
      companyId,
      medicalStoreId,
      quantity,
      purchasePrice,
      sellingPrice,
      expiryDate,
      mfgDate,
      price,
      location,
      rank,
    } = req.body;

    // Validate required fields
    if (!name || !minquantity || !companyId || !medicalStoreId || !quantity) {
      return res.status(400).json({
        error: "Missing required fields: name, minquantity, companyId, medicalStoreId, or quantity",
      });
    }

    // Check if the company exists
    const companyExists = await prisma.company.findUnique({
      where: { id: parseInt(companyId) },
    });
    if (!companyExists) {
      return res.status(404).json({ error: "Company not found for the given ID" });
    }

    // Check if the medical store exists
    const medicalStoreExists = await prisma.medicalStore.findUnique({
      where: { id: parseInt(medicalStoreId) },
    });
    if (!medicalStoreExists) {
      return res.status(404).json({ error: "Medical store not found for the given ID" });
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the medicine
      const medicine = await tx.medicine.create({
        data: {
          name,
          formula,
          description,
          minquantity,
          companyId: parseInt(companyId),
          stores: {
            create: {
              medicalStoreId: parseInt(medicalStoreId),
              quantity,
            },
          },
        },
      });

      // If batch details are provided, create a batch and related records
      if (purchasePrice && sellingPrice && expiryDate && mfgDate && price && location) {
        const batchSerial = `BATCH-${uuidv4()}`; // Auto-generate batchSerial
        const batch = await tx.batch.create({
          data: {
            serial: batchSerial,
            mfgDate: new Date(mfgDate),
            expiryDate: new Date(expiryDate),
            quantity,
            price,
            medicineId: medicine.id,
          },
        });

        const medicineInstance = await tx.medicineInstance.create({
          data: {
            medicineId: medicine.id,
            batchId: batch.id,
            expiryDate: new Date(expiryDate),
            quantity,
            purchasePrice,
            sellingPrice,
          },
        });

        await tx.medicineLocation.create({
          data: {
            medicalStoreId: parseInt(medicalStoreId),
            medicineId: medicine.id,
            medicineInstanceId: medicineInstance.id,
            location,
            rank: rank ? String(rank) : null,
            quantity,
          },
        });
      }

      return { medicine };
    });

    res.status(201).json({ message: "Medicine registered successfully", data: result });
  } catch (error) {
    console.error("Error registering medicine:", error.message);
    res.status(500).json({ error: "Failed to register medicine", details: error.message });
  }
}

// Get all batches of a specific medicine
async function getBatches(req, res) {
  try {
    const { medicineId } = req.params;

    // Validate the medicineId
    if (!medicineId) {
      return res.status(400).json({ error: "MedicineId is required" });
    }

    // Check if the medicine exists
    const medicine = await prisma.medicine.findUnique({
      where: { id: parseInt(medicineId) },
    });

    if (!medicine) {
      return res.status(404).json({ error: "Medicine not found for the given ID" });
    }

    // Fetch all batches for the given medicineId
    const batches = await prisma.batch.findMany({
      where: { medicineId: parseInt(medicineId) },
      include: {
        medicine: true,
      },
    });

    // Check if no batches found
    if (!batches || batches.length === 0) {
      return res.status(404).json({ error: "No batches found for the given medicine ID" });
    }

    res.status(200).json({
      message: "Batches fetched successfully",
      data: batches,
    });
  } catch (error) {
    console.error("Error fetching batches:", error.message);
    res.status(500).json({ error: "An unexpected error occurred while fetching batches", details: error.message });
  }
}

// Get all batches for a specific medicine and medical store
async function getBatchesByMedicalStoreAndMedicine(req, res) {
  try {
    const { medicalStoreId, medicineId } = req.params;

    // Validate inputs
    if (!medicalStoreId || !medicineId) {
      return res.status(400).json({ error: 'MedicalStoreId and MedicineId are required' });
    }

    // Check if medical store exists
    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: parseInt(medicalStoreId) }
    });

    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    // Check if medicine exists
    const medicine = await prisma.medicine.findUnique({
      where: { id: parseInt(medicineId) }
    });

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    // Verify medicine is associated with medical store
    const medicalStoreMedicine = await prisma.medicalStoreMedicine.findFirst({
      where: {
        medicalStoreId: parseInt(medicalStoreId),
        medicineId: parseInt(medicineId)
      }
    });

    if (!medicalStoreMedicine) {
      return res.status(404).json({ error: 'Medicine not associated with this medical store' });
    }

    // Fetch batches for the medicine, including related data
    const batches = await prisma.batch.findMany({
      where: {
        medicineId: parseInt(medicineId)
      },
      include: {
        medicine: {
          select: { name: true, formula: true }
        },
        medicineInstances: {
          include: {
            locations: {
              where: {
                medicalStoreId: parseInt(medicalStoreId)
              },
              select: {
                location: true,
                rank: true,
                quantity: true
              }
            }
          }
        }
      }
    });

    // Check if batches exist
    if (!batches || batches.length === 0) {
      return res.status(404).json({ error: 'No batches found for this medicine and medical store' });
    }

    res.status(200).json({
      message: 'Batches fetched successfully',
      data: batches
    });
  } catch (error) {
    console.error('Error fetching batches:', error.message);
    res.status(500).json({ error: 'Failed to fetch batches', details: error.message });
  }
}


// Get all medicines for a specific medical store
async function getMedicinesByMedicalStoreId(req, res) {
  try {
    const { medicalStoreId } = req.params;

    if (!medicalStoreId) {
      return res.status(400).json({ error: "MedicalStoreId is required" });
    }

    const storeId = parseInt(medicalStoreId);

    const medicines = await prisma.medicine.findMany({
      where: {
        stores: {
          some: {
            medicalStoreId: storeId,
          },
        },
      },
      include: {
        company: {
          select: { name: true },
        },
        stores: {
          where: { medicalStoreId: storeId },
          select: {
            id: true,
            medicalStoreId: true,
            medicineId: true,
            quantity: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        locations: {
          where: { medicalStoreId: storeId },
          select: {
            location: true,
            rank: true,
            quantity: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        // instances removed here
      },
    });

    if (!medicines || medicines.length === 0) {
      return res.status(404).json({ error: "No medicines found for the given medical store ID" });
    }

    const total = medicines.length;

    const active = medicines.filter((m) => m.stores.some((store) => store.quantity > 0)).length;

    const lowStock = medicines.filter((m) =>
      m.stores.some((store) => store.quantity <= m.minquantity)
    ).length;

    const updatedMedicines = medicines.map((medicine) => ({
      id: medicine.id,
      name: medicine.name,
      formula: medicine.formula,
      description: medicine.description,
      minquantity: medicine.minquantity,
      company: medicine.company.name,
      createdAt: medicine.createdAt,
      updatedAt: medicine.updatedAt,
      isActive: medicine.isActive,
      quantity: medicine.stores[0]?.quantity || 0,
      location: medicine.locations[0]?.location || null,
      rank: medicine.locations[0]?.rank || null,
      // sellingPrice removed here
      stores: medicine.stores,
      medicineLocations: medicine.locations, // Alias for frontend compatibility
      // instances removed here
    }));

    res.status(200).json({
      message: "Medicines fetched successfully",
      data: {
        total,
        active,
        lowStock,
        medicines: updatedMedicines,
      },
    });
  } catch (error) {
    console.error("Error fetching medicines:", error.message);
    res.status(500).json({
      error: "An unexpected error occurred while fetching medicines",
      details: error.message,
    });
  }
}


async function updateMedicine(req, res) {
  try {
    const { medicalStoreId, medicineId } = req.params;
    const { location, description, formula, minquantity } = req.body;

    if (!medicalStoreId || !medicineId) {
      return res.status(400).json({ error: "MedicalStoreId and MedicineId are required" });
    }

    const storeId = parseInt(medicalStoreId);
    const medId = parseInt(medicineId);

    // Validate input fields
    if (minquantity !== undefined && (!Number.isInteger(minquantity) || minquantity <= 0)) {
      return res.status(400).json({ error: "minquantity must be a positive integer" });
    }
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "At least one field (location, description, formula, minquantity) must be provided" });
    }

    // Validate medical store
    const medicalStoreExists = await prisma.medicalStore.findUnique({
      where: { id: storeId },
    });
    if (!medicalStoreExists) {
      return res.status(404).json({ error: "Medical store not found" });
    }

    // Validate medicine
    const medicineExists = await prisma.medicine.findUnique({
      where: { id: medId },
    });
    if (!medicineExists) {
      return res.status(404).json({ error: "Medicine not found" });
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update Medicine fields if provided
      const medicineUpdateData = {};
      if (description !== undefined) medicineUpdateData.description = description;
      if (formula !== undefined) medicineUpdateData.formula = formula;
      if (minquantity !== undefined) medicineUpdateData.minquantity = minquantity;

      let updatedMedicine;
      if (Object.keys(medicineUpdateData).length > 0) {
        updatedMedicine = await tx.medicine.update({
          where: { id: medId },
          data: medicineUpdateData,
        });
      } else {
        updatedMedicine = medicineExists;
      }

      // Update MedicineLocation if location is provided
      let updatedLocation = null;
      if (location !== undefined) {
        const existingLocation = await tx.medicineLocation.findFirst({
          where: {
            medicalStoreId: storeId,
            medicineId: medId,
          },
          orderBy: { createdAt: "desc" },
        });

        if (existingLocation) {
          updatedLocation = await tx.medicineLocation.update({
            where: { id: existingLocation.id },
            data: { location },
          });
        } else {
          // Create a new MedicineLocation if none exists
          const medicineInstance = await tx.medicineInstance.findFirst({
            where: { medicineId: medId },
            orderBy: { createdAt: "desc" },
          });
          if (!medicineInstance) {
            throw new Error("No medicine instance found for this medicine");
          }
          updatedLocation = await tx.medicineLocation.create({
            data: {
              medicalStoreId: storeId,
              medicineId: medId,
              medicineInstanceId: medicineInstance.id,
              location,
              quantity: medicineInstance.quantity,
            },
          });
        }
      }

      // Log updates to AuditLog
      const auditLogData = {
        userId: 1, // Replace with authenticated user ID
        action: "UPDATE",
        entity: "Medicine",
        entityId: medId,
        description: `Updated medicine: ${JSON.stringify({
          medicalStoreId: storeId,
          medicineId: medId,
          updatedFields: { location, description, formula, minquantity },
        })}`,
      };
      await tx.auditLog.create({ data: auditLogData });

      return { updatedMedicine, updatedLocation };
    });

    res.status(200).json({
      message: "Medicine updated successfully",
      data: {
        medicine: {
          id: result.updatedMedicine.id,
          name: result.updatedMedicine.name,
          formula: result.updatedMedicine.formula,
          description: result.updatedMedicine.description,
          minquantity: result.updatedMedicine.minquantity,
        },
        location: result.updatedLocation ? result.updatedLocation.location : null,
      },
    });
  } catch (error) {
    console.error("Error updating medicine:", error.message);
    res.status(500).json({
      error: "Failed to update medicine",
      details: error.message,
    });
  }
}


// Add new stock to existing medicine with support for multiple batches
async function addStock(req, res) {
  try {
    const {
      medicineId,
      medicalStoreId,
      quantity,
      mfgDate,
      expiryDate,
      price,
      purchasePrice,
      sellingPrice,
      location,
      rank,
      batches
    } = req.body;

    // Validate required fields
    if (!medicineId || !medicalStoreId) {
      return res.status(400).json({ error: 'Missing required fields: medicineId, medicalStoreId' });
    }

    // Check if medicine exists
    const medicine = await prisma.medicine.findUnique({
      where: { id: parseInt(medicineId) }
    });

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    // Validate batches or single-batch fallback
    let totalBatchQuantity = 0;
    if (batches && Array.isArray(batches)) {
      totalBatchQuantity = batches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
      if (totalBatchQuantity === 0) {
        return res.status(400).json({ error: 'At least one batch with non-zero quantity is required' });
      }
      for (const batch of batches) {
        if (!batch.quantity || !batch.mfgDate || !batch.expiryDate || !batch.price || !batch.purchasePrice || !batch.sellingPrice) {
          return res.status(400).json({ error: 'Each batch must include quantity, mfgDate, expiryDate, price, purchasePrice, and sellingPrice' });
        }
        if (batch.price < 0) {
          return res.status(400).json({ error: 'Batch price (total cost of box) cannot be negative' });
        }
      }
      if (quantity !== undefined && quantity !== totalBatchQuantity) {
        return res.status(400).json({ error: `Provided quantity (${quantity}) must equal sum of batch quantities (${totalBatchQuantity})` });
      }
    } else {
      if (!quantity || !mfgDate || !expiryDate || !price || !purchasePrice || !sellingPrice) {
        return res.status(400).json({ error: 'quantity, mfgDate, expiryDate, price, purchasePrice, and sellingPrice are required if no batches array is provided' });
      }
      if (price < 0) {
        return res.status(400).json({ error: 'Price (total cost of box) cannot be negative' });
      }
      totalBatchQuantity = quantity;
    }

    const totalQuantity = totalBatchQuantity;

    const result = await prisma.$transaction(async (tx) => {
      const createdBatches = [];
      const createdInstances = [];

      if (batches && Array.isArray(batches)) {
        for (const batchData of batches) {
          const batchSerial = `BATCH-${uuidv4()}`;
          const batch = await tx.batch.create({
            data: {
              serial: batchSerial,
              mfgDate: new Date(batchData.mfgDate),
              expiryDate: new Date(batchData.expiryDate),
              quantity: batchData.quantity,
              price: batchData.price,
              medicineId: parseInt(medicineId)
            }
          });

          const medicineInstance = await tx.medicineInstance.create({
            data: {
              medicineId: parseInt(medicineId),
              batchId: batch.id,
              expiryDate: new Date(batchData.expiryDate),
              quantity: batchData.quantity,
              purchasePrice: batchData.purchasePrice,
              sellingPrice: batchData.sellingPrice
            }
          });

          if (batchData.location) {
            await tx.medicineLocation.create({
              data: {
                medicalStoreId: parseInt(medicalStoreId),
                medicineId: parseInt(medicineId),
                medicineInstanceId: medicineInstance.id,
                location: batchData.location,
                rank: batchData.rank ? String(batchData.rank) : null,
                quantity: batchData.quantity
              }
            });
          }

          await tx.stockTransaction.create({
            data: {
              medicalStoreId: parseInt(medicalStoreId),
              medicineInstanceId: medicineInstance.id,
              quantity: batchData.quantity
            }
          });

          createdBatches.push(batch);
          createdInstances.push(medicineInstance);
        }
      } else {
        const batchSerial = `BATCH-${uuidv4()}`;
        const batch = await tx.batch.create({
          data: {
            serial: batchSerial,
            mfgDate: new Date(mfgDate),
            expiryDate: new Date(expiryDate),
            quantity,
            price,
            medicineId: parseInt(medicineId)
          }
        });

        const medicineInstance = await tx.medicineInstance.create({
          data: {
            medicineId: parseInt(medicineId),
            batchId: batch.id,
            expiryDate: new Date(expiryDate),
            quantity,
            purchasePrice,
            sellingPrice
          }
        });

        if (location) {
          await tx.medicineLocation.create({
            data: {
              medicalStoreId: parseInt(medicalStoreId),
              medicineId: parseInt(medicineId),
              medicineInstanceId: medicineInstance.id,
              location,
              rank: rank ? String(rank) : null,
              quantity
            }
          });
        }

        await tx.stockTransaction.create({
          data: {
            medicalStoreId: parseInt(medicalStoreId),
            medicineInstanceId: medicineInstance.id,
            quantity
          }
        });

        createdBatches.push(batch);
        createdInstances.push(medicineInstance);
      }

      const medicalStoreMedicine = await tx.medicalStoreMedicine.findFirst({
        where: { medicalStoreId: parseInt(medicalStoreId), medicineId: parseInt(medicineId) }
      });

      if (medicalStoreMedicine) {
        await tx.medicalStoreMedicine.update({
          where: { id: medicalStoreMedicine.id },
          data: { quantity: medicalStoreMedicine.quantity + totalQuantity }
        });
      } else {
        await tx.medicalStoreMedicine.create({
          data: {
            medicalStoreId: parseInt(medicalStoreId),
            medicineId: parseInt(medicineId),
            quantity: totalQuantity
          }
        });
      }

      const updatedStoreMedicine = await tx.medicalStoreMedicine.findFirst({
        where: { medicalStoreId: parseInt(medicalStoreId), medicineId: parseInt(medicineId) },
        select: { quantity: true }
      });

      if (updatedStoreMedicine.quantity <= medicine.minquantity) {
        const expiryDates = batches
          ? batches.map(batch => ({ expiryDate: new Date(batch.expiryDate), quantity: batch.quantity }))
          : [{ expiryDate: new Date(expiryDate), quantity }];

        for (const { expiryDate } of expiryDates) {
          await tx.medicineExpiry.upsert({
            where: {
              medicineId_expiryDate: {
                medicineId: parseInt(medicineId),
                expiryDate
              }
            },
            update: { isNearExpiry: true },
            create: {
              medicineId: parseInt(medicineId),
              expiryDate,
              isNearExpiry: true
            }
          });
        }
      }

      return { batches: createdBatches, instances: createdInstances };
    });

    res.status(201).json({ message: 'Stock added successfully', data: result });
  } catch (error) {
    console.error('Error adding stock:', error.message);
    res.status(500).json({ error: 'Failed to add stock', details: error.message });
  }
}

// Sell medicine to customers, prioritizing earliest expiry
async function sellMedicine(req, res) {
  try {
    const { medicalStoreId, medicineId } = req.params;
    const { orderId, quantity, discountPrice, packing } = req.body;

    // Validate inputs
    if (!medicalStoreId || !medicineId || !orderId || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: medicalStoreId, medicineId, orderId, quantity' });
    }
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }

    // Check if medical store exists
    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: parseInt(medicalStoreId) }
    });
    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    // Check if medicine exists
    const medicine = await prisma.medicine.findUnique({
      where: { id: parseInt(medicineId) }
    });
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) }
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if medicine is associated with medical store
    const medicalStoreMedicine = await prisma.medicalStoreMedicine.findFirst({
      where: { medicalStoreId: parseInt(medicalStoreId), medicineId: parseInt(medicineId) }
    });
    if (!medicalStoreMedicine) {
      return res.status(404).json({ error: 'Medicine not associated with this medical store' });
    }

    // Check if enough stock is available
    if (medicalStoreMedicine.quantity < quantity) {
      return res.status(400).json({ error: `Insufficient stock: requested ${quantity}, available ${medicalStoreMedicine.quantity}` });
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Fetch medicine instances sorted by expiry date
      const medicineInstances = await tx.medicineInstance.findMany({
        where: {
          medicineId: parseInt(medicineId),
          quantity: { gt: 0 }
        },
        orderBy: { expiryDate: 'asc' },
        include: {
          locations: {
            where: { medicalStoreId: parseInt(medicalStoreId) }
          }
        }
      });

      let remainingQuantity = quantity;
      const soldItems = [];

      for (const instance of medicineInstances) {
        if (remainingQuantity <= 0) break;

        const availableQuantity = instance.quantity;
        const quantityToSell = Math.min(remainingQuantity, availableQuantity);

        // Update MedicineInstance
        await tx.medicineInstance.update({
          where: { id: instance.id },
          data: { quantity: availableQuantity - quantityToSell }
        });

        // Update MedicineLocation
        if (instance.locations.length > 0) {
          for (const location of instance.locations) {
            await tx.medicineLocation.update({
              where: { id: location.id },
              data: { quantity: location.quantity - quantityToSell }
            });
          }
        }

        // Create StockTransaction (negative quantity for sale)
        await tx.stockTransaction.create({
          data: {
            medicalStoreId: parseInt(medicalStoreId),
            medicineInstanceId: instance.id,
            quantity: -quantityToSell
          }
        });

        // Create SoldItems
        const retailPrice = discountPrice || instance.sellingPrice;
        const margin = (retailPrice - instance.purchasePrice) * quantityToSell;
        const soldItem = await tx.soldItems.create({
          data: {
            orderId: parseInt(orderId),
            medicineId: parseInt(medicineId),
            batchId: instance.batchId,
            packing,
            quantity: quantityToSell,
            retailPrice,
            discountPrice: discountPrice ? instance.sellingPrice - discountPrice : null,
            margin
          }
        });

        soldItems.push(soldItem);
        remainingQuantity -= quantityToSell;
      }

      if (remainingQuantity > 0) {
        throw new Error('Insufficient stock in available batches');
      }

      // Update MedicalStoreMedicine
      await tx.medicalStoreMedicine.update({
        where: { id: medicalStoreMedicine.id },
        data: { quantity: medicalStoreMedicine.quantity - quantity }
      });

      // Update MedicineExpiry if needed
      const updatedStoreMedicine = await tx.medicalStoreMedicine.findFirst({
        where: { medicalStoreId: parseInt(medicalStoreId), medicineId: parseInt(medicineId) }
      });

      if (updatedStoreMedicine.quantity <= medicine.minquantity) {
        const expiryDates = await tx.medicineInstance.findMany({
          where: { medicineId: parseInt(medicineId), quantity: { gt: 0 } },
          select: { expiryDate: true }
        });

        for (const { expiryDate } of expiryDates) {
          await tx.medicineExpiry.upsert({
            where: {
              medicineId_expiryDate: {
                medicineId: parseInt(medicineId),
                expiryDate
              }
            },
            update: { isNearExpiry: true },
            create: {
              medicineId: parseInt(medicineId),
              expiryDate,
              isNearExpiry: true
            }
          });
        }
      }

      return { soldItems };
    });

    res.status(201).json({ message: 'Medicine sold successfully', data: result });
  } catch (error) {
    console.error('Error selling medicine:', error.message);
    res.status(500).json({ error: 'Failed to sell medicine', details: error.message });
  }
}

// Return medicine from customer or company
async function returnMedicine(req, res) {
  try {
    const { medicalStoreId, medicineId } = req.params;
    const { orderId, batchId, quantity, returnType, retailPrice, discountPrice, packing } = req.body;

    // Validate inputs
    if (!medicalStoreId || !medicineId || !orderId || !quantity || !returnType || !retailPrice) {
      return res.status(400).json({ error: 'Missing required fields: medicalStoreId, medicineId, orderId, quantity, returnType, retailPrice' });
    }
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }
    if (!['CUSTOMER_RETURN', 'COMPANY_RETURN'].includes(returnType)) {
      return res.status(400).json({ error: 'Invalid returnType: must be CUSTOMER_RETURN or COMPANY_RETURN' });
    }

    // Check if medical store exists
    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: parseInt(medicalStoreId) }
    });
    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    // Check if medicine exists
    const medicine = await prisma.medicine.findUnique({
      where: { id: parseInt(medicineId) }
    });
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) }
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if medicine is associated with medical store
    const medicalStoreMedicine = await prisma.medicalStoreMedicine.findFirst({
      where: { medicalStoreId: parseInt(medicalStoreId), medicineId: parseInt(medicineId) }
    });
    if (!medicalStoreMedicine) {
      return res.status(404).json({ error: 'Medicine not associated with this medical store' });
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      let medicineInstance;

      if (returnType === 'CUSTOMER_RETURN') {
        // Prefer the specified batchId, else find or create a matching instance
        if (batchId) {
          medicineInstance = await tx.medicineInstance.findFirst({
            where: {
              batchId: parseInt(batchId),
              medicineId: parseInt(medicineId)
            },
            include: {
              locations: {
                where: { medicalStoreId: parseInt(medicalStoreId) }
              }
            }
          });
        }

        if (!medicineInstance) {
          // Find instance with matching expiry date or create new
          const batch = await tx.batch.findFirst({
            where: { id: batchId || null, medicineId: parseInt(medicineId) }
          });
          const expiryDate = batch ? batch.expiryDate : new Date();

          medicineInstance = await tx.medicineInstance.findFirst({
            where: {
              medicineId: parseInt(medicineId),
              expiryDate
            },
            include: {
              locations: {
                where: { medicalStoreId: parseInt(medicalStoreId) }
              }
            }
          });

          if (!medicineInstance) {
            // Create new instance
            const newBatch = await tx.batch.create({
              data: {
                serial: `BATCH-${uuidv4()}`,
                mfgDate: new Date(),
                expiryDate,
                quantity: 0,
                price: retailPrice * quantity,
                medicineId: parseInt(medicineId)
              }
            });

            medicineInstance = await tx.medicineInstance.create({
              data: {
                medicineId: parseInt(medicineId),
                batchId: newBatch.id,
                expiryDate,
                quantity: 0,
                purchasePrice: retailPrice,
                sellingPrice: retailPrice
              }
            });
          }
        }

        // Update MedicineInstance
        await tx.medicineInstance.update({
          where: { id: medicineInstance.id },
          data: { quantity: medicineInstance.quantity + quantity }
        });

        // Update or create MedicineLocation
        if (medicineInstance.locations.length > 0) {
          for (const location of medicineInstance.locations) {
            await tx.medicineLocation.update({
              where: { id: location.id },
              data: { quantity: location.quantity + quantity }
            });
          }
        } else {
          await tx.medicineLocation.create({
            data: {
              medicalStoreId: parseInt(medicalStoreId),
              medicineId: parseInt(medicineId),
              medicineInstanceId: medicineInstance.id,
              location: 'Default',
              quantity
            }
          });
        }

        // Update MedicalStoreMedicine
        await tx.medicalStoreMedicine.update({
          where: { id: medicalStoreMedicine.id },
          data: { quantity: medicalStoreMedicine.quantity + quantity }
        });

        // Create StockTransaction (positive for customer return)
        await tx.stockTransaction.create({
          data: {
            medicalStoreId: parseInt(medicalStoreId),
            medicineInstanceId: medicineInstance.id,
            quantity
          }
        });
      } else {
        // COMPANY_RETURN: Deduct from stock
        medicineInstance = await tx.medicineInstance.findFirst({
          where: {
            batchId: batchId ? parseInt(batchId) : null,
            medicineId: parseInt(medicineId),
            quantity: { gte: quantity }
          },
          include: {
            locations: {
              where: { medicalStoreId: parseInt(medicalStoreId) }
            }
          }
        });

        if (!medicineInstance) {
          return res.status(400).json({ error: 'No suitable batch found for company return' });
        }

        // Update MedicineInstance
        await tx.medicineInstance.update({
          where: { id: medicineInstance.id },
          data: { quantity: medicineInstance.quantity - quantity }
        });

        // Update MedicineLocation
        if (medicineInstance.locations.length > 0) {
          for (const location of medicineInstance.locations) {
            await tx.medicineLocation.update({
              where: { id: location.id },
              data: { quantity: location.quantity - quantity }
            });
          }
        }

        // Update MedicalStoreMedicine
        await tx.medicalStoreMedicine.update({
          where: { id: medicalStoreMedicine.id },
          data: { quantity: medicalStoreMedicine.quantity - quantity }
        });

        // Create StockTransaction (negative for company return)
        await tx.stockTransaction.create({
          data: {
            medicalStoreId: parseInt(medicalStoreId),
            medicineInstanceId: medicineInstance.id,
            quantity: -quantity
          }
        });
      }

      // Create ReturnedItems
      const margin = discountPrice ? (retailPrice - discountPrice) * quantity : 0;
      const returnedItem = await tx.returnedItems.create({
        data: {
          orderId: parseInt(orderId),
          medicineId: parseInt(medicineId),
          batchId: medicineInstance.batchId,
          packing,
          quantity,
          retailPrice,
          discountPrice,
          margin,
          returnType
        }
      });

      // Update MedicineExpiry if needed
      const updatedStoreMedicine = await tx.medicalStoreMedicine.findFirst({
        where: { medicalStoreId: parseInt(medicalStoreId), medicineId: parseInt(medicineId) }
      });

      if (updatedStoreMedicine.quantity <= medicine.minquantity) {
        const expiryDates = await tx.medicineInstance.findMany({
          where: { medicineId: parseInt(medicineId), quantity: { gt: 0 } },
          select: { expiryDate: true }
        });

        for (const { expiryDate } of expiryDates) {
          await tx.medicineExpiry.upsert({
            where: {
              medicineId_expiryDate: {
                medicineId: parseInt(medicineId),
                expiryDate
              }
            },
            update: { isNearExpiry: true },
            create: {
              medicineId: parseInt(medicineId),
              expiryDate,
              isNearExpiry: true
            }
          });
        }
      }

      return { returnedItem };
    });

    res.status(201).json({ message: 'Medicine returned successfully', data: result });
  } catch (error) {
    console.error('Error returning medicine:', error.message);
    res.status(500).json({ error: 'Failed to return medicine', details: error.message });
  }
}

// Get medicines near expiry (6–7 months from now)
async function getNearExpiryMedicines(req, res) {
  try {
    const { medicalStoreId } = req.params;

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

    // Calculate 6–7 month window dynamically
    const now = new Date();
    const startExpiry = new Date(now);
    startExpiry.setMonth(now.getMonth() + 6);
    startExpiry.setHours(0, 0, 0, 0);
    const endExpiry = new Date(now);
    endExpiry.setMonth(now.getMonth() + 7);
    endExpiry.setHours(23, 59, 59, 999);

    // Fetch medicines with near-expiry instances
    const medicines = await prisma.medicine.findMany({
      where: {
        stores: {
          some: {
            medicalStoreId: parseInt(medicalStoreId)
          }
        },
        instances: {
          some: {
            expiryDate: {
              gte: startExpiry,
              lte: endExpiry
            },
            quantity: { gt: 0 }
          }
        }
      },
      include: {
        stores: {
          where: { medicalStoreId: parseInt(medicalStoreId) },
          select: { quantity: true }
        },
        instances: {
          where: {
            expiryDate: {
              gte: startExpiry,
              lte: endExpiry
            },
            quantity: { gt: 0 }
          },
          include: {
            batch: {
              select: { serial: true, mfgDate: true, price: true }
            },
            locations: {
              where: { medicalStoreId: parseInt(medicalStoreId) },
              select: { location: true, rank: true, quantity: true }
            }
          }
        }
      }
    });

    if (!medicines || medicines.length === 0) {
      return res.status(404).json({ error: 'No medicines with near-expiry batches found' });
    }

    res.status(200).json({
      message: 'Near-expiry medicines fetched successfully',
      data: medicines
    });
  } catch (error) {
    console.error('Error fetching near-expiry medicines:', error.message);
    res.status(500).json({ error: 'Failed to fetch near-expiry medicines', details: error.message });
  }
}

// Get medicines with low stock (quantity <= minquantity)
async function getLowStockMedicines(req, res) {
  try {
    const { medicalStoreId } = req.params;

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

    // Fetch medicines with low stock
    const medicines = await prisma.medicine.findMany({
      where: {
        stores: {
          some: {
            medicalStoreId: parseInt(medicalStoreId),
            quantity: {
              lte: prisma.medicine.fields.minquantity
            }
          }
        }
      },
      include: {
        stores: {
          where: { medicalStoreId: parseInt(medicalStoreId) },
          select: { quantity: true }
        },
        company: {
          select: { name: true }
        }
      }
    });

    if (!medicines || medicines.length === 0) {
      return res.status(404).json({ error: 'No low-stock medicines found' });
    }

    res.status(200).json({
      message: 'Low-stock medicines fetched successfully',
      data: medicines
    });
  } catch (error) {
    console.error('Error fetching low-stock medicines:', error.message);
    res.status(500).json({ error: 'Failed to fetch low-stock medicines', details: error.message });
  }
}


module.exports = {
  registerMedicine,
  getMedicinesByMedicalStoreId,
  updateMedicine,
  addStock,
  getBatches,
  getBatchesByMedicalStoreAndMedicine,
  sellMedicine,
  returnMedicine,
  getNearExpiryMedicines,
  getLowStockMedicines
};