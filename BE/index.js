require("dotenv").config();
const express = require("express");
const mongoose = require("./db/connection");
const loanRoutes = require("./routes/loan");

const app = express();
app.use(express.json());
app.use("/loan", loanRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bank backend running on port ${PORT}`);
});
