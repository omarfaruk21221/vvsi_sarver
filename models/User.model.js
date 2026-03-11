const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    user_id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, default: "" },
    role: { type: String, default: "সাধারণ" },
    status: { type: String, default: "প্রসেসিং" },
    details: {
      fatherName: String,
      motherName: String,
      dob: String,
      address: String,
      nidNumber: String,
      nidPdfFornt: String,
      nidPdfBackpart: String,
    },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
