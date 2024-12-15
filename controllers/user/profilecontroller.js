const User = require('../../models/userSchema');
const Address=require('../../models/addressSchema')
const nodemailer=require('nodemailer')
const bcrypt=require('bcrypt')
const env=require('dotenv').config()
const session=require("express-session")
const mongoose = require('mongoose'); 

function generateOTP(){
  const digits="1234567890"
  let otp='';
  for(let i=0;i<6;i++){
    otp+=digits[Math.floor(Math.random()*10)]
  }
  return otp
}

const sendVerificationEmail=async (email,otp)=>{
  try {
    const transporter=nodemailer.createTransport({
      service:"gmail",
      port:587,
      secure:false,
      requireTLS:true,
      auth:{
        user:process.env.NODEMAILER_EMAIL,
        pass:process.env.NODEMAILER_PASSWORD,

      }

   } )
   const mailOptions={
    from:process.env.NODEMAILER_EMAIL,
    to:email,
    subject:"Your otp for password reset",
    text:`your otp is ${otp}`,
    html:`<b><h4>Your OTP:${otp}</h4><br></b>`

   }
    
   const info = await transporter.sendMail(mailOptions);

   console.log("Email.sent:info.messageId")
   return true

  } catch (error) {
    
    console.error("error sending email ",error)
    return false
  }
}

const securePassword=async(password)=>{
  try {
    return passwordHash
    
  } catch (error) {
    
  }
}



const getForgotPassword = async (req, res) => {
  try {
    res.render('forgot-password'); 
  } catch (error) {
    console.error('Error rendering forgot-password page:', error);
    res.redirect('/pageNotFound'); 
  }
};


const forgotemailvaild =async(req,res)=>{
try {
  const{email}=req.body
  const findUser=await User.findOne({email})
  if(findUser){
    const otp=generateOTP()
    const emailSent=await sendVerificationEmail(email,otp);
    if(emailSent){
      req.session.userOtp=otp
      req.session.email=email
      res.render("forgotPass-otp")
      console.log("OTP:",otp)
    }else{
      res.json({success:false,message:"failed to send otp.please try again"})
    }

  }else{
    res.render("forgot-password", { message: "User with this email does not exist" });
  }
} catch (error) {
  res.redirect("/pageNotFound");
  
}
}

const verifyForgotpassOtp =async(req,res)=>{
  try {
    const enteredOtp=req.body.otp
    console.log("Entered OTP:", req.body.otp);
console.log("Session OTP:", req.session.userOtp);
    if(enteredOtp === req.session.userOtp){
      console.log(enteredOtp === req.session.userOtp)
      res.json({success:true,redirectUrl:"/reset-password"})
    }else{
      res.json({success:false,message:"OTP not matching"})
    }
  } catch (error) {
    res.status(500).json({success:false,message:"an error occured.please try again"})
    
  }
}


const userprofile = async (req, res) => {
  try {
    const userId = req.session.user?.id; 
    console.log(userId);

   
    if (!userId) {
      console.error('User session not found. Redirecting to login.');
      return res.redirect('/login');
    }

    // Validate and convert the userId to an ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Invalid User ID format.');
      return res.redirect('/pageNotFound');
    }
    const objectId = new mongoose.Types.ObjectId(userId);

    
    const userData = await User.findById(objectId);
    console.log(userData);
    console.log('User ID:', userId);

    if (!userData) {
      console.error('User not found in the database.');
      return res.redirect('/pageNotFound');
    }

    
    const addressData = await Address.findOne({ userId: objectId });

    
    res.render('profile', {
      user: userData,
      userAddress: addressData,
    });
  } catch (error) {
    console.error('Error retrieving profile data:', error);
    res.redirect('/pageNotFound');
  }
};


const getResetpass =async(req,res)=>{
  try {
    res.render("reset-password")
    
  } catch (error) {
    res.redirect("/pageNotFound")
    
  }
}

