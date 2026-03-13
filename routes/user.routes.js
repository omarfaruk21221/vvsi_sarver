const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// আপনার তৈরি করা মিডলওয়্যার ইমপোর্ট করুন (পাথ ঠিক আছে কি না নিশ্চিত হয়ে নিন)
const verifyToken = require("../middleware/authMiddleware");
const User = require("../models/User.model");

// --- ১. রেজিস্ট্রেশন ---
router.post("/register", async (req, res) => {
  try {
    const { mobile, password, details, ...otherData } = req.body;

    const exist = await User.findOne({ mobile });
    if (exist) {
      return res.status(400).send({
        success: false,
        message: "এই মোবাইল নম্বর দিয়ে পূর্বেই অ্যাকাউন্ট আছে",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      ...otherData,
      mobile,
      password: hashedPassword,
      details,
      status: "প্রসেসিং",
    });

    await newUser.save();
    res.status(201).json({
      success: true,
      message: "নিবন্ধন সফলভাবে সম্পন্ন হয়েছে",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- ২. লগইন ---
router.post("/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const user = await User.findOne({ mobile });

    if (!user)
      return res.status(404).json({ message: "অ্যাকাউন্ট পাওয়া যায়নি" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ message: "ভুল পাসওয়ার্ড" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" },
    );

    res.json({
      success: true,
      token,
      user: { name: user.name, image: user.image },
    });
  } catch (err) {
    res.status(500).json({ message: "সার্ভারে সমস্যা" });
  }
});

// --- ৩. নিজের প্রোফাইল ডাটা পাওয়া (টোকেন ভিত্তিক) ---
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "ইউজার পাওয়া যায়নি" });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "সার্ভারে সমস্যা", error: err.message });
  }
});

// --- ৪. ইউজার লিস্ট (Pagination & Search) ---
router.get("/users", verifyToken, async (req, res) => {
  try {
    const { status, search, sort, page, limit } = req.query;
    let query = status ? { status } : {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: sort === "asc" ? 1 : -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const totalCount = await User.countDocuments(query);
    res.send({
      data: users,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    res.status(500).send({ message: "সার্ভারে সমস্যা" });
  }
});

// --- ৫. আইডি দিয়ে স্ট্যাটাস আপডেট ---
router.patch("/update_user/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await User.findByIdAndUpdate(id, { status }, { new: true });
    if (!result)
      return res.status(404).send({ message: "ইউজার পাওয়া যায়নি" });

    res.send({ success: true, message: "আপডেট হয়েছে" });
  } catch (error) {
    res.status(500).send({ message: "সার্ভারে সমস্যা" });
  }
});

// --- ৬. ম্যাক্স ইউজার আইডি ---
router.get("/max-user-id", async (req, res) => {
  try {
    const result = await User.findOne().sort({ user_id: -1 });
    const maxUserId = result ? result.user_id : 0;
    res.send(maxUserId.toString());
  } catch {
    res.status(500).send({ message: "Server error" });
  }
});

// --- ৭. মোবাইল নম্বর দিয়ে ডাটা (যদি প্রয়োজন হয়, তবে /me ব্যবহার করা উত্তম) ---
router.get("/users/:mobile", verifyToken, async (req, res) => {
  try {
    const mobile = req.params.mobile;
    const user = await User.findOne({ mobile }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "ইউজার পাওয়া যায়নি" });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "সার্ভারে সমস্যা", error: err.message });
  }
});

module.exports = router;
