const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Register a new medicine with optional batch and variation details
async function registerMedicine(req, res) {
  try {
    const {
      name,
      formula,
      description,
      minquantity,
      companyId,
      supplierId,
      medicalStoreId,
      potency,
      packaging,
      unitType,
      unitsPerPack,
      quantity,
      purchasePrice,
      sellingPrice,
      expiryDate,
      mfgDate,
      price,
      location,
      rank,
      batchNo,
    } = req.body;

    // Validate required fields
    if (!name || !minquantity || !companyId || !supplierId || !medicalStoreId || !quantity) {
      return res.status(400).json({
        error: 'Missing required fields: name, minquantity, companyId, supplierId, medicalStoreId, or quantity',
      });
    }

    // Convert IDs to numbers
    const storeId = Number(medicalStoreId);
    const compId = Number(companyId);
    const suppId = Number(supplierId);
    if (isNaN(storeId) || isNaN(compId) || isNaN(suppId)) {
      return res.status(400).json({
        error: 'Invalid medicalStoreId, companyId, or supplierId. All must be numbers.',
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

    // Check if the supplier exists and belongs to the medical store
    const supplier = await prisma.supplier.findUnique({
      where: { id: suppId },
    });
    if (!supplier) {
      return res.status(404).json({
        error: `Supplier with ID ${supplierId} not found.`,
      });
    }
    if (supplier.medicalStoreId !== storeId) {
      return res.status(403).json({
        error: `Supplier with ID ${supplierId} does not belong to medical store with ID ${storeId}.`,
      });
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
          companyId: compId,
          supplierId: suppId,
          isActive: true,
        },
      });

      // Create MedicalStoreMedicine record
      await tx.medicalStoreMedicine.create({
        data: {
          medicalStoreId: storeId,
          medicineId: medicine.id,
          quantity,
        },
      });

      // Create variation
      let variation;
      if (potency || packaging || unitType || unitsPerPack) {
        if (!potency || !packaging || !unitType || !unitsPerPack) {
          throw new Error('All variation fields (potency, packaging, unitType, unitsPerPack) are required');
        }
        variation = await tx.variation.create({
          data: {
            medicineId: medicine.id,
            potency,
            packaging,
            unitType,
            unitsPerPack,
          },
        });
      } else {
        variation = await tx.variation.create({
          data: {
            medicineId: medicine.id,
            potency: 'Default',
            packaging: 'Default',
            unitType: 'TABLET',
            unitsPerPack: 1,
          },
        });
      }

      // Create batch, instance, and subunits if provided
      if (purchasePrice && sellingPrice && expiryDate && mfgDate && price && location && batchNo) {
        if (!batchNo || typeof batchNo !== 'string' || batchNo.trim() === '') {
          throw new Error('batchNo is required and must be a non-empty string');
        }

        const batch = await tx.batch.create({
          data: {
            batchNo,
            mfgDate: new Date(mfgDate),
            expiryDate: new Date(expiryDate),
            quantity,
            price,
            variationId: variation.id,
          },
        });

        const medicineInstance = await tx.medicineInstance.create({
          data: {
            variationId: variation.id,
            batchId: batch.id,
            expiryDate: new Date(expiryDate),
            quantity,
            purchasePrice,
            sellingPrice,
          },
        });

        // Create SubUnits
        for (let i = 0; i < quantity; i++) {
          await tx.subUnit.create({
            data: {
              unitId: medicineInstance.id,
              name: `SubUnit-${i + 1}`,
              description: `SubUnit for ${medicine.name} (${variation.potency})`,
              unitType: variation.unitType,
              subUnitCount: variation.unitsPerPack,
              subUnitPrice: sellingPrice / variation.unitsPerPack,
            },
          });
        }

        await tx.medicineLocation.create({
          data: {
            medicalStoreId: storeId,
            medicineId: medicine.id,
            medicineInstanceId: medicineInstance.id,
            location,
            rank: rank ? String(rank) : null,
            quantity,
          },
        });

        await tx.stockTransaction.create({
          data: {
            medicalStoreId: storeId,
            medicineInstanceId: medicineInstance.id,
            quantity,
          },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: req.user?.id || 1, // Replace with authenticated user ID
          action: 'CREATE',
          entity: 'Medicine',
          entityId: medicine.id,
          description: `Registered medicine: ${name}`,
        },
      });

      return { medicine, variation };
    });

    res.status(201).json({
      message: 'Medicine registered successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error registering medicine:', error.message);
    res.status(500).json({
      error: 'Failed to register medicine',
      details: error.message,
    });
  }
}

