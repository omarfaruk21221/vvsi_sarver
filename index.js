const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// ১. মিডলওয়্যার
// origin-এ আপনার ভার্সেল ফ্রন্টএন্ড লিঙ্কটি দিতে পারেন অথবা '*' ব্যবহার করতে পারেন
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ২. মঙ্গোডিবি কানেকশন
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
    // কানেকশন তৈরি
    // await client.connect(); // Serverless-এ অনেক সময় এটি অপশনাল, তবে রাখা ভালো
    const db = client.db("bhai_bhai_icecream_DB");
    const userCollection = db.collection("users");
    const customerCollection = db.collection("customers");

    console.log(" Connected to MongoDB");

    // --- ৩. রুট এপিআই ---
    app.get("/", (req, res) => {
      res.send("Bhai Bhai Ice-Cream Server is Running (Serverless Mode)");
    });

    // --- ৪. রেজিস্ট্রেশন এপিআই (ImgBB লিঙ্ক ফ্রন্টএন্ড থেকে আসবে) ---
    app.post("/register", async (req, res) => {
      try {
        const { username, mobile, password, image } = req.body;
        const exist = await userCollection.findOne({ mobile });
        if (exist)
          return res
            .status(400)
            .json({ message: "এই নম্বর দিয়ে অ্যাকাউন্ট আছে" });

        const hashedPassword = await bcrypt.hash(password, 10);

        await userCollection.insertOne({
          username,
          mobile,
          password: hashedPassword,
          image: image || "", // সরাসরি অনলাইন লিঙ্ক সেভ হবে
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

    // --- ৫. লগইন এপিআই ---
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

    // get user info api
    app.get("/users", async (req, res) => {
      try {
        const users = await userCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    // indibiual data get by mobile phone number
    app.get("/users/:mobile", async (req, res) => {
      try {
        const mobile = req.params.mobile;
        const user = await userCollection.findOne({ mobile: mobile });
        if (!user) {
          return res.status(404).json({ message: "ইউজার পাওয়া যায়নি" });
        }
        const { password, ...userData } = user;
        res.status(200).json(userData);
      } catch (err) {
        res
          .status(500)
          .json({ message: "সার্ভারে সমস্যা", error: err.message });
      }
    });

    // --- ৬. নতুন গ্রাহক যোগ করার এপিআই (ImgBB অনলাইন লিঙ্ক ভিত্তিক) ---
    app.post("/add_customers", async (req, res) => {
      try {
        const body = req.body;

        const existingCustomer = await customerCollection.findOne({
          mobile: body.mobile,
        });
        if (existingCustomer) {
          return res.status(400).json({
            success: false,
            message: "এই মোবাইল নম্বরটি ইতিমধ্যে নিবন্ধিত আছে!",
          });
        }

        const newCustomer = {
          category: body.category,
          name: body.name,
          fatherName: body.fatherName,
          motherName: body.motherName,
          mobile: body.mobile,
          dob: body.dob,
          nidNumber: body.nidNumber,
          address: body.address,
          image: body.image, // ImgBB ডিরেক্ট লিঙ্ক
          nidPdf: body.nidPdf, // ImgBB ডিরেক্ট লিঙ্ক
          cust_id: Number(body.cust_id),
          status: "Active",
          createdAt: new Date(),
        };

        const result = await customerCollection.insertOne(newCustomer);
        res.status(201).json({ success: true, data: result });
      } catch (err) {
        res.status(500).json({ success: false, message: err.message });
      }
    });

    // --- ৭. সকল গ্রাহকের তালিকা ---
    app.get("/customers", async (req, res) => {
      try {
        const customers = await customerCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();
        res.send(customers);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    // --- ৮. সর্বোচ্চ cust_id পাওয়ার এপিআই ---
    app.get("/max_cust_id", async (req, res) => {
      try {
        const result = await customerCollection
          .find()
          .sort({ cust_id: -1 })
          .limit(1)
          .toArray();

        const maxId = result.length > 0 ? result[0].cust_id : 0;
        res.send(maxId.toString());
      } catch (err) {
        res.status(500).send({ message: "Server error" });
      }
    });

    // --- ৯. গ্রাহক ডিলিট এপিআই ---
    app.delete("/delete_customer/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await customerCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "ডিলিট করতে সমস্যা হয়েছে", error });
      }
    });
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
}

main().catch(console.dir);

// ৪. ভার্সেল এর জন্য এক্সপোর্ট (অত্যন্ত জরুরি)
module.exports = app;

// লোকালহোস্টে টেস্ট করার জন্য
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => console.log(`🚀 Server ready on port ${port}`));
}