const resendOtp = async (req, res) => {
  try {
    const otp = generateOTP(); 
    req.session.userOtp = otp; 
    const email = req.session.email; 

    console.log("Resend OTP to email:", email);

    
    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
      console.log("Resent OTP:", otp);
      res.status(200).json({ success: true, message: "Resend OTP successful" });
    } else {
      res.status(500).json({ success: false, message: "Failed to resend OTP" });
    }
  } catch (error) {
    console.error("Error in resendOtp:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const postNewpassword = async (req, res) => {
  try {
   
    const { newPass1, newPass2 } = req.body;
    const email = req.session.email;
    console.log( req.body)

    
    if (!email) {
      console.error("Session email is missing.");
      return res.render("reset-password", {
        message: "Session expired. Please restart the process.",
      });  
    }
    if (!newPass1 || !newPass2) {
      console.log(newPass1!=="" || newPass2!=="")
      return res.render("reset-password", {
        message: "Passwords cannot be empty.",
      });  
    }

   
    if (newPass1 !== newPass2) {
      return res.render("reset-password", {
        message: "Passwords do not match.",
      });
    }

 
    const passwordHash=await bcrypt.hash(newPass1,10)

  
    console.log(passwordHash)
    const user=await User.findOne({email})
    console.log(user)
    await User.updateOne({ email }, { $set: { password: passwordHash } });

    console.log("Password updated successfully for email:", email);

 
    res.redirect("/login?message=Password+reset+successful");
  } catch (error) {
    console.error("Error in postNewpassword:", error);
    res.render("reset-password", {
      message: "An error occurred while resetting the password. Please try again.",
    });
  }
};


const changeEmail=async(req,res)=>{
  try {
    res.render("change-email")
  } catch (error) {
    res.redirect("/pageNotfound")
    
  }
}

 const changeEmailValid=async(req,res)=>{
  try {
    const {email}=req.body
    const userExists=await User.findOne({email})
    if(userExists){
      const otp=generateOTP()
      const emailSent=await sendVerificationEmail(email,otp)
      if(emailSent){
        req.session.userOtp=otp
        req.session.userData=req.body
        req.session.email=email
        res.render('change-emailOtp')
        console.log("Email sented:",email)
        console.log("Otp",otp);
        

      }else{
        res.json("email-error")
      }
    }else{
      res.render("change-email")
      message:"user with this mail not exist"
    }
  } catch (error) {
    res.redirect("pageNotFound")
    
  }
 }


 const verifyEmailOtp=async(req,res)=>{
  try {
    const  enteredOtp=req.body.otp;
    if(enteredOtp===req.session.userOtp){
      req.session.userData=req.body.userData
      res.render('new-email',{
        userData:req.session.userData
      })
    }else{
      res.render('change-email-otp',{
        message:"OTP not matching",
        userData:req.session.userData
      })
    }
  } catch (error) {
    res.redirect("/pageNotFound")
    
  }
 }

 const updateemail = async (req, res) => {
  try {
    console.log("hi"); 
    const newEmail = req.body.newEmail;
    console.log("hi"); 
    const userId = req.session.user.id;
    await User.findByIdAndUpdate(userId, { email: newEmail });
    res.redirect('/profile');
  } catch (error) {
    console.error(error); 
    res.redirect("pageNotFound");
  }
};

 const changepassword=async(req,res)=>{
  try {
    res.render('change-password')
    
  } catch (error) {
    res.redirect("/pageNotFound")
    
  }
 }

 const changepasswordVaild=async(req,res)=>{
  try {
    const {email}=req.body
    const userExists =await User.findOne({email})
    if(userExists){
      const otp=generateOTP()
      const emailSent=await sendVerificationEmail(email,otp)
      if(emailSent){
        req.session.userOtp=otp
        req.session.userData=req.body;
        req.session.email=email
        res.render("change-password-otp")
        console.log("OTP:",otp)
      }else{
        res.json({
          success:false,
          message:"failed to send OTP. please try again"
        })
      }
    }else{
      res.render("change-password",{
        message:"user with this emial does not exist"
      })
    }
    
  } catch (error) {
    console.log("Error in changedpassword validation",Error)
    res.redirect("/pageNotFound")
    
  }
 }

const verifyChangepassOtp=async(req,res)=>{
  
  try {
    const enteredOtp=req.body.otp;
    if(enteredOtp===req.session.userOtp){
      res.json({success:true,redirectUrl:'/reset-password'})
    }else{
      res.json({success:false,message:"OTP not matching"})
    }
    
  } catch (error) {
    res.status(500).json({success:false,message:"An error occure. please try again later"})
    
  }
  
}


const addAddress=async(req,res)=>{
  try {
    const user=req.session.user;
    res.render("add-address",{user:user})
  } catch (error) {
    res.redirect("/pageNotFound")
  }
}


const postAddAddress = async (req,res) => {
  try {
    const userId = req.session.user?.id;
    console.log(userId)
    console.log(req.session)

    if (!userId) {
      return res.redirect("/login");
    }
    console.log("hai")
    const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;
    console.log(req.body)

    if (!addressType || !name || !city || !state ||!landMark || !pincode || !phone || !altPhone) {
      console.error("Missing required fields in request body");
      return res.status(400).send("All required fields must be filled.");
    }

   
    let userAddress = await Address.findOne({ userId });

    if (!userAddress) {
     
      const newAddress = new Address({
        userId,
        address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone }],
      });
      await newAddress.save();
      console.log("New address added for user:", userId);
    } else {
      
      userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone });
      await userAddress.save();
      console.log("Address appended for user:", userId);
    }

    res.redirect("/profile");
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).redirect("/pageNotFound");
  }
};


