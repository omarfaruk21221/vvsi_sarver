const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// ১. 'uploads' ফোল্ডার চেক ও তৈরি (গ্রাহক ও ইউজার উভয়ের জন্য)
if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

// ২. মিডলওয়্যার
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// ৩. Multer কনফিগারেশন (ফাইল সেভ করার জন্য)
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ৪. মঙ্গোডিবি কানেকশন
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function main() {
  try {
    await client.connect();
    const db = client.db("bhai_bhai_icecream_DB");
    const userCollection = db.collection("users");
    const customerCollection = db.collection("customers");
    console.log("✅ Connected to MongoDB");

    // --- ৫. রেজিস্ট্রেশন এপিআই ---
    app.post("/register", upload.single("image"), async (req, res) => {
      try {
        const { username, mobile, password } = req.body;
        const exist = await userCollection.findOne({ mobile });
        if (exist)
          return res
            .status(400)
            .json({ message: "এই নম্বর দিয়ে অ্যাকাউন্ট আছে" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const imageUrl = req.file
          ? `http://localhost:5000/uploads/${req.file.filename}`
          : "";

        await userCollection.insertOne({
          username,
          mobile,
          password: hashedPassword,
          image: imageUrl,
          role: "manager",
          createdAt: new Date(),
        });
        res
          .status(201)
          .json({ success: true, message: "Registration successful" });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    });

    // --- ৬. লগইন এপিআই ---
    app.post("/login", async (req, res) => {
      try {
        const { mobile, password } = req.body;
        const user = await userCollection.findOne({ mobile });
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
          user: {
            username: user.username,
            mobile: user.mobile,
            image: user.image,
          },
        });
      } catch (err) {
        res.status(500).json({ message: "সার্ভারে সমস্যা" });
      }
    });

    // --- ৭. নতুন গ্রাহক যোগ করার এপিআই (ADD CUSTOMER) ---
    app.post(
      "/add_customers",
      upload.fields([
        { name: "customerImage", maxCount: 1 },
        { name: "nidFile", maxCount: 1 },
      ]),
      async (req, res) => {
        try {
          const { body, files } = req;

          // ১. ডুপ্লিকেট মোবাইল নম্বর চেক (একই মোবাইল দিয়ে দ্বিতীয়বার রেজিস্ট্রেশন বন্ধ)
          const existingCustomer = await customerCollection.findOne({
            mobile: body.mobile,
          });
          if (existingCustomer) {
            return res.status(400).json({
              success: false,
              message: "এই মোবাইল নম্বরটি দিয়ে ইতিমধ্যে গ্রাহক নিবন্ধিত আছে!",
            });
          }

          // ফাইল ইউআরএল জেনারেট
          const imageUrl = files?.["customerImage"]
            ? `http://localhost:5000/uploads/${files["customerImage"][0].filename}`
            : "";
          const nidUrl = files?.["nidFile"]
            ? `http://localhost:5000/uploads/${files["nidFile"][0].filename}`
            : "";

          // ডাটাবেস অবজেক্ট
          const newCustomer = {
            category: body.category,
            name: body.name,
            fatherName: body.fatherName,
            motherName: body.motherName,
            mobile: body.mobile,
            dob: body.dob,
            nidNumber: body.nidNumber,
            address: body.address,
            image: imageUrl,
            nidPdf: nidUrl,
            status: "Active",
            createdAt: new Date(),
            // ২. cust_id কে অবশ্যই Number হিসেবে সেভ করতে হবে যাতে সর্টিং ঠিক থাকে
            cust_id: Number(body.cust_id),
          };

          const result = await customerCollection.insertOne(newCustomer);

          res.status(201).json({
            success: true,
            message: "Customer added successfully",
            data: result,
          });
        } catch (err) {
          res.status(500).json({ success: false, message: err.message });
        }
      },
    );

    // --- ৮. সকল গ্রাহকের তালিকা ---
    app.get("/customers", async (req, res) => {
      const customers = await customerCollection
        .find()
        .sort({ createdAt: -1 })
        .toArray();
      res.send(customers);
    });

    // --- ৯. সর্বোচ্চ cust_id পাওয়ার এপিআই (Fix for ID > 10) ---
    app.get("/max_cust_id", async (req, res) => {
      try {
        const result = await customerCollection
          .find()
          .sort({ cust_id: -1 }) // এখানে Number হিসেবে সর্ট হবে
          .limit(1)
          .toArray();

        // যদি ডাটা থাকে তবে আইডি পাঠাবে, না থাকলে ০ পাঠাবে
        if (result.length > 0) {
          // এটি নিশ্চিত করবে যে আইডি সংখ্যা হিসেবে যাচ্ছে
          res.send(result[0].cust_id.toString());
        } else {
          res.send("0");
        }
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // --10
    app.delete("/delete_customer/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await customerCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "ব্যর্থ! মুছতে সমস্যা হয়েছে।", error });
      }
    });

    app.get("/", (req, res) => res.send("Ice-Cream Server Running..."));
    app.listen(port, () => console.log(`🚀 Server: http://localhost:${port}`));
  } catch (err) {
    console.error(err);
  }
}
main();
