require("dotenv").config();
const express = require("express");
const mongoose = require("./db/connection");
const loanRoutes = require("./routes/loanRoutes");
const cors = require("cors");

const app = express();

// CORS middleware, batasi origin ke localhost:3000 (frontend kamu)
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

// Middleware untuk parsing JSON request body
app.use(express.json());

// Routing loan API
app.use("/loan", loanRoutes);

// Jalankan server di PORT dari env atau default 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Bank backend running on port ${PORT}`);
});
