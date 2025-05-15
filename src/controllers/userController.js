const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize Prisma client
const prisma = new PrismaClient();

// Function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
       id: user.id, 
       role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// Function to generate a unique employeeId
const generateEmployeeId = (prefix) => {
  const letters = prefix.toUpperCase(); // Prefix: e.g., "SA" for SuperAdmin, "EM" for Employee, "AD" for Admin
  const numbers = Math.floor(100000 + Math.random() * 900000).toString().slice(-4); // Generate 4 random digits
  return `${letters}${numbers}`; // Combine letters and numbers (e.g., "SA1234")
};

// Login function
const login = async (req, res) => {
  const { email, employeeId, password } = req.body;

  try {
    // Find user by email or employeeId
    let user;
    if (email) {
      user = await prisma.user.findUnique({
        where: { email },
        include: {
          medicalStore: true,  // Assuming there's a relation with the medical store
        },
      });
    } else if (employeeId) {
      user = await prisma.user.findUnique({
        where: { employeeId },
        include: {
          medicalStore: true,  // Assuming there's a relation with the medical store
        },
      });
    }

    // If user is not found
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if the password is valid
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email/employeeId or password.' });
    }

    // Check if the user is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'User is deactivated.' });
    }

    // Generate token and return user data without redundant medicalStore
    const token = generateToken(user);
    res.json({ token, user: { ...user, medicalStore: user.medicalStore } });  // Only include medicalStore once
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


  // Create SuperAdmin function
  const createSuperAdmin = async (req, res) => {
    const { name, email, password, address } = req.body;
  
    if (!address) {
      return res.status(400).json({ error: "Address is required." });
    }
  
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create SuperAdmin
      const superAdmin = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'SUPERADMIN',
          address,
          city: '',
          phoneNumber: '',
          employeeId: generateEmployeeId('SA'),
        },
      });
  
      res.status(201).json(superAdmin);
    } catch (error) {
      // Handle known Prisma errors
      if (error.code === 'P2002') {
        // Unique constraint failed
        return res.status(409).json({
          error: `This email is already registered. Please use a different email to create a SuperAdmin.`,
        });
      }
  
      // Fallback for unknown errors
      console.error('Create SuperAdmin Error:', error);
      res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  };
  

