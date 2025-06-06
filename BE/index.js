require("dotenv").config();
const express = require("express");
const mongoose = require("./db/connection");
const loanRoutes = require("./routes/loanRoutes");

const app = express();
app.use(express.json());
app.use("/loan", loanRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Bank backend running on port ${PORT}`);
});
