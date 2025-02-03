const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const category=require('../../models/categorySchema')
const Product = require('../../models/productSchema');
const Category = require("../../models/categorySchema");
const Wallet=require('../../models/walletSchema')
const { v4: uuidv4 } = require('uuid'); 



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
  const user = req.session.user || null;
  try {
    res.render("about",{user});
  } catch (error) {
    console.error("Error loading about page:", error);
    res.redirect("/pageNotFound");
  }
}

async function loadcart(req, res) {
  const user = req.session.user || null;

  try {
    res.render("add-to-Cart",{user});
  } catch (error) {
    console.error("Error loading cart page:", error);
    res.redirect("/pageNotFound");
  }
}

async function loadcontact(req, res) {
  const user = req.session.user || null;

  try {
    res.render("contact",{user});
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


function generateReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase(); // Example: 'A3D4E5F7'
}

async function signup(req, res) {
  const { name, email, phone, password, cpassword, referralCode } = req.body;

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

    let referredBy = null;
    let pointsToAdd = 25;  // Default points for new user (no referral)

    if (referralCode) {
      // Validate referral code
      const referrer = await User.findOne({ referralId: referralCode });
      if (referrer) {
        referredBy = referrer._id;

        // Add 100 points to the referrer for their successful referral
        referrer.points += 100;
        await referrer.save();

        // Update referrer's wallet
        let referrerWallet = await Wallet.findOne({ userId: referrer._id });
        if (!referrerWallet) {
          referrerWallet = new Wallet({
            userId: referrer._id,
            balance: 100, // Start with 100 points for referral
            transactions: [{
              transactionId: uuidv4(),
              description: 'Referral Reward (Referrer)',
              amount: 100,
              date: new Date(),
            }],
          });
        } else {
          referrerWallet.balance += 100;  // Increment the existing balance by 100
          referrerWallet.transactions.push({
            transactionId: uuidv4(),
            description: 'Referral Reward (Referrer)',
            amount: 100,
            date: new Date(),
          });
        }
        await referrerWallet.save();

        // Add 50 points for the new user using a referral code
        // pointsToAdd += 50;  
      } else {
        return res.render("signup", { message: "Invalid referral code" });
      }
    }

    // Generate referral ID and OTP
    const referralId = generateReferralCode();
    const otp = generateOTP();
    req.session.userOtp = otp;
    req.session.userData = { name, email, phone, password, referralId, referredBy, pointsToAdd };

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



async function verifyOtp(req, res) {
  try {
    const { otp } = req.body;

    if (!req.session.userOtp || !req.session.userData) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please sign up again.",
      });
    }

    if (parseInt(otp, 10) !== parseInt(req.session.userOtp, 10)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    const { name, email, phone, password, referralId, referredBy, pointsToAdd } = req.session.userData;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      isValid: true,
      referralId,
      referredBy,
      points: pointsToAdd,  // Add points (25 for new user, +50 if referral code used)
    });

    await newUser.save();

    // Create a wallet for the new user
    const wallet = new Wallet({
      userId: newUser._id,
      balance: pointsToAdd,  // Correct pointsToAdd for new user
      transactions: [{
        transactionId: uuidv4(),
        description: 'Signup Bonus (New User)',
        amount: pointsToAdd,  // Use the calculated points here
        date: new Date(),
      }],
    });

    await wallet.save();

    // Clear session data
    req.session.userOtp = null;
    req.session.userData = null;

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


// Login process
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if the user's account is blocked
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "Your account has been blocked. Please contact support." });
    }

    // Validate the password
    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    // Set session
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
    };

    // Check referral status and update wallet if necessary
    if (user.referredBy !=null) {
      // Add points to the user’s wallet if the referral code hasn’t been applied
      let wallet = await Wallet.findOne({ userId: user._id });

      // If no wallet exists, create one
      if (!wallet) {
        wallet = new Wallet({
          userId: user._id,
          balance: pointsToAdd+50,  // Add the user’s points to the wallet
          transactions: [{
            transactionId: uuidv4(),
            description: 'Referral Bonus',
            amount: 50,
            date: new Date(),
          }],
        });
      } else {
        wallet.balance += 50;
        wallet.transactions.push({
          transactionId: uuidv4(),
          description: 'Referral Bonus',
          amount: 50,
          date: new Date(),
        });
      }

      // Mark the referral as applied
      user.referredBy = null
      // Save changes to user and wallet
      await user.save();
      await wallet.save();
    }

    // Respond with success
    return res.status(200).json({ success: true, message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
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


const resendOtp = async (req, res) => {
  try {
    if (!req.session.userData || !req.session.userData.email) {
      return res.json({
        success: false,
        message: "Session expired. Please sign up again.",
      });
    }

    const email = req.session.userData.email;
    const otp = generateOTP();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
      return res.json({
        success: true,
        message: "A new OTP has been sent to your email.",
      });
    } else {
      return res.json({
        success: false,
        message: "Failed to resend OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("Resend OTP error:", error.message);

    return res.json({
      success: false,
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
    const userData = req.session.user || null;
    const categorise = await Category.find({ isListed: true });
    const categoriseWithIds = categorise.map(category => ({ _id: category._id, name: category.name }));
    const categoryIds = categorise.map(category => category._id);

    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    // Apply category filter if selected
    const filterConditions = { isBlocked: false };
    if (req.query.category) {
      filterConditions.category = req.query.category;
    } else {
      filterConditions.category = { $in: categoryIds }; // Default: include all categories
    }

    // Apply price filter (persisting selection)
    const minPrice = parseInt(req.query.gte) || 0;
    const maxPrice = parseInt(req.query.lte) || 100000;
    filterConditions.salePrice = { $gte: minPrice, $lte: maxPrice };

    // Apply search query within selected filters
    const searchQuery = req.query.search || "";
    if (searchQuery) {
      filterConditions.name = { $regex: searchQuery, $options: "i" }; // Case-insensitive search
    }

    // Sorting conditions
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

    // Fetch filtered and sorted products
    const products = await Product.find(filterConditions).sort(sortQuery).skip(skip).limit(limit);

    // Calculate pagination info
    const totalProducts = await Product.countDocuments(filterConditions);
    const totalPages = Math.ceil(totalProducts / limit);

    // Render the shop page with updated filters
    res.render("shop", {
      user: userData,
      products: products,
      category: categoriseWithIds,
      totalProducts: totalProducts,
      currentpage: page,
      totalPages: totalPages,
      selectedCategory: req.query.category || null,
      minPrice: minPrice,
      maxPrice: maxPrice,
      selectedSort: sortType,
      searchQuery: searchQuery,
      noResults: products.length === 0,
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
