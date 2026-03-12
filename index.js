const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 5000;

// ১. মিডলওয়্যার (CORS আপডেট করা হয়েছে)
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://vvsi.vercel.app", // আপনার লাইভ ফ্রন্টএন্ড লিঙ্কটি এখানে যোগ করা হয়েছে
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// প্রি-ফ্লাইট রিকোয়েস্ট হ্যান্ডেল করার জন্য (CORS এর জন্য জরুরি)
app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ২. ডাটাবেস কানেকশন
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

// ৪. সার্ভার লিসেন
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

module.exports = app;
