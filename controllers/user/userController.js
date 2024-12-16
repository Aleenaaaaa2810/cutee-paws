const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const category=require('../../models/categorySchema')
const Product = require('../../models/productSchema');
const Category = require("../../models/categorySchema");
 const env=require("dotenv").config();

// Helper function to generate OTP
function generateOTP() {
  const otp = (Math.floor(100000 + Math.random() * 900000)).toString(); 
  console.log("Generated OTP:", otp);
  return otp;
}

// Send OTP email function
async function sendVerificationEmail(email, otp) {
  if (!process.env.NODEMAILER_EMAIL || !process.env.NODEMAILER_PASSWORD) {
    console.error("Nodemailer credentials are missing in environment variables");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify Your Account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP: ${otp}</b>`,
    });

    console.log("Email sent successfully:", info.response);
    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
}

// Individual page load functions
async function loadHomepage(req, res) {
  const user = req.session.user || null; // Safely retrieve session user
  res.render("home", { user });
}




async function loadabout(req, res) {
  try {
    res.render("about");
  } catch (error) {
    console.error("Error loading about page:", error);
    res.redirect("/pageNotFound");
  }
}

async function loadcart(req, res) {
  try {
    res.render("add-to-Cart");
  } catch (error) {
    console.error("Error loading cart page:", error);
    res.redirect("/pageNotFound");
  }
}

async function loadcontact(req, res) {
  try {
    res.render("contact");
  } catch (error) {
    console.error("Error loading contact page:", error);
    res.redirect("/pageNotFound");
  }
}

async function loadotp(req, res) {
  try {
    res.render("otp");
  } catch (error) {
    console.error("Error loading OTP page:", error);
    res.redirect("/pageNotFound");
  }
}

async function loadsignup(req, res) {
  try {
    res.render("signup");
  } catch (error) {
    console.error("Error loading signup page:", error);
    res.redirect("/pageNotFound");
  }
}

// Page Not Found
async function pageNotFound(req, res) {
  try {
    res.render("pageNotFound");
  } catch (error) {
    console.error("Error rendering page not found:", error);
    res.status(500).send("Server Error");
  }
}

// Signup process
async function signup(req, res) {
  const { name, email, phone, password, cpassword } = req.body;

  if (!name || !email || !phone || !password || !cpassword) {
    return res.render("signup", { message: "All fields are required" });
  }

  if (password !== cpassword) {
    return res.render("signup", { message: "Passwords do not match" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("signup", { message: "User already exists" });
    }

    const otp = generateOTP();
    req.session.userOtp = otp;
    req.session.userData = { name, email, phone, password };

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.render("signup", { message: "Failed to send verification email. Please try again." });
    }

    res.render("otp");
  } catch (error) {
    console.error("Signup error:", error.message);
    res.render("signup", { message: "Server error. Please try again." });
  }
}


// OTP Verification
async function verifyOtp(req, res) {
  try {
    const { otp } = req.body;

    // Check if session data exists
    if (!req.session.userOtp || !req.session.userData) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please sign up again.",
      });
    }

    // Verify the OTP
    if (parseInt(otp, 10) !== parseInt(req.session.userOtp, 10)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    // Extract user data and hash the password
    const { name, email, phone, password } = req.session.userData;


    const hashedPassword = await bcrypt.hash(password, 10);
const newUser = new User({
  name,
  email,
  phone,
  password: hashedPassword,  // Ensure hashed password is set here
  isValid:true,
});
await newUser.save();
    // Clear session data
    req.session.userOtp = null;
    req.session.userData = null;

    // Respond with success
    return res.status(200).json({
      success: true,
      message: "OTP verified successfully!",
    }); 
  } catch (error) {
    console.error("OTP verification error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
}



// Load Login page
async function loadLogin(req, res) {
  try {
    if (!req.session.user) {
      return res.render("login");
    }
    res.redirect("/");
  } catch (error) {
    console.error("Login page load error:", error);
    res.redirect("/pageNotFound");
  }
}

// Login process
async function login(req, res) {

  try {
    const { email, password } = req.body;
  
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
      if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "Your account has been blocked. Please contact support." });
    }
    
      const isPasswordValid = await user.matchPassword(password);
if (!isPasswordValid) {
  return res.status(401).json({ success: false, message: "Incorrect password" });
}
   
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
    };
  
    res.status(200).json({ success: true, message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
  
}



const resendOtp = async (req, res) => {
  try {
    if (!req.session.userData || !req.session.userData.email) {
      return res.render("signup", {
        message: "Session expired. Please sign up again.",
      });
    }

    const email = req.session.userData.email;

    const otp = generateOTP();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
      return res.render("otp", {
        message: "A new OTP has been sent to your email.",
      });
    } else {
      return res.render("otp", {
        message: "Failed to resend OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("Resend OTP error:", error.message);

    return res.render("otp", {
      message: "Server error. Please try again later.",
    });
  }
};



const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error during logout:", err.message);
        return res.redirect("/login");
      }
      res.redirect("/login");
    });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.redirect("/pageNotFound");
  }
};






const loadshop = async (req, res) => {
  try {
    const userData = req.session.user || null; // Fetch user session data

    // Fetch active categories
    const categorise = await Category.find({ isListed: true });
    const categoriseWithIds = categorise.map((category) => ({ _id: category._id, name: category.name }));

    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    // Filter conditions
    const filterConditions = {
      isBlocked: false,
      // quantity: { $gt: 0 },
    };

    // Category filter
    const categoryFilter = req.query.category;
    if (categoryFilter) {
      filterConditions.category = categoryFilter;
    }

    // Price filter
    const minPrice = parseInt(req.query.gte) || 0;
    const maxPrice = parseInt(req.query.lte) || 100000;
    filterConditions.salePrice = { $gte: minPrice, $lte: maxPrice };

    
    const searchQuery = req.query.search || "";
    console.log(searchQuery)
    if (searchQuery) {
      filterConditions.name = { $regex: searchQuery, $options: "i" };
    }

    const sortType = req.query.sort || "default";
    const getSortQuery = (type) => {
      switch (type) {
        case "lowToHigh":
          return { salePrice: 1 };
        case "highToLow":
          return { salePrice: -1 };
        case "aToZ":
          return { name: 1 };
        case "zToA":
          return { name: -1 };
        default:
          return { createdOn: -1 }; 
      }
    };
    const sortQuery = getSortQuery(sortType);

    // Fetch products with filters, sorting, and pagination
    const products = await Product.find(filterConditions)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    // Total product count for pagination
    const totalProducts = await Product.countDocuments(filterConditions);
    const totalPages = Math.ceil(totalProducts / limit);

    // Render the shop page with all data
    res.render("shop", {
      user: userData,
      products: products,
      category: categoriseWithIds,
      totalProducts: totalProducts,
      currentpage: page,
      totalPages: totalPages,
      selectedCategory: categoryFilter || null,
      minPrice: minPrice,
      maxPrice: maxPrice,
      selectedSort: sortType,
      searchQuery: searchQuery,
    });
  } catch (error) {
    console.error("Error loading shop page:", error);
    res.redirect("/pageNotFound");
  }
};


module.exports = {
  loadHomepage,
  pageNotFound,
  loadsignup,
  signup,
  verifyOtp,
  loadLogin,
  loadshop,
  loadabout,
  loadcart,
  loadcontact,
  loadotp,
  login,
  resendOtp,
  logout,
};