// Get all batches of a specific medicine
async function getBatches(req, res) {
  try {
    const { medicineId } = req.params;

    if (!medicineId) {
      return res.status(400).json({ error: 'MedicineId is required' });
    }

    const medicine = await prisma.medicine.findUnique({
      where: { id: Number(medicineId) },
    });

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    const batches = await prisma.batch.findMany({
      where: { variation: { medicineId: Number(medicineId) } },
      include: {
        variation: {
          select: { potency: true, packaging: true, unitType: true, unitsPerPack: true },
        },
        instances: {
          select: { quantity: true, purchasePrice: true, sellingPrice: true },
        },
      },
      orderBy: { mfgDate: 'asc' },
    });

    if (!batches.length) {
      return res.status(404).json({ error: 'No batches found for this medicine' });
    }

    res.status(200).json({
      message: 'Batches fetched successfully',
      data: batches,
    });
  } catch (error) {
    console.error('Error fetching batches:', error.message);
    res.status(500).json({
      error: 'Failed to fetch batches',
      details: error.message,
    });
  }
}

// Get all batches for a specific medicine and medical store
async function getBatchesByMedicalStoreAndMedicine(req, res) {
  try {
    const { medicalStoreId, medicineId } = req.params;

    if (!medicalStoreId || !medicineId) {
      return res.status(400).json({ error: 'MedicalStoreId and MedicineId are required' });
    }

    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: Number(medicalStoreId) },
    });

    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    const medicine = await prisma.medicine.findUnique({
      where: { id: Number(medicineId) },
    });

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    const medicalStoreMedicine = await prisma.medicalStoreMedicine.findFirst({
      where: {
        medicalStoreId: Number(medicalStoreId),
        medicineId: Number(medicineId),
      },
    });

    if (!medicalStoreMedicine) {
      return res.status(404).json({ error: 'Medicine not associated with this medical store' });
    }

    const batches = await prisma.batch.findMany({
      where: {
        variation: { medicineId: Number(medicineId) },
        instances: {
          some: {
            locations: {
              some: { medicalStoreId: Number(medicalStoreId) },
            },
          },
        },
      },
      include: {
        variation: {
          select: { potency: true, packaging: true, unitType: true, unitsPerPack: true },
        },
        instances: {
          include: {
            locations: {
              where: { medicalStoreId: Number(medicalStoreId) },
              select: { location: true, rank: true, quantity: true },
            },
            subunits: {
              select: { id: true, subUnitCount: true, subUnitPrice: true, isSold: true },
            },
          },
        },
      },
      orderBy: { mfgDate: 'asc' },
    });

    if (!batches.length) {
      return res.status(404).json({ error: 'No batches found for this medicine and medical store' });
    }

    res.status(200).json({
      message: 'Batches fetched successfully',
      data: batches,
    });
  } catch (error) {
    console.error('Error fetching batches:', error.message);
    res.status(500).json({
      error: 'Failed to fetch batches',
      details: error.message,
    });
  }
}

// Get all medicines for a specific medical store
async function getMedicinesByMedicalStoreId(req, res) {
  try {
    const { medicalStoreId } = req.params;

    if (!medicalStoreId) {
      return res.status(400).json({ error: 'MedicalStoreId is required' });
    }

    const storeId = Number(medicalStoreId);
    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: storeId },
    });

    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    const medicines = await prisma.medicine.findMany({
      where: {
        medicalStoreMedicines: {
          some: { medicalStoreId: storeId },
        },
      },
      include: {
        company: {
          select: { name: true },
        },
        medicalStoreMedicines: {
          where: { medicalStoreId: storeId },
          select: { quantity: true, createdAt: true, updatedAt: true },
        },
        locations: {
          where: { medicalStoreId: storeId },
          select: { location: true, rank: true, quantity: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        variations: {
          select: { potency: true, packaging: true, unitType: true, unitsPerPack: true },
        },
      },
    });

    if (!medicines.length) {
      return res.status(404).json({ error: 'No medicines found for this medical store' });
    }

    const total = medicines.length;
    const active = medicines.filter((m) => m.medicalStoreMedicines.some((s) => s.quantity > 0)).length;
    const lowStock = medicines.filter((m) => m.medicalStoreMedicines.some((s) => s.quantity <= m.minquantity)).length;

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
      quantity: medicine.medicalStoreMedicines[0]?.quantity || 0,
      location: medicine.locations[0]?.location || null,
      rank: medicine.locations[0]?.rank || null,
      variations: medicine.variations,
      stores: medicine.medicalStoreMedicines,
      medicineLocations: medicine.locations,
    }));

    res.status(200).json({
      message: 'Medicines fetched successfully',
      data: { total, active, lowStock, medicines: updatedMedicines },
    });
  } catch (error) {
    console.error('Error fetching medicines:', error.message);
    res.status(500).json({
      error: 'Failed to fetch medicines',
      details: error.message,
    });
  }
}

