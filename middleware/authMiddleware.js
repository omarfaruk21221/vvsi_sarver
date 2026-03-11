const jwt = require("jsonwebtoken");

/**
 * Global Auth Middleware
 * এই ফাংশনটি টোকেন চেক করবে এবং ইউজারের তথ্য req.user-এ সেট করবে
 */
const verifyToken = (req, res, next) => {
  try {
    // ১. রিকোয়েস্ট হেডার থেকে টোকেন সংগ্রহ করা
    const authHeader = req.headers["authorization"];

    // টোকেনটি সাধারণত "Bearer <token>" আকারে থাকে
    const token = authHeader && authHeader.split(" ")[1];

    // ২. যদি টোকেন না থাকে তবে এক্সেস রিজেক্ট করা
    if (!token) {
      return res.status(403).json({
        success: false,
        message: "প্রবেশাধিকার সংরক্ষিত! দয়া করে লগইন করে টোকেন প্রদান করুন।",
      });
    }

    // ৩. টোকেনটি ভেরিফাই করা
    jwt.verify(token, process.env.JWT_SECRET || "secret", (err, decoded) => {
      if (err) {
        console.error("JWT Error:", err.message);
        return res.status(401).json({
          success: false,
          message: "অকার্যকর বা মেয়াদোত্তীর্ণ টোকেন! আবার লগইন করুন।",
        });
      }

      // ৪. টোকেন ঠিক থাকলে ডিকোড করা ডাটা রিকোয়েস্ট অবজেক্টে যোগ করা
      // এতে করে পরবর্তী রাউটগুলো req.user.id এবং req.user.role এক্সেস করতে পারবে
      req.user = decoded;

      // ৫. কাজ শেষ, এখন পরের ফাংশনে (Route Handler) যাও
      next();
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "সার্ভারে মিডলওয়্যার সমস্যা!",
      error: error.message,
    });
  }
};
module.exports = verifyToken;
