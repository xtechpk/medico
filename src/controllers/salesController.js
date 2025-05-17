const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


async function createSale(req, res) {
    try {
        const {
            medicalStoreId,
            customerName,
            customerContact,
            discountRate,
            discountAmount,
            initialPrice,
            finalPrice,
            medicines,
        } = req.body;

        if (
            !medicalStoreId ||
            !Array.isArray(medicines) ||
            medicines.length === 0 ||
            discountRate < 0 || discountRate > 100 ||
            !initialPrice || !finalPrice || !discountAmount
        ) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        const medicalStore = await prisma.medicalStore.findUnique({
            where: { id: medicalStoreId },
        });

        if (!medicalStore) {
            return res.status(400).json({ error: 'Medical store not found' });
        }

        let soldItems = [];
        let totalProfit = 0;

        for (const med of medicines) {
            const { medicineId, quantity } = med;
            let remainingQty = quantity;

            // Fetch all medicine instances with available stock
            const instances = await prisma.medicineInstance.findMany({
                where: {
                    medicineId,
                    quantity: { gt: 0 },
                },
                orderBy: { expiryDate: 'asc' }, // Sell earliest expiry first
            });

            for (const instance of instances) {
                if (remainingQty === 0) break;

                const sellQty = Math.min(instance.quantity, remainingQty);
                const sellingPrice = instance.sellingPrice;
                const purchasePrice = instance.purchasePrice;
                const margin = sellingPrice - purchasePrice;
                const discountPrice = sellingPrice * (1 - discountRate / 100);

                soldItems.push({
                    medicineId,
                    batchId: instance.batchId,
                    quantity: sellQty,
                    retailPrice: sellingPrice,
                    discountPrice,
                    margin,
                    saleDate: new Date(),
                });

                totalProfit += (margin + (sellingPrice - discountPrice)) * sellQty;

                // Update stock
                await prisma.medicineInstance.update({
                    where: { id: instance.id },
                    data: { quantity: instance.quantity - sellQty },
                });

                await prisma.medicalStoreMedicine.updateMany({
                    where: {
                        medicineId,
                        medicalStoreId,
                    },
                    data: {
                        quantity: { decrement: sellQty },
                    },
                });

                remainingQty -= sellQty;
            }

            if (remainingQty > 0) {
                return res.status(400).json({
                    error: `Insufficient stock for medicine ID ${medicineId}. Requested: ${quantity}, Available: ${quantity - remainingQty}`,
                });
            }
        }

        const order = await prisma.order.create({
            data: {
                userId: medicalStore.ownerId,
                customerName,
                customerContact,
                paymentMethod: 'CASH',
                discount: discountAmount,
                discountType: discountRate > 0 ? 'CUSTOMER_DEMAND' : null,
                itemsCost: initialPrice,
                tax: 0,
                sellingPrice: finalPrice,
                profit: totalProfit,
                bill: finalPrice,
                invoiceDate: new Date(),
                status: 'Paid',
                soldItems: {
                    create: soldItems,
                },
            },
        });

        await prisma.auditLog.create({
            data: {
                userId: medicalStore.ownerId,
                action: 'CREATE',
                entity: 'Order',
                entityId: order.id,
                description: `Sale created with ${soldItems.length} items`,
            },
        });

        return res.status(201).json({
            message: 'Sale created successfully',
            order: {
                id: order.id,
                initialPrice,
                discountRate,
                discountAmount,
                finalPrice,
                profit: totalProfit,
                soldItems: soldItems.map(item => ({
                    medicineId: item.medicineId,
                    quantity: item.quantity,
                    sellingPrice: item.retailPrice,
                    discountPrice: item.discountPrice,
                    batchId: item.batchId,
                })),
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


//  get all sold items  
async function getAllSoldItems(req, res) {
    try {
        const { medicalStoreId } = req.query;

        // Build query conditions
        const where = {};
        if (medicalStoreId) {
            const storeId = parseInt(medicalStoreId, 10);
            if (isNaN(storeId)) {
                return res.status(400).json({ error: 'Invalid medicalStoreId' });
            }
            where.order = {
                user: {
                    medicalStoreId: storeId,
                },
            };
        }

        // Fetch all sold items
        const soldItems = await prisma.soldItems.findMany({
            where,
            include: {
                medicine: {
                    select: {
                        name: true,
                    },
                },
                order: {
                    select: {
                        id: true,
                        customerName: true,
                        invoiceDate: true,
                    },
                },
                batch: {
                    select: {
                        serial: true,
                        expiryDate: true,
                    },
                },
            },
            orderBy: {
                saleDate: 'desc',
            },
        });

        return res.status(200).json({
            message: 'Sold items retrieved successfully',
            data: soldItems.map(item => ({
                id: item.id,
                medicineId: item.medicineId,
                medicineName: item.medicine.name,
                quantity: item.quantity,
                retailPrice: item.retailPrice,
                discountPrice: item.discountPrice,
                margin: item.margin,
                saleDate: item.saleDate,
                batchId: item.batchId,
                batchSerial: item.batch?.serial,
                batchExpiryDate: item.batch?.expiryDate,
                orderId: item.order.id,
                customerName: item.order.customerName,
                invoiceDate: item.order.invoiceDate,
            })),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


module.exports = {
    createSale,
    getAllSoldItems
};