// Update a medicine
async function updateMedicine(req, res) {
  try {
    const { medicalStoreId, medicineId } = req.params;
    const { location, description, formula, minquantity, variationId } = req.body;

    if (!medicalStoreId || !medicineId) {
      return res.status(400).json({ error: 'MedicalStoreId and MedicineId are required' });
    }

    const storeId = Number(medicalStoreId);
    const medId = Number(medicineId);

    if (minquantity !== undefined && (!Number.isInteger(minquantity) || minquantity <= 0)) {
      return res.status(400).json({ error: 'minquantity must be a positive integer' });
    }

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'At least one field must be provided' });
    }

    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: storeId },
    });
    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    const medicine = await prisma.medicine.findUnique({
      where: { id: medId },
    });
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    if (variationId) {
      const variation = await prisma.variation.findUnique({
        where: { id: Number(variationId) },
      });
      if (!variation || variation.medicineId !== medId) {
        return res.status(404).json({ error: 'Variation not found or not associated with this medicine' });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
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
        updatedMedicine = medicine;
      }

      let updatedLocation = null;
      if (location !== undefined) {
        const existingLocation = await tx.medicineLocation.findFirst({
          where: { medicalStoreId: storeId, medicineId: medId },
          orderBy: { createdAt: 'desc' },
        });

        if (existingLocation) {
          updatedLocation = await tx.medicineLocation.update({
            where: { id: existingLocation.id },
            data: { location },
          });
        } else {
          const medicineInstance = await tx.medicineInstance.findFirst({
            where: { variation: { medicineId: medId } },
            orderBy: { createdAt: 'desc' },
          });
          if (!medicineInstance) {
            throw new Error('No medicine instance found for this medicine');
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

      await tx.auditLog.create({
        data: {
          userId: req.user?.id || 1,
          action: 'UPDATE',
          entity: 'Medicine',
          entityId: medId,
          description: `Updated medicine: ${JSON.stringify({
            medicalStoreId: storeId,
            medicineId: medId,
            updatedFields: { location, description, formula, minquantity, variationId },
          })}`,
        },
      });

      return { updatedMedicine, updatedLocation };
    });

    res.status(200).json({
      message: 'Medicine updated successfully',
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
    console.error('Error updating medicine:', error.message);
    res.status(500).json({
      error: 'Failed to update medicine',
      details: error.message,
    });
  }
}

// Add new stock to existing medicine
async function addStock(req, res) {
  try {
    const {
      medicineId,
      medicalStoreId,
      variationId,
      quantity,
      mfgDate,
      expiryDate,
      price,
      purchasePrice,
      sellingPrice,
      location,
      rank,
      batches,
    } = req.body;

    if (!medicineId || !medicalStoreId || !variationId) {
      return res.status(400).json({ error: 'Missing required fields: medicineId, medicalStoreId, variationId' });
    }

    const medicine = await prisma.medicine.findUnique({
      where: { id: Number(medicineId) },
    });

    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    const variation = await prisma.variation.findUnique({
      where: { id: Number(variationId) },
    });

    if (!variation || variation.medicineId !== Number(medicineId)) {
      return res.status(404).json({ error: 'Variation not found or not associated with this medicine' });
    }

    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: Number(medicalStoreId) },
    });

    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    const isSingleBatch = !batches || !Array.isArray(batches) || batches.length === 0;
    let totalBatchQuantity = 0;
    let batchDataArray = [];

    if (isSingleBatch) {
      if (!quantity || !mfgDate || !expiryDate || !price || !purchasePrice || !sellingPrice || !batchNo) {
        return res.status(400).json({
          error: 'For single batch, quantity, mfgDate, expiryDate, price, purchasePrice, sellingPrice, and batchNo are required',
        });
      }
      if (price < 0) {
        return res.status(400).json({ error: 'Price cannot be negative' });
      }
      if (!batchNo || typeof batchNo !== 'string' || batchNo.trim() === '') {
        return res.status(400).json({ error: 'batchNo is required and must be a non-empty string' });
      }
      totalBatchQuantity = quantity;
      batchDataArray = [{ quantity, mfgDate, expiryDate, price, purchasePrice, sellingPrice, location, rank, batchNo }];
    } else {
      totalBatchQuantity = batches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
      if (totalBatchQuantity === 0) {
        return res.status(400).json({ error: 'At least one batch with non-zero quantity is required' });
      }
      for (const batch of batches) {
        if (!batch.quantity || !batch.mfgDate || !batch.expiryDate || !batch.price || !batch.purchasePrice || !batch.sellingPrice || !batch.batchNo) {
          return res.status(400).json({
            error: 'Each batch must include quantity, mfgDate, expiryDate, price, purchasePrice, sellingPrice, and batchNo',
          });
        }
        if (batch.price < 0) {
          return res.status(400).json({ error: 'Batch price cannot be negative' });
        }
        if (!batch.batchNo || typeof batch.batchNo !== 'string' || batch.batchNo.trim() === '') {
          return res.status(400).json({ error: 'batchNo is required and must be a non-empty string for each batch' });
        }
      }
      if (quantity !== undefined && quantity !== totalBatchQuantity) {
        return res.status(400).json({
          error: `Provided quantity (${quantity}) must equal sum of batch quantities (${totalBatchQuantity})`,
        });
      }
      batchDataArray = batches;
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdBatches = [];
      const createdInstances = [];

      for (const batchData of batchDataArray) {
        const batch = await tx.batch.create({
          data: {
            batchNo: batchData.batchNo,
            mfgDate: new Date(batchData.mfgDate),
            expiryDate: new Date(batchData.expiryDate),
            quantity: batchData.quantity,
            price: batchData.price,
            variationId: Number(variationId),
          },
        });

        const medicineInstance = await tx.medicineInstance.create({
          data: {
            variationId: Number(variationId),
            batchId: batch.id,
            expiryDate: new Date(batchData.expiryDate),
            quantity: batchData.quantity,
            purchasePrice: batchData.purchasePrice,
            sellingPrice: batchData.sellingPrice,
          },
        });

        for (let i = 0; i < batchData.quantity; i++) {
          await tx.subUnit.create({
            data: {
              unitId: medicineInstance.id,
              name: `SubUnit-${i + 1}`,
              description: `SubUnit for ${medicine.name} (${variation.potency})`,
              unitType: variation.unitType,
              subUnitCount: variation.unitsPerPack,
              subUnitPrice: batchData.sellingPrice / variation.unitsPerPack,
            },
          });
        }

        if (batchData.location) {
          await tx.medicineLocation.create({
            data: {
              medicalStoreId: Number(medicalStoreId),
              medicineId: Number(medicineId),
              medicineInstanceId: medicineInstance.id,
              location: batchData.location,
              rank: batchData.rank ? String(batchData.rank) : null,
              quantity: batchData.quantity,
            },
          });
        }

        await tx.stockTransaction.create({
          data: {
            medicalStoreId: Number(medicalStoreId),
            medicineInstanceId: medicineInstance.id,
            quantity: batchData.quantity,
          },
        });

        createdBatches.push(batch);
        createdInstances.push(medicineInstance);
      }

      const medicalStoreMedicine = await tx.medicalStoreMedicine.findFirst({
        where: { medicalStoreId: Number(medicalStoreId), medicineId: Number(medicineId) },
      });

      if (medicalStoreMedicine) {
        await tx.medicalStoreMedicine.update({
          where: { id: medicalStoreMedicine.id },
          data: { quantity: medicalStoreMedicine.quantity + totalBatchQuantity },
        });
      } else {
        await tx.medicalStoreMedicine.create({
          data: {
            medicalStoreId: Number(medicalStoreId),
            medicineId: Number(medicineId),
            quantity: totalBatchQuantity,
          },
        });
      }

      const updatedStoreMedicine = await tx.medicalStoreMedicine.findFirst({
        where: { medicalStoreId: Number(medicalStoreId), medicineId: Number(medicineId) },
        select: { quantity: true },
      });

      if (updatedStoreMedicine.quantity <= medicine.minquantity) {
        const expiryDates = batchDataArray.map((batch) => ({
          expiryDate: new Date(batch.expiryDate),
          quantity: batch.quantity,
        }));

        for (const { expiryDate } of expiryDates) {
          await tx.medicineExpiry.upsert({
            where: {
              medicineId_expiryDate: {
                medicineId: Number(medicineId),
                expiryDate,
              },
            },
            update: { isNearExpiry: true },
            create: {
              medicineId: Number(medicineId),
              expiryDate,
              isNearExpiry: true,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: req.user?.id || 1,
          action: 'CREATE',
          entity: 'Stock',
          entityId: Number(medicineId),
          description: `Added ${totalBatchQuantity} units of medicine ID ${medicineId} to medical store ID ${medicalStoreId}`,
        },
      });

      return { batches: createdBatches, instances: createdInstances };
    });

    res.status(201).json({ message: 'Stock added successfully', data: result });
  } catch (error) {
    console.error('Error adding stock:', error.message);
    res.status(500).json({ error: 'Failed to add stock', details: error.message });
  }
}

