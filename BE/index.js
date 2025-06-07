require("dotenv").config();
const express = require("express");
const mongoose = require("./db/connection");
const loanRoutes = require("./routes/loanRoutes");
const cors = require("cors");

const app = express();

// CORS middleware
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

// Middleware untuk parsing JSON
app.use(express.json());

// Middleware untuk logging requests (debugging)
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`, req.body ? req.body : '');
  next();
});

// Routing loan API
app.use("/loan", loanRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Bank backend running on port ${PORT}`);
  console.log(`📡 CORS enabled for: http://localhost:3000`);
});

// Test routes manually
console.log("💡 Available routes:");
console.log("  GET    /loan");
console.log("  POST   /loan");
console.log("  PATCH  /loan/:id/approve");
console.log("  PATCH  /loan/:id/reject");
console.log("  PATCH  /loan/pay/:username");
console.log("  DELETE /loan/:username");