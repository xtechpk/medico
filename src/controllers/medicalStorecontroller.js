const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getMedicalStores = async (req, res) => {
  try {
    const stores = await prisma.medicalStore.findMany();
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createMedicalStore = async (req, res) => {
  const { name, address, licenseNumber, phone } = req.body;

  try {
    const store = await prisma.medicalStore.create({
      data: {
        name,
        address,
        licenseNumber,
        phone,
        ownerId: req.user.id,
      },
    });

    res.status(201).json(store);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getMedicalStores, createMedicalStore };