// Sell medicine to customers, prioritizing earliest mfgDate (FIFO)
async function sellMedicine(req, res) {
  try {
    const { medicalStoreId, medicineId } = req.params;
    const { orderId, variationId, quantity, discountPrice, packing } = req.body;

    if (!medicalStoreId || !medicineId || !orderId || !variationId || !quantity) {
      return res.status(400).json({
        error: 'Missing required fields: medicalStoreId, medicineId, orderId, variationId, quantity',
      });
    }
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }

    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: Number(medicalStoreId) },
    });
    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    const medicine = await prisma.medicine.findUnique({
      where: { id: Number(medicineId) },
    });
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    const variation = await prisma.variation.findUnique({
      where: { id: Number(variationId) },
    });
    if (!variation || variation.medicineId !== Number(medicineId)) {
      return res.status(404).json({ error: 'Variation not found or not associated with this medicine' });
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const medicalStoreMedicine = await prisma.medicalStoreMedicine.findFirst({
      where: { medicalStoreId: Number(medicalStoreId), medicineId: Number(medicineId) },
    });
    if (!medicalStoreMedicine) {
      return res.status(404).json({ error: 'Medicine not associated with this medical store' });
    }

    if (medicalStoreMedicine.quantity < quantity) {
      return res.status(400).json({
        error: `Insufficient stock: requested ${quantity}, available ${medicalStoreMedicine.quantity}`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const subUnits = await tx.subUnit.findMany({
        where: {
          instance: {
            variationId: Number(variationId),
            quantity: { gt: 0 },
            expiryDate: { gt: new Date() },
          },
          isSold: false,
          isReturnedToSupplier: false,
        },
        include: {
          instance: {
            include: {
              batch: { select: { id: true, batchNo: true, mfgDate: true } },
              locations: {
                where: { medicalStoreId: Number(medicalStoreId) },
              },
            },
          },
        },
        orderBy: { instance: { batch: { mfgDate: 'asc' } } },
        take: quantity,
      });

      if (subUnits.length < quantity) {
        throw new Error(`Insufficient available SubUnits: requested ${quantity}, found ${subUnits.length}`);
      }

      const soldItems = [];

      for (const subUnit of subUnits) {
        const instance = subUnit.instance;

        await tx.subUnit.update({
          where: { id: subUnit.id },
          data: { isSold: true },
        });

        await tx.medicineInstance.update({
          where: { id: instance.id },
          data: { quantity: instance.quantity - 1 },
        });

        for (const location of instance.locations) {
          await tx.medicineLocation.update({
            where: { id: location.id },
            data: { quantity: location.quantity - 1 },
          });
        }

        await tx.stockTransaction.create({
          data: {
            medicalStoreId: Number(medicalStoreId),
            medicineInstanceId: instance.id,
            quantity: -1,
          },
        });

        const retailPrice = discountPrice || subUnit.subUnitPrice;
        const margin = retailPrice - (instance.purchasePrice / variation.unitsPerPack);

        const soldItem = await tx.soldItems.create({
          data: {
            orderId: Number(orderId),
            medicineId: Number(medicineId),
            batchId: instance.batchId,
            subUnitId: subUnit.id,
            packing,
            quantity: 1,
            retailPrice,
            discountPrice: discountPrice ? subUnit.subUnitPrice - discountPrice : null,
            margin,
          },
        });

        soldItems.push(soldItem);
      }

      await tx.medicalStoreMedicine.update({
        where: { id: medicalStoreMedicine.id },
        data: { quantity: medicalStoreMedicine.quantity - quantity },
      });

      const updatedStoreMedicine = await tx.medicalStoreMedicine.findFirst({
        where: { medicalStoreId: Number(medicalStoreId), medicineId: Number(medicineId) },
      });

      if (updatedStoreMedicine.quantity <= medicine.minquantity) {
        const expiryDates = await tx.medicineInstance.findMany({
          where: { variation: { medicineId: Number(medicineId) }, quantity: { gt: 0 } },
          select: { expiryDate: true },
        });

        for (const { expiryDate } of expiryDates) {
          await tx.medicineExpiry.upsert({
            where: {
              medicineId_expiryDate: {
                medicineId: Number(medicineId),
                expiryDate,
              },
            },
            update: { isNearExpiry: true },
            create: {
              medicineId: Number(medicineId),
              expiryDate,
              isNearExpiry: true,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: req.user?.id || 1,
          action: 'SALE',
          entity: 'Medicine',
          entityId: Number(medicineId),
          description: `Sold ${quantity} units of medicine ID ${medicineId} from medical store ID ${medicalStoreId}`,
        },
      });

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
    const { orderId, batchId, variationId, quantity, returnType, retailPrice, discountPrice, packing, batchNo } = req.body;

    if (!medicalStoreId || !medicineId || !orderId || !variationId || !quantity || !returnType || !retailPrice) {
      return res.status(400).json({
        error: 'Missing required fields: medicalStoreId, medicineId, orderId, variationId, quantity, returnType, retailPrice',
      });
    }
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }
    if (!['CUSTOMER_RETURN', 'COMPANY_RETURN'].includes(returnType)) {
      return res.status(400).json({ error: 'Invalid returnType: must be CUSTOMER_RETURN or COMPANY_RETURN' });
    }

    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: Number(medicalStoreId) },
    });
    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    const medicine = await prisma.medicine.findUnique({
      where: { id: Number(medicineId) },
    });
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    const variation = await prisma.variation.findUnique({
      where: { id: Number(variationId) },
    });
    if (!variation || variation.medicineId !== Number(medicineId)) {
      return res.status(404).json({ error: 'Variation not found or not associated with this medicine' });
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const medicalStoreMedicine = await prisma.medicalStoreMedicine.findFirst({
      where: { medicalStoreId: Number(medicalStoreId), medicineId: Number(medicineId) },
    });
    if (!medicalStoreMedicine) {
      return res.status(404).json({ error: 'Medicine not associated with this medical store' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let medicineInstance;
      const returnedSubUnits = [];

      if (returnType === 'CUSTOMER_RETURN') {
        if (batchId) {
          medicineInstance = await tx.medicineInstance.findFirst({
            where: {
              batchId: Number(batchId),
              variationId: Number(variationId),
            },
            include: {
              locations: {
                where: { medicalStoreId: Number(medicalStoreId) },
              },
            },
          });
        }

        if (!medicineInstance) {
          const batch = await tx.batch.findFirst({
            where: { batchNo: batchNo || null, variationId: Number(variationId) },
          });
          const expiryDate = batch ? batch.expiryDate : new Date();

          medicineInstance = await tx.medicineInstance.findFirst({
            where: {
              variationId: Number(variationId),
              expiryDate,
            },
            include: {
              locations: {
                where: { medicalStoreId: Number(medicalStoreId) },
              },
            },
          });

          if (!medicineInstance) {
            if (!batchNo || typeof batchNo !== 'string' || batchNo.trim() === '') {
              throw new Error('batchNo is required and must be a non-empty string for new batch creation');
            }
            const newBatch = await tx.batch.create({
              data: {
                batchNo,
                mfgDate: new Date(),
                expiryDate,
                quantity: 0,
                price: retailPrice * quantity,
                variationId: Number(variationId),
              },
            });

            medicineInstance = await tx.medicineInstance.create({
              data: {
                variationId: Number(variationId),
                batchId: newBatch.id,
                expiryDate,
                quantity: 0,
                purchasePrice: retailPrice,
                sellingPrice: retailPrice,
              },
            });
          }
        }

        for (let i = 0; i < quantity; i++) {
          const subUnit = await tx.subUnit.create({
            data: {
              unitId: medicineInstance.id,
              name: `SubUnit-Return-${i + 1}`,
              description: `Returned SubUnit for ${medicine.name} (${variation.potency})`,
              unitType: variation.unitType,
              subUnitCount: variation.unitsPerPack,
              subUnitPrice: retailPrice / variation.unitsPerPack,
              isSold: false,
              isReturnedByCustomer: true,
            },
          });
          returnedSubUnits.push(subUnit);
        }

        await tx.medicineInstance.update({
          where: { id: medicineInstance.id },
          data: { quantity: medicineInstance.quantity + quantity },
        });

        if (medicineInstance.locations.length > 0) {
          for (const location of medicineInstance.locations) {
            await tx.medicineLocation.update({
              where: { id: location.id },
              data: { quantity: location.quantity + quantity },
            });
          }
        } else {
          await tx.medicineLocation.create({
            data: {
              medicalStoreId: Number(medicalStoreId),
              medicineId: Number(medicineId),
              medicineInstanceId: medicineInstance.id,
              location: 'Default',
              quantity,
            },
          });
        }

        await tx.medicalStoreMedicine.update({
          where: { id: medicalStoreMedicine.id },
          data: { quantity: medicalStoreMedicine.quantity + quantity },
        });

        await tx.stockTransaction.create({
          data: {
            medicalStoreId: Number(medicalStoreId),
            medicineInstanceId: medicineInstance.id,
            quantity,
          },
        });
      } else {
        medicineInstance = await tx.medicineInstance.findFirst({
          where: {
            batchId: batchId ? Number(batchId) : null,
            variationId: Number(variationId),
            quantity: { gte: quantity },
          },
          include: {
            locations: {
              where: { medicalStoreId: Number(medicalStoreId) },
            },
            subunits: {
              where: { isSold: false, isReturnedToSupplier: false },
              take: quantity,
            },
          },
        });

        if (!medicineInstance || medicineInstance.subunits.length < quantity) {
          throw new Error('No suitable batch or SubUnits found for company return');
        }

        for (const subUnit of medicineInstance.subunits) {
          await tx.subUnit.update({
            where: { id: subUnit.id },
            data: { isReturnedToSupplier: true },
          });
          returnedSubUnits.push(subUnit);
        }

        await tx.medicineInstance.update({
          where: { id: medicineInstance.id },
          data: { quantity: medicineInstance.quantity - quantity },
        });

        for (const location of medicineInstance.locations) {
          await tx.medicineLocation.update({
            where: { id: location.id },
            data: { quantity: location.quantity - quantity },
          });
        }

        await tx.medicalStoreMedicine.update({
          where: { id: medicalStoreMedicine.id },
          data: { quantity: medicalStoreMedicine.quantity - quantity },
        });

        await tx.stockTransaction.create({
          data: {
            medicalStoreId: Number(medicalStoreId),
            medicineInstanceId: medicineInstance.id,
            quantity: -quantity,
          },
        });
      }

      const margin = discountPrice ? (retailPrice - discountPrice) * quantity : 0;
      const returnedItems = await Promise.all(
        returnedSubUnits.map((subUnit) =>
          tx.returnedItems.create({
            data: {
              orderId: Number(orderId),
              medicineId: Number(medicineId),
              batchId: medicineInstance.batchId,
              subUnitId: subUnit.id,
              packing,
              quantity: 1,
              retailPrice,
              discountPrice,
              margin: margin / quantity,
              returnType,
            },
          })
        )
      );

      const updatedStoreMedicine = await tx.medicalStoreMedicine.findFirst({
        where: { medicalStoreId: Number(medicalStoreId), medicineId: Number(medicineId) },
      });

      if (updatedStoreMedicine.quantity <= medicine.minquantity) {
        const expiryDates = await tx.medicineInstance.findMany({
          where: { variation: { medicineId: Number(medicineId) }, quantity: { gt: 0 } },
          select: { expiryDate: true },
        });

        for (const { expiryDate } of expiryDates) {
          await tx.medicineExpiry.upsert({
            where: {
              medicineId_expiryDate: {
                medicineId: Number(medicineId),
                expiryDate,
              },
            },
            update: { isNearExpiry: true },
            create: {
              medicineId: Number(medicineId),
              expiryDate,
              isNearExpiry: true,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: req.user?.id || 1,
          action: 'RETURN',
          entity: 'Medicine',
          entityId: Number(medicineId),
          description: `Returned ${quantity} units of medicine ID ${medicineId} (${returnType}) from medical store ID ${medicalStoreId}`,
        },
      });

      return { returnedItems };
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

    if (!medicalStoreId) {
      return res.status(400).json({ error: 'MedicalStoreId is required' });
    }

    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: Number(medicalStoreId) },
    });
    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    const now = new Date();
    const startExpiry = new Date(now);
    startExpiry.setMonth(now.getMonth() + 6);
    startExpiry.setHours(0, 0, 0, 0);
    const endExpiry = new Date(now);
    endExpiry.setMonth(now.getMonth() + 7);
    endExpiry.setHours(23, 59, 59, 999);

    const medicines = await prisma.medicine.findMany({
      where: {
        medicalStoreMedicines: {
          some: { medicalStoreId: Number(medicalStoreId) },
        },
        variations: {
          some: {
            instances: {
              some: {
                expiryDate: { gte: startExpiry, lte: endExpiry },
                quantity: { gt: 0 },
              },
            },
          },
        },
      },
      include: {
        medicalStoreMedicines: {
          where: { medicalStoreId: Number(medicalStoreId) },
          select: { quantity: true },
        },
        variations: {
          include: {
            instances: {
              where: {
                expiryDate: { gte: startExpiry, lte: endExpiry },
                quantity: { gt: 0 },
              },
              include: {
                batch: { select: { batchNo: true, mfgDate: true, price: true } },
                locations: {
                  where: { medicalStoreId: Number(medicalStoreId) },
                  select: { location: true, rank: true, quantity: true },
                },
                subunits: {
                  select: { id: true, subUnitCount: true, subUnitPrice: true, isSold: true },
                },
              },
            },
          },
        },
      },
    });

    if (!medicines.length) {
      return res.status(404).json({ error: 'No medicines with near-expiry batches found' });
    }

    res.status(200).json({
      message: 'Near-expiry medicines fetched successfully',
      data: medicines,
    });
  } catch (error) {
    console.error('Error fetching near-expiry medicines:', error.message);
    res.status(500).json({
      error: 'Failed to fetch near-expiry medicines',
      details: error.message,
    });
  }
}

// Get medicines with low stock
async function getLowStockMedicines(req, res) {
  try {
    const { medicalStoreId } = req.params;

    if (!medicalStoreId) {
      return res.status(400).json({ error: 'MedicalStoreId is required' });
    }

    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: Number(medicalStoreId) },
    });
    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    const medicines = await prisma.medicine.findMany({
      where: {
        medicalStoreMedicines: {
          some: {
            medicalStoreId: Number(medicalStoreId),
            quantity: { lte: prisma.medicine.fields.minquantity },
          },
        },
      },
      include: {
        medicalStoreMedicines: {
          where: { medicalStoreId: Number(medicalStoreId) },
          select: { quantity: true },
        },
        company: {
          select: { name: true },
        },
        variations: {
          select: { potency: true, packaging: true, unitType: true, unitsPerPack: true },
        },
      },
    });

    if (!medicines.length) {
      return res.status(404).json({ error: 'No low-stock medicines found' });
    }

    res.status(200).json({
      message: 'Low-stock medicines fetched successfully',
      data: medicines,
    });
  } catch (error) {
    console.error('Error fetching low-stock medicines:', error.message);
    res.status(500).json({
      error: 'Failed to fetch low-stock medicines',
      details: error.message,
    });
  }
}

