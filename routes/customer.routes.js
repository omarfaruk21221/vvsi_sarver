const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer.model");

// ১. কাস্টমার যোগ করা
router.post("/add_customers", async (req, res) => {
  try {
    const body = req.body;

    // মোবাইল নম্বর চেক
    const exist = await Customer.findOne({ mobile: body.mobile });
    if (exist) {
      return res.status(400).send({
        success: false,
        message: "ইতিমধ্যে নিবন্ধিত আছে",
      });
    }

    // নতুন কাস্টমার অবজেক্ট তৈরি (Spread অপারেটর ঠিক আছে, কারণ ফ্রন্টএন্ড থেকে details অবজেক্ট আসছে)
    const newCustomer = new Customer(body);

    await newCustomer.save();
    res.status(201).send({ success: true, message: "গ্রাহক যোগ করা হয়েছে" });
  } catch (err) {
    // ডুপ্লিকেট কি (cust_id) এরর হ্যান্ডলিং
    if (err.code === 11000) {
      return res.status(400).send({
        success: false,
        message: "এই কাস্টমার আইডি বা মোবাইল নম্বর ইতিমধ্যে ব্যবহৃত",
      });
    }
    res.status(500).send({ success: false, message: err.message });
  }
});

// ২. কাস্টমার লিস্ট (Pagination & Search)
router.get("/customers", async (req, res) => {
  try {
    const { search, sort, page, limit } = req.query;

    let query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { mobile: { $regex: search, $options: "i" } },
            { "details.nidNumber": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    const customers = await Customer.find(query)
      .sort({ createdAt: sort === "asc" ? 1 : -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const totalCount = await Customer.countDocuments(query);

    res.send({
      data: customers,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error) {
    res.status(500).send({ message: "সার্ভারে সমস্যা" });
  }
});

// ৩. ম্যাক্স কাস্টমার আইডি
router.get("/max_cust_id", async (req, res) => {
  try {
    const result = await Customer.findOne().sort({ cust_id: -1 });
    const maxId = result ? result.cust_id : 0;
    res.send(maxId.toString());
  } catch (err) {
    res.status(500).send({ message: "Server error" });
  }
});

// ৪. কাস্টমার আপডেট (খুবই গুরুত্বপূর্ণ পরিবর্তন এখানে)
router.patch("/update_customer/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const { _id, ...cleanData } = updatedData;

    // মঙ্গুস নেস্টেড অবজেক্ট (details) আপডেট করার সময় অনেক সময় পুরো অবজেক্ট মুছে দেয়।
    // তাই সরাসরি $set ব্যবহার করা নিরাপদ।
    const result = await Customer.findByIdAndUpdate(
      id,
      { $set: cleanData },
      { new: true, runValidators: true }, // রান ভ্যালিডেটরস দিলে স্কিমা চেক হবে
    );

    if (!result)
      return res.status(404).send({ message: "গ্রাহক পাওয়া যায়নি" });

    res.send({ success: true, message: "সফলভাবে আপডেট হয়েছে", data: result });
  } catch (error) {
    res.status(500).send({ message: error.message || "সার্ভার এরর" });
  }
});

// ৫. ডিলিট কাস্টমার
router.delete("/delete_customer/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await Customer.findByIdAndDelete(id);

    if (!result)
      return res.status(404).send({ message: "গ্রাহক খুঁজে পাওয়া যায়নি" });

    res.send({ success: true, message: "সফলভাবে ডিলিট হয়েছে" });
  } catch (error) {
    res.status(500).send({ message: "ডিলিট এরর" });
  }
});

module.exports = router;
