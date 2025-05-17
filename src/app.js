const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express App
const app = express();
// Configure CORS
const allowedOrigins = [
  'https://localhost:5173', // Local Frontend
  'https://localhost:5174', // Production Frontend
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g., mobile apps or Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true); // Origin is allowed
    } else {
      callback(new Error('Not allowed by CORS')); // Origin is not allowed
    }
  },
  credentials: true, // Allow cookies and credentials
}));
app.use(bodyParser.json());

// Import Routes
const userRoutes = require('./routes/userRoutes');
const medicalStoreRoutes = require('./routes/medicalStoreRoutes');
const companyRoutes = require('./routes/companyRoutes'); // Import company routes
const medicineRoutes = require('./routes/medicineRoute');
const analysisRoutes = require('./routes/analysisRoutes');
const salesRoutes = require('./routes/salesRoutes');


// Register Routes
app.use('/api/users', userRoutes);
app.use('/api/stores', medicalStoreRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/sales', salesRoutes);



// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});