const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    user_id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, default: "" },
    category: { type: String, default: "সাধারণ" },
    role: { type: String, default: "সাধারণ" },
    status: { type: String, default: "প্রসেসিং" },
    // বিস্তারিত তথ্য আপনার দেওয়া প্রোফাইল ডাটা অনুযায়ী
    fatherName: String,
    motherName: String,
    dob: String,
    address: String,
    nidNumber: String,
    nidPdfFornt: String,
    nidPdfBackpart: String,
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