const editAddress = async (req, res) => {
  try {
    console.log("Edit address function called");

    const addressId = req.query.id; 
    console.log("Address ID:", addressId);

    const user = req.session.user;
    if (!user) {
      console.error("No user session found.");
      return res.redirect("/login");
    }

    
    const userId = user.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("Invalid User ID format.");
      return res.redirect("/pageNotFound");
    }

    
    const currentAddress = await Address.findOne({
      userId,
      "address._id": addressId,
    });

    console.log("Current Address Found:", currentAddress);

    if (!currentAddress) {
      console.error("No address found in the database for the given ID");
      return res.status(404).send("Address not found.");
    }

   
    const addressToEdit = currentAddress.address.find(
      (addr) => addr._id.toString() === addressId
    );

    if (!addressToEdit) {
      console.error("Address ID not found in user's address list.");
      return res.status(404).send("Address not found.");
    }

    
    res.render("edit-address", {
      user: user,
      address: addressToEdit,
    });
  } catch (error) {
    console.error("Error editing address:", error);
    res.redirect("/pageNotFound");
  }
};

const posteditAddress = async (req, res) => {
  try {
    const data = req.body;
    const addressId = req.query.id;
    const user = req.session.user;

    
    const findAddress = await Address.findOne({ "address._id": addressId });
    if (!findAddress) {
      
      return res.redirect("/pageNotFound"); 
    }

  
    await Address.updateOne(
      { "address._id": addressId }, 
      {
        $set: {
          "address.$.addressType": data.addressType,
          "address.$.name": data.name,
          "address.$.city": data.city,
          "address.$.landMark": data.landMark,
          "address.$.state": data.state,
          "address.$.pincode": data.pincode,
          "address.$.phone": data.phone,
          "address.$.altphone": data.altphone,
        },
      }
    );

    res.redirect("/profile"); 
  } catch (error) {
    console.error("Error in edit address:", error);
    res.redirect("/pageNotFound");
  }
};

 const deleteAddress =async(req,res)=>{
  console.log("hy");
  
  try {
    const addressId=req.query.id
    console.log(addressId)
    const user = req.session.user;
    console.log(req.session)

    const findAddress=await Address.findOne({"address._id":addressId})
    if(!findAddress){
      console.log("noo")
      return res.status(404).send("Address not found")
    }console.log("update")
    await  Address.updateOne({
     
      "address._id":addressId
    }, {
  $pull:{
    address:{
      _id:addressId
    }
    }
  })
  res.redirect('/profile')
  } catch (error) {
    console.error("Error in delete address",error)
    res.redirect("/pageNotFound")
    
  }
 }
 


module.exports = {
  userprofile, 
  getForgotPassword,
  forgotemailvaild,
  verifyForgotpassOtp,
  resendOtp,
  getResetpass,
  postNewpassword,
  changeEmail,
  changeEmailValid,
  verifyEmailOtp,
  updateemail,
  changepassword,
  changepasswordVaild,
  verifyChangepassOtp,
  addAddress,
  postAddAddress,
  editAddress,
  posteditAddress,
  deleteAddress
};
