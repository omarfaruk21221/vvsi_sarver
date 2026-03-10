const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let cachedDb = null;

const connectDB = async () => {
  // যদি আগে থেকেই কানেকশন থাকে, তবে নতুন করে কানেক্ট হবে না
  if (cachedDb) {
    return cachedDb;
  }

  try {
    // কানেকশন তৈরি
    await client.connect();
    const db = client.db("bhai_bhai_icecream_DB");
    cachedDb = db; // কানেকশন সেভ করে রাখা হচ্ছে
    console.log("✅ New MongoDB Connection Created");
    return db;
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    throw err;
  }
};

module.exports = connectDB;
