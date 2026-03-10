const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

module.exports = (db) => {
  const customerCollection = db.collection("customers");

  // ১. কাস্টমার যোগ করা
  router.post("/add_customers", async (req, res) => {
    try {
      const body = req.body;
      const exist = await customerCollection.findOne({ mobile: body.mobile });
      if (exist)
        return res
          .status(400)
          .send({ success: false, message: "ইতিমধ্যে নিবন্ধিত আছে" });

      const newCustomer = {
        ...body,
        cust_id: Number(body.cust_id),
        status: "প্রসেসিং",
        createdAt: new Date(),
      };
      await customerCollection.insertOne(newCustomer);
      res.status(201).send({ success: true, message: "গ্রাহক যোগ করা হয়েছে" });
    } catch (err) {
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
            ],
          }
        : {};

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const customers = await customerCollection
        .find(query)
        .sort({ createdAt: sort === "asc" ? 1 : -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .toArray();

      const totalCount = await customerCollection.countDocuments(query);
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

  // ৪. কাস্টমার আপডেট
  router.patch("/update_customer/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = req.body;
      if (!ObjectId.isValid(id))
        return res.status(400).send({ message: "Invalid ID" });

      const { _id, ...cleanData } = updatedData;
      await customerCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: cleanData },
      );
      res.send({ success: true, message: "সফলভাবে আপডেট হয়েছে" });
    } catch (error) {
      res.status(500).send({ message: "সার্ভার এরর" });
    }
  });

  // ৫. ডিলিট কাস্টমার
  router.delete("/delete_customer/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const result = await customerCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    } catch (error) {
      res.status(500).send({ message: "ডিলিট এরর" });
    }
  });

  return router;
};
