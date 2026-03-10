const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");

const app = express();
const port = process.env.PORT || 5000;

// ১. মিডলওয়্যার
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function run() {
  try {
    const db = await connectDB();

    // --- ২. এখানে পরিবর্তন (আগের মতো সরাসরি পাথ দেওয়া হলো) ---

    // ইউজার রিলেটেড সব এপিআই (যেমন: /users, /register, /login)
    // এগুলো এখন সরাসরি আপনার আগের লিংকেই কাজ করবে
    app.use("/", require("./routes/user.routes")(db));

    // কাস্টমার রিলেটেড সব এপিআই (যেমন: /customers, /add_customers)
    app.use("/", require("./routes/customer.routes")(db));

    // রুট এপিআই
    app.get("/", (req, res) => {
      res.send(
        "Bhai Bhai Ice-Cream Server is Running (Organized but same Paths)",
      );
    });

    if (process.env.NODE_ENV !== "production") {
      app.listen(port, () => console.log(`🚀 Server ready on port ${port}`));
    }
  } catch (error) {
    console.error("Server Start Error:", error);
  }
}

run();

module.exports = app;
