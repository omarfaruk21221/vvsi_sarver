const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  cust_id: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true // নামের আগে-পিছে ফাঁকা জায়গা থাকলে কেটে দিবে
  },
  mobile: { 
    type: String, 
    required: true, 
    unique: true 
  },
  category: { 
    type: String, 
    enum: ["হকার", "সেলসম্যান"], 
    required: true 
  },
  status: { 
    type: String, 
    default: "Active" 
  },
  current_due: { 
    type: Number, 
    default: 0 
  },
  // বিস্তারিত তথ্য (Nested Object)
  details: {
    fatherName: { type: String, default: "" },
    motherName: { type: String, default: "" },
    dob: { type: String, default: "" },
    address: { type: String, default: "" },
    image: { type: String, default: "" }, // ছবির URL
    nidNumber: { type: String, default: "" },
    nidPdf: { type: String, default: "" } // NID ফাইলের URL
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true }); // এটি অটোমেটিক 'updatedAt' ফিল্ড তৈরি করবে

module.exports = mongoose.model('Customer', customerSchema);