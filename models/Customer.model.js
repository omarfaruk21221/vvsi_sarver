const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    cust_id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true },
    boxApplication: { type: String, default: "না" },
    role: {
      type: String,
      enum: ["হকার", "সেলসম্যান", "সাধারণ"],
      default: "সাধারণ",
    },
    status: { type: String, default: "pending" },
    current_due: { type: Number, default: 0 },
    details: {
      fatherName: { type: String, default: "" },
      motherName: { type: String, default: "" },
      dob: { type: String, default: "" },
      address: { type: String, default: "" },
      image: { type: String, default: "" },
      nidNumber: { type: String, default: "" },
      nidPdfFornt: { type: String, default: "" },
      nidPdfBackpart: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Customer", customerSchema);
