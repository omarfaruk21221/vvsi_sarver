const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer.model");

// ১. কাস্টমার যোগ করা
router.post("/add_customers", async (req, res) => {
  try {
    const body = req.body;

    // মোবাইল নম্বর চেক (Mongoose স্টাইলে)
    const exist = await Customer.findOne({ mobile: body.mobile });
    if (exist) {
      return res.status(400).send({
        success: false,
        message: "ইতিমধ্যে নিবন্ধিত আছে",
      });
    }

    // নতুন কাস্টমার অবজেক্ট তৈরি
    const newCustomer = new Customer({
      ...body,
      cust_id: Number(body.cust_id),
      status: "Active", // আপনার আগের লজিক অনুযায়ী 'প্রসেসিং' বদলে সরাসরি 'Active'
    });

    await newCustomer.save();
    res.status(201).send({ success: true, message: "গ্রাহক যোগ করা হয়েছে" });
  } catch (err) {
    res.status(500).send({ success: false, message: err.message });
  }
});

// ২. কাস্টমার লিস্ট (Pagination & Search)
router.get("/customers", async (req, res) => {
  try {
    const { search, sort, page, limit } = req.query;

    // সার্চ কোয়েরি তৈরি
    let query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { mobile: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    // ডাটা খুঁজে আনা
    const customers = await Customer.find(query)
      .sort({ createdAt: sort === "asc" ? 1 : -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    // মোট কাস্টমার সংখ্যা
    const totalCount = await Customer.countDocuments(query);

    // ফ্রন্টএন্ডে আগের ফরম্যাটেই ডাটা পাঠানো
    res.send({
      data: customers,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
    });
  } catch (error) {
    res.status(500).send({ message: "সার্ভারে সমস্যা" });
  }
});

// ৩. ম্যাক্স কাস্টমার আইডি (অটোমেটিক আইডি জেনারেট করার জন্য)
router.get("/max_cust_id", async (req, res) => {
  try {
    const result = await Customer.findOne().sort({ cust_id: -1 });
    const maxId = result ? result.cust_id : 0;
    res.send(maxId.toString());
  } catch (err) {
    res.status(500).send({ message: "Server error" });
  }
});

// ৪. কাস্টমার আপডেট
router.patch("/update_customer/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    // _id ফিল্ডটি সরিয়ে ফেলা যেন আপডেটে সমস্যা না হয়
    const { _id, ...cleanData } = updatedData;

    // Mongoose সরাসরি ID দিয়ে আপডেট করে এবং নতুন ডাটা রিটার্ন করে
    const result = await Customer.findByIdAndUpdate(
      id,
      { $set: cleanData },
      { new: true },
    );

    if (!result) return res.status(404).send({ message: "গ্রাহক পাওয়া যায়নি" });

    res.send({ success: true, message: "সফলভাবে আপডেট হয়েছে", data: result });
  } catch (error) {
    res.status(500).send({ message: "সার্ভার এরর" });
  }
});

// ৫. ডিলিট কাস্টমার
router.delete("/delete_customer/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await Customer.findByIdAndDelete(id);

    if (!result)
      return res.status(404).send({ message: "গ্রাহক খুঁজে পাওয়া যায়নি" });

    res.send({ success: true, message: "সফলভাবে ডিলিট হয়েছে" });
  } catch (error) {
    res.status(500).send({ message: "ডিলিট এরর" });
  }
});

module.exports = router;