// Get single earliest batch for sale (FIFO)
async function getSingleNearExpiryBatchForSale(req, res) {
  try {
    const { medicalStoreId } = req.params;

    if (!medicalStoreId) {
      return res.status(400).json({ error: 'MedicalStoreId is required' });
    }

    const medicalStore = await prisma.medicalStore.findUnique({
      where: { id: Number(medicalStoreId) },
    });
    if (!medicalStore) {
      return res.status(404).json({ error: 'Medical store not found' });
    }

    const today = new Date();

    // Find all medicine IDs for this store
    const storeMedicines = await prisma.medicalStoreMedicine.findMany({
      where: { medicalStoreId: Number(medicalStoreId) },
      select: { medicineId: true },
      distinct: ['medicineId'],
    });

    const result = [];

    for (const { medicineId } of storeMedicines) {
      // Find the earliest manufactured batch for this medicine
      const earliestBatchInstance = await prisma.medicineInstance.findFirst({
        where: {
          variation: { medicineId },
          expiryDate: { gt: today },
          quantity: { gt: 0 },
          subunits: {
            some: { isSold: false, isReturnedToSupplier: false },
          },
        },
        orderBy: { batch: { mfgDate: 'asc' } },
        include: {
          batch: { select: { batchNo: true, mfgDate: true } },
          variation: {
            include: { medicine: true },
          },
          subunits: {
            where: { isSold: false, isReturnedToSupplier: false },
          },
        },
      });

      if (
        earliestBatchInstance &&
        earliestBatchInstance.batch &&
        earliestBatchInstance.variation.medicine
      ) {
        // Get total quantity of this medicine in the store
        const quantityResult = await prisma.medicalStoreMedicine.findFirst({
          where: { medicalStoreId: Number(medicalStoreId), medicineId },
          select: { quantity: true },
        });
        const totalQuantity = quantityResult?.quantity || 0;

        // Get quantity of this specific batch
        const batchLocation = await prisma.medicineLocation.findFirst({
          where: {
            medicalStoreId: Number(medicalStoreId),
            medicineId,
            medicineInstanceId: earliestBatchInstance.id,
          },
        select: { quantity: true },
        });
        const batchQuantity = batchLocation ? batchLocation.quantity : 0;

        result.push({
          medicineName: earliestBatchInstance.variation.medicine.name,
          variation: {
            potency: earliestBatchInstance.variation.potency,
            packaging: earliestBatchInstance.variation.packaging,
            unitType: earliestBatchInstance.variation.unitType,
            unitsPerPack: earliestBatchInstance.variation.unitsPerPack,
          },
          batchNo: earliestBatchInstance.batch.batchNo,
          sellingPrice: earliestBatchInstance.sellingPrice,
          expiryDate: earliestBatchInstance.expiryDate,
          mfgDate: earliestBatchInstance.batch.mfgDate,
          totalQuantity,
          batchQuantity,
          availableSubUnits: earliestBatchInstance.subunits.length,
        });
      }
    }

    if (!result.length) {
      return res.status(404).json({
        message: 'No batches available for sale in this medical store',
      });
    }

    res.status(200).json({
      message: 'Earliest manufactured batches (one per medicine) fetched successfully for FIFO sale',
      data: result,
    });
  } catch (error) {
    console.error('Error fetching earliest batches for sale:', error.message);
    res.status(500).json({
      error: 'Failed to fetch earliest batches for sale',
      details: error.message,
    });
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
  getLowStockMedicines,
  getSingleNearExpiryBatchForSale,
};