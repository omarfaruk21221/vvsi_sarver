const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 5000;

// ১. মিডলওয়্যার
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://vvsi.vercel.app",
    ], // আপনার ফ্রন্টএন্ড ইউআরএল দিন
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ২. ডাটাবেস কানেকশন (Mongoose)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB with Mongoose Connected");
  } catch (error) {
    console.error("❌ Database Connection Error:", error);
  }
};

connectDB();

// ৩. রাউট সেটআপ
app.use("/", require("./routes/user.routes"));
app.use("/", require("./routes/customer.routes"));

app.get("/", (req, res) => {
  res.send("Bhai Bhai Ice-Cream Server is Running with Mongoose");
});

// ৪. সার্ভার লিসেন (সব অবস্থার জন্য লিসেন রাখা ভালো লোকাল ডেভেলপমেন্টে)
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});

module.exports = app;
