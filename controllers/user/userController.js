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

async function loadshop(req, res) {
  try {
    const userSession = req.session.user;
   
    if (!userSession || !userSession.id) {
      console.error("No valid user in session");
      return res.redirect("/login");
    }

    const userId = userSession.id;

    const userData = await User.findOne({ _id: userId });

    if (!userData) {
      console.error("User not found in database");
      return res.redirect("/login");
    }

    const categorise = await category.find({ isListed: true });
    const CategorIds = categorise.map((category) => category._id.toString());
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;


    const products = await Product.find({
      isBlocked: false,
      category: { $in: CategorIds },
      quantity: { $gt: 0 },
    })
      .sort({ createOn: -1 })
      .skip(skip)
      .limit(limit);

    const totalProducts = await Product.countDocuments({
      isBlocked: false,
      category: { $in: CategorIds },
      quantity: { $gt: 0 },
    });

    const totalpags = Math.ceil(totalProducts / limit);
    const categoriseWithIds = categorise.map((category) => ({
      _id: category._id,
      name: category.name,
    }));

    res.render("shop", {
      user: userData,
      products: products,
      category: categoriseWithIds,
      totalProducts: totalProducts,
      currentpage: page,
      totalPages: totalpags,
    });
  } catch (error) {
    console.error("Error loading shop page:", error);
    res.redirect("/pageNotFound");
  }
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

async function loadwishlist(req, res) {
  try {
    res.render("wishlist");
  } catch (error) {
    console.error("Error loading wishlist page:", error);
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
    if (User.blocked) {
      return res.status(403).send("Your account has been blocked. Please contact support.");
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



//filter

const filteProduct =async(req,res)=>{
  try {
    const user=req.session.user;
    const category=req.query.category
    const findCategory = category ? await Category.findById({_id: category}) : null;

    const query={
      isBlocked:false,
      quantity:{$gt:0}
      
    }

    if(findCategory){
     
      query.category=findCategory._id
    }

    let findProducts=await Product.find(query).lean()
    findProducts.sort((a,b)=>new Date(b.createOn)-new Date (a.createOn))
    
    const categorise=await Category.find({isListed:true})
    let itemsPerPage=6
    let currentpage=parseInt(req.query.page)|| 1
    let startIndex=(currentpage-1) *itemsPerPage
    let endIndex=startIndex+itemsPerPage
    let totalPages=Math.ceil(findProducts.length/itemsPerPage)
    const currentProduct =findProducts.slice(startIndex,endIndex)

    res.render("shop",{
      user,
      products:currentProduct,
      category:categorise,
      totalPages,
      currentpage,
      selectedCategory:category||null,
      
    })

  } catch (error) {
    res.redirect("/pageNotFound")
    
  }
}

const filterPrice=async(req,res)=>{
  try {
    const user=req.session.user
    const categorise=await Category.find({isListed:true}).lean()
    let findProducts=await Product.find({
      salePrice:{$gte:req.query.gte,$lte:req.query.lte},
      isBlocked:false,
      quantity:{$gt:0}
    }).lean()

    findProducts.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))
    let itemsPerPage=6;
    let currentpage=parseInt(req.query.page)|| 1
    let startIndex=(currentpage-1)*itemsPerPage
    let endIndex=startIndex+itemsPerPage
    let totalPages=Math.ceil(findProducts.length/itemsPerPage)
    const currentProduct=findProducts.slice(startIndex,endIndex)


    res.render("shop",{
      user,
      products:currentProduct,
      category:categorise,
      totalPages,
      currentpage
    })


  } catch (error) {
    console.log(error)
    res.redirect("/pageNotFound")
    
  }
}

const searchProducts=async(req,res)=>{
  try {
    const user=req.session.user;
  
    const search = req.body.query; 

  const categorise=await Category.find({isListed:true}).lean()
  const CategorIds= categorise.map(category=>category._id.toString())
  let searchReasult=[]

  if (search && search.length > 0) {
    
    searchReasult = await Product.find({
      name: { $regex: search, $options: "i" }, 
      quantity: { $gt: 0 }, 
    }).populate('category'); 
  } else {
    searchReasult = await Product.find({
      quantity: { $gt: 0 },
    }).populate('category');
  }

  searchReasult.sort((a,b)=>new Date(b.createdOn)-new Date(a.createOn))
  let itemsPerPage=6;
  let currentpage=parseInt(req.query.page)|| 1
  let startIndex=(currentpage-1)*itemsPerPage
  let endIndex=startIndex+itemsPerPage
  let totalPages=Math.ceil(searchReasult.length/itemsPerPage)
  const currentProduct=searchReasult.slice(startIndex,endIndex)


  res.render("shop",{
    user,
    products:currentProduct,
    category:categorise,
    totalPages,
    currentpage,
    count:searchReasult.length
  })
    
  } catch (error) {
    console.log("Error:",error)
    res.redirect("/pageNotFound")
    
  }
  


}


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
  loadwishlist,
  loadotp,
  login,
  resendOtp,
  logout,
  filteProduct,
  filterPrice,
  searchProducts,
};
