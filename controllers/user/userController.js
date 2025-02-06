const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const category=require('../../models/categorySchema')
const Product = require('../../models/productSchema');
const Category = require("../../models/categorySchema");
const Wallet=require('../../models/walletSchema')
const { v4: uuidv4 } = require('uuid'); 



 const env=require("dotenv").config();

function generateOTP() {
  const otp = (Math.floor(100000 + Math.random() * 900000)).toString(); 
  console.log("Generated OTP:", otp);
  return otp;
}

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

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
}

async function loadHomepage(req, res) {
  try {
    const products = await Product.find().sort({ salesCount: -1 }).limit(16); 
    const user = req.session.user || null;
    res.render("home", { user, products });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
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
    let pointsToAdd = 25;  

    if (referralCode) {
      const referrer = await User.findOne({ referralId: referralCode });
      if (referrer) {
        referredBy = referrer._id;

        referrer.points += 100;
        await referrer.save();

        let referrerWallet = await Wallet.findOne({ userId: referrer._id });
        if (!referrerWallet) {
          referrerWallet = new Wallet({
            userId: referrer._id,
            balance: 100, 
            transactions: [{
              transactionId: uuidv4(),
              description: 'Referral Reward (Referrer)',
              amount: 100,
              date: new Date(),
            }],
          });
        } else {
          referrerWallet.balance += 100;  
          referrerWallet.transactions.push({
            transactionId: uuidv4(),
            description: 'Referral Reward (Referrer)',
            amount: 100,
            date: new Date(),
          });
        }
        await referrerWallet.save();

        
      } else {
        return res.render("signup", { message: "Invalid referral code" });
      }
    }

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

    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      isValid: true,
      referralId,
      referredBy,
      points: pointsToAdd,  
    });

    await newUser.save();

    const wallet = new Wallet({
      userId: newUser._id,
      balance: pointsToAdd,  
      transactions: [{
        transactionId: uuidv4(),
        description: 'Signup Bonus (New User)',
        amount: pointsToAdd,  
        date: new Date(),
      }],
    });

    await wallet.save();

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

    if (user.referredBy !=null) {
      let wallet = await Wallet.findOne({ userId: user._id });

      if (!wallet) {
        wallet = new Wallet({
          userId: user._id,
          balance: pointsToAdd+50,  
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

      user.referredBy = null
      await user.save();
      await wallet.save();
    }

    return res.status(200).json({ success: true, message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
}




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

    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const filterConditions = { isBlocked: false };
    if (req.query.category) {
      filterConditions.category = req.query.category;
    } else {
      filterConditions.category = { $in: categoryIds }; 
    }

    const minPrice = parseInt(req.query.gte) || 0;
    const maxPrice = parseInt(req.query.lte) || 100000;
    filterConditions.salePrice = { $gte: minPrice, $lte: maxPrice };

    const searchQuery = req.query.search || "";
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

    const products = await Product.find(filterConditions).sort(sortQuery).skip(skip).limit(limit);

    const totalProducts = await Product.countDocuments(filterConditions);
    const totalPages = Math.ceil(totalProducts / limit);

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
