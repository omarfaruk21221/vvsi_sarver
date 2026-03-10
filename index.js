const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose"); // Mongoose ইমপোর্ট

const app = express();
const port = process.env.PORT || 5000;

// ১. মিডলওয়্যার
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ২. ডাটাবেস কানেকশন (Mongoose)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI); // আপনার ডট এনভ ফাইল থেকে লিঙ্ক নিবে
    console.log("✅ MongoDB with Mongoose Connected");
  } catch (error) {
    console.error("❌ Database Connection Error:", error);
    process.exit(1);
  }
};

connectDB();

// ৩. রাউট সেটআপ
// যেহেতু মঙ্গুজ ব্যবহার করছি, তাই রাউট ফাইলে (db) পাস করার দরকার নেই
app.use("/", require("./routes/user.routes"));
app.use("/", require("./routes/customer.routes"));

app.get("/", (req, res) => {
  res.send("Bhai Bhai Ice-Cream Server is Running with Mongoose");
});

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => console.log(`🚀 Server ready on port ${port}`));
}

module.exports = app;
