require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");

const app = express();
app.use(express.json());

connectDB();

app.use("/auth", require("./routes/authRoutes"));
app.use("/quiz", require("./routes/quizRoutes"));

app.listen(5000, () => console.log("🚀 Server running on port 5000"));