// Get all SuperAdmins function
const getAllSuperAdmins = async (req, res) => {
  try {
    // Fetch all SUPERADMIN users
    const superAdmins = await prisma.user.findMany({
      where: {
        role: 'SUPERADMIN',
      },
    });

    // Count total SUPERADMINs
    const total = await prisma.user.count({
      where: {
        role: 'SUPERADMIN',
      },
    });

    // Count active SUPERADMINs
    const active = await prisma.user.count({
      where: {
        role: 'SUPERADMIN',
        isActive: true,
      },
    });

    // Count deactive SUPERADMINs
    const deactive = await prisma.user.count({
      where: {
        role: 'SUPERADMIN',
        isActive: false,
      },
    });

    res.status(200).json({
      totalSuperAdmins: total,
      activeSuperAdmins: active,
      deactiveSuperAdmins: deactive,
      superAdmins,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Update SuperAdmin by ID function
const updateSuperAdminById = async (req, res) => {
  const { id } = req.params;
  const { name, email, address, city, phoneNumber, isActive } = req.body;

  try {
    // Update the superadmin by ID
    const updatedSuperAdmin = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        address,
        city,
        phoneNumber,
        isActive, // Update active/deactivate state
      },
    });

    res.status(200).json(updatedSuperAdmin);
  } catch (error) {
    if (error.code === 'P2025') {
      // Handle case where superadmin is not found
      res.status(404).json({ error: "SuperAdmin not found." });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

// Create Admin function
const createAdmin = async (req, res) => {
    const {
        name,
        email,
        password,
        medicalStoreDetails, // Contains only medical store-specific details
        address,
        city,
        phoneNumber,
    } = req.body;

    try {
        // Validate medicalStoreDetails
        if (
            !medicalStoreDetails ||
            !medicalStoreDetails.name ||
            !medicalStoreDetails.address ||
            !medicalStoreDetails.licenseNumber ||
            !medicalStoreDetails.phoneNumber ||
            !medicalStoreDetails.ntnNumber
        ) {
            return res.status(400).json({
                error: 'Medical store details are required and must include name, address, licenseNumber, phoneNumber, and ntnNumber.',
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create Admin and their Medical Store
        const admin = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'ADMIN',
                address,
                city,
                phoneNumber,
                employeeId: generateEmployeeId('AD'), // Generate a unique employeeId with the prefix "AD"
                medicalStore: {
                    create: {
                        name: medicalStoreDetails.name,
                        address: medicalStoreDetails.address,
                        licenseNumber: medicalStoreDetails.licenseNumber,
                        phoneNumber: medicalStoreDetails.phoneNumber,
                        ntnNumber: medicalStoreDetails.ntnNumber,
                    },
                },
            },
            include: {
                medicalStore: true, // Include the medicalStore relationship in the response
            },
        });

        res.status(201).json(admin);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all Admins function
const getAllAdmins = async (req, res) => {
  try {
    // Fetch all ADMIN users with their associated medical store info
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
      },
      include: {
        medicalStore: {
          select: {
            id: true,
            name: true,
            address: true,
            licenseNumber: true,
          },
        },
      },
    });

    // Count total ADMINs
    const total = await prisma.user.count({
      where: {
        role: 'ADMIN',
      },
    });

    // Count active ADMINs
    const active = await prisma.user.count({
      where: {
        role: 'ADMIN',
        isActive: true,
      },
    });

    // Count deactive ADMINs
    const deactive = await prisma.user.count({
      where: {
        role: 'ADMIN',
        isActive: false,
      },
    });

    res.status(200).json({
      totalAdmins: total,
      activeAdmins: active,
      deactiveAdmins: deactive,
      admins,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Update Admin by ID function
const updateAdminById = async (req, res) => {
  const { id } = req.params;
  const { name, email, address, city, phoneNumber, isActive } = req.body;

  try {
      // Update the admin by ID
      const updatedAdmin = await prisma.user.update({
          where: { id: parseInt(id) },
          data: {
              name,
              email,
              address,
              city,
              phoneNumber,
              isActive, // Update active/deactivate state
          },
          include: {
            medicalStore: {
              select: {
                id: true,
                name: true,
                address: true,
                licenseNumber: true,
              },
            },
          },
      });

      res.status(200).json(updatedAdmin);
  } catch (error) {
      if (error.code === 'P2025') {
          // Handle case where admin is not found
          res.status(404).json({ error: "Admin not found." });
      } else {
          res.status(500).json({ error: error.message });
      }
  }
};

// Create Employee function
const createEmployee = async (req, res) => {
  const { name, email, password, address, city, phoneNumber } = req.body;

  try {
    // Extract parentId (Admin ID) from the token
    const parentId = req.user.id;

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only Admins can register employees.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Employee
    const employee = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'EMPLOYEE',
        address,
        city,
        phoneNumber,
        parentId,
        employeeId: generateEmployeeId('EM'), // Generate a unique employeeId with the prefix "EM"
      },
    });

    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all Employees function (filtered by logged-in user's employees)
const getAllEmployees = async (req, res) => {
  try {
    const loggedInUserId = req.user.id; // Assuming `req.user` contains the logged-in user's info

    // Fetch EMPLOYEE users where parentId matches the logged-in user's ID
    const employees = await prisma.user.findMany({
      where: {
        role: 'EMPLOYEE',
        parentId: loggedInUserId, // Filter by parentId
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
            medicalStore: {
              select: {
                id: true,
                name: true,
                address: true,
                licenseNumber: true,
              },
            },
          },
        },
      },
    });

    // Count total EMPLOYEEs for the logged-in user
    const total = await prisma.user.count({
      where: {
        role: 'EMPLOYEE',
        parentId: loggedInUserId, // Filter by parentId
      },
    });

    // Count active EMPLOYEEs for the logged-in user
    const active = await prisma.user.count({
      where: {
        role: 'EMPLOYEE',
        isActive: true,
        parentId: loggedInUserId, // Filter by parentId
      },
    });

    // Count deactive EMPLOYEEs for the logged-in user
    const deactive = await prisma.user.count({
      where: {
        role: 'EMPLOYEE',
        isActive: false,
        parentId: loggedInUserId, // Filter by parentId
      },
    });

    res.status(200).json({
      totalEmployees: total,
      activeEmployees: active,
      deactiveEmployees: deactive,
      employees,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Update Employee by ID function
const updateEmployeeById = async (req, res) => {
  const { id } = req.params;
  const { name, email, address, city, phoneNumber, isActive } = req.body;

  try {
    // Update the employee by ID
    const updatedEmployee = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        address,
        city,
        phoneNumber,
        isActive, 
      },
      include: {
        parent: {
          include: {
            medicalStore: true, // ✅ Include the medical store of the admin
          },
        },
      },
    });

    res.status(200).json(updatedEmployee);
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: "Employee not found." });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = { login,

  createSuperAdmin,
  getAllSuperAdmins,
  updateSuperAdminById,

  createAdmin,
  getAllAdmins,
  updateAdminById,

  createEmployee,
  getAllEmployees,
  updateEmployeeById,
}; 