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

    // ---  রেজিস্ট্রেশন এপিআই (ImgBB লিঙ্ক ফ্রন্টএন্ড থেকে আসবে) ---
    app.post("/register", async (req, res) => {
      try {
        const {
          name,
          mobile,
          password,
          image,
          category,
          nidNumber,
          fatherName,
          motherName,
          dob,
          address,
          nidPdfFornt,
          nidPdfBackpart,
        } = req.body;

        const exist = await userCollection.findOne({ mobile });
        if (exist) {
          return res.status(400).send({
            success: false,
            message: "এই নম্বর দিয়ে অলরেডি অ্যাকাউন্ট আছে",
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
          name: name,
          mobile,
          password: hashedPassword,
          image: image || "",
          nidPdfFornt: nidPdfFornt || "",
          nidPdfBackpart: nidPdfBackpart || "",
          category: category || "সাধারণ",
          nidNumber: nidNumber || "",
          fatherName: fatherName || "",
          motherName: motherName || "",
          dob: dob || "",
          address: address || "",
          role: category || "সাধারণ",
          status: "প্রসেসিং",
          createdAt: new Date(),
        };

        // ৪. ডাটাবেসে সেভ করা
        const result = await userCollection.insertOne(newUser);

        if (result.insertedId) {
          res.status(201).json({
            success: true,
            message: "নিবন্ধন সফলভাবে সম্পন্ন হয়েছে",
          });
        }
      } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({
          success: false,
          message: "সার্ভারে সমস্যা হয়েছে: " + err.message,
        });
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

    // get max user id
    app.get("/max-user-id", async (req, res) => {
      try {
        const result = await userCollection
          .find()
          .sort({ user_id: -1 })
          .limit(1)
          .toArray();
        const maxUserId = result.length > 0 ? result[0].user_id : 0;
        res.send(maxUserId.toString());
      } catch {
        res.status(500).send({ message: "Server error" });
      }
    });

    // modified get user info api
    app.get("/users", async (req, res) => {
      try {
        const { status, search, sort, page, limit } = req.query;
        let query = {};
        if (status) {
          query.status = status;
        }

        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { mobile: { $regex: search, $options: "i" } },
            { user_id: { $regex: search, $options: "i" } },
          ];
        }

        // ৩. সর্টিং অর্ডার সেট করা
        const sortOption = sort === "asc" ? 1 : -1;

        // ৪. পেজিনেশন ক্যালকুলেশন
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        // ৫. ডাটাবেস অপারেশন (একই সাথে ডাটা এবং টোটাল কাউন্ট আনা)
        const users = await userCollection
          .find(query)
          .sort({ createdAt: sortOption })
          .skip(skip)
          .limit(limitNumber)
          .toArray();

        // মোট কয়টি ইউজার এই কুয়েরির আন্ডারে আছে তা বের করা (পেজিনেশনের জন্য)
        const totalCount = await userCollection.countDocuments(query);

        // ৬. রেসপন্স পাঠানো
        res.send({
          data: users,
          totalCount: totalCount,
          totalPages: Math.ceil(totalCount / limitNumber),
          currentPage: pageNumber,
        });
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send({ message: "সার্ভারে সমস্যা হয়েছে", error });
      }
    });
    /// update user Info
    app.patch("/users/:mobile", async (req, res) => {
      try {
        const mobile = req.params.mobile;
        const updatedInfo = req.body;

        const result = await userCollection.updateOne(
          { mobile: mobile },
          { $set: updatedInfo },
        );

        if (result.modifiedCount > 0) {
          res
            .status(200)
            .send({ success: true, message: "Updated successfully" });
        } else {
          res.status(400).send({ message: "No changes made" });
        }
      } catch (err) {
        res.status(500).send({ message: "Server error", error: err.message });
      }
    });

    // --- ৬. নতুন গ্রাহক যোগ করার এপিআই (সংশোধিত) ---
    app.post("/add_customers", async (req, res) => {
      try {
        const body = req.body; // ফ্রন্টএন্ড থেকে আসা JSON ডাটা

        // ১. মোবাইল নম্বর দিয়ে আগে থেকেই কেউ নিবন্ধিত কি না চেক করা
        const existingCustomer = await customerCollection.findOne({
          mobile: body.mobile,
        });

        if (existingCustomer) {
          return res.status(400).send({
            success: false,
            message: "এই মোবাইল নম্বরটি ইতিমধ্যে নিবন্ধিত আছে!",
          });
        }

        // ২. নতুন কাস্টমার অবজেক্ট তৈরি (ফ্রন্টএন্ডের পাঠানো ফিল্ডের সাথে মিল রেখে)
        const newCustomer = {
          category: body.category,
          name: body.name,
          fatherName: body.fatherName,
          motherName: body.motherName,
          mobile: body.mobile,
          dob: body.dob,
          nidNumber: body.nidNumber,
          address: body.address,

          // ইমেজ ইউআরএল গুলো সেভ করা হচ্ছে
          image: body.image, // প্রোফাইল ফটো লিঙ্ক
          nid_front: body.nid_front, // NID সামনের অংশের লিঙ্ক
          nid_back: body.nid_back, // NID পিছনের অংশের লিঙ্ক

          cust_id: Number(body.cust_id),
          status: "প্রসেসিং",
          createdAt: new Date(),
        };

        // ৩. ডাটাবেসে ইনসার্ট করা
        const result = await customerCollection.insertOne(newCustomer);

        if (result.insertedId) {
          res.status(201).send({
            success: true,
            message: "গ্রাহক সফলভাবে যোগ করা হয়েছে",
            data: result,
          });
        }
      } catch (err) {
        console.error("Add Customer Error:", err);
        res.status(500).send({
          success: false,
          message: "সার্ভারে সমস্যা হয়েছে: " + err.message,
        });
      }
    });

    // --- ৭. সকল গ্রাহকের তালিকা ---
    // Modified get customers info api
    app.get("/customers", async (req, res) => {
      try {
        // ১. ফ্রন্টএন্ড থেকে পাঠানো কুয়েরি প্যারামিটারগুলো রিসিভ করা
        const { search, sort, page, limit } = req.query;

        // ২. সার্চ কুয়েরি তৈরি (নাম, মোবাইল বা কাস্টমার আইডি দিয়ে খোঁজা)
        let query = {};
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } }, // 'i' মানে Case-insensitive
            { mobile: { $regex: search, $options: "i" } },
            { cust_id: { $regex: search, $options: "i" } },
          ];
        }

        // ৩. সর্টিং অর্ডার সেট করা (নতুন আগে নাকি পুরাতন)
        const sortOption = sort === "asc" ? 1 : -1;

        // ৪. পেজিনেশন লজিক
        const pageNumber = parseInt(page) || 1;
        const limitNumber = parseInt(limit) || 10;
        const skip = (pageNumber - 1) * limitNumber;

        // ৫. ডাটাবেস থেকে ডাটা সংগ্রহ করা
        const customers = await customerCollection
          .find(query)
          .sort({ createdAt: sortOption }) // অথবা cust_id দিয়ে সর্ট করতে পারেন
          .skip(skip)
          .limit(limitNumber)
          .toArray();

        // মোট কয়টি ডাটা আছে তা বের করা (পেজিনেশন কম্পোনেন্টের জন্য জরুরি)
        const totalCount = await customerCollection.countDocuments(query);

        // ৬. অবজেক্ট আকারে ডাটা পাঠানো
        res.send({
          data: customers,
          totalCount: totalCount,
          totalPages: Math.ceil(totalCount / limitNumber),
          currentPage: pageNumber,
        });
      } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).send({ message: "সার্ভারে সমস্যা হয়েছে", error });
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

    // --- আপডেট কাস্টমার এপিআই (সংশোধিত ও ক্লিন) ---
    app.patch("/update_customer/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedFields = req.body;

        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .send({ success: false, message: "অকার্যকর আইডি ফরম্যাট।" });
        }

        const { _id, ...cleanData } = updatedFields;

        if (Object.keys(cleanData).length === 0) {
          return res.status(400).send({
            success: false,
            message: "পরিবর্তন করার মতো কোনো তথ্য পাওয়া যায়নি।",
          });
        }

        const result = await customerCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: cleanData },
        );

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .send({ success: false, message: "কাস্টমার খুঁজে পাওয়া যায়নি।" });
        }

        res.status(200).send({
          success: true,
          message: "তথ্য সফলভাবে আপডেট করা হয়েছে।",
        });
      } catch (error) {
        console.error("Update Error:", error);
        res.status(500).send({
          success: false,
          message: "সার্ভারে অভ্যন্তরীণ ত্রুটি ঘটেছে।",
        });
      }
    });

    // ---  গ্রাহক ডিলিট এপিআই ---
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
