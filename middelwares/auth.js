const User =require("../models/userSchema")
const mongoose = require('mongoose');



const userAuth = (req, res, next) => {
  if (req.session.user) {
    const userId = req.session.user.id; // Access the `id` property instead of the entire `user`

    // Ensure userId is a valid ObjectId before querying
    if (mongoose.Types.ObjectId.isValid(userId)) {
      User.findById(userId)
        .then(user => {
          if (user) {
            if (!user.isBlocked) {
              next(); // User is not blocked, proceed
            } else {
              res.redirect("/logout"); // Blocked user, redirect to login
            }
          } else {
            res.redirect("/logout"); // User not found, redirect to login
          }
        })
        .catch(err => {
          console.error("Error in user auth middleware", err);
          res.status(500).send("Internal server error");
        });
    } else {
      console.log("Invalid ObjectId:", userId);
      res.redirect("/logout"); // Invalid ObjectId, redirect to login
    }
  } else {
    res.redirect("/logout"); // No session, redirect to login
  }
};




const adminAuth= async (req,res,next)=>{
  try{
  if(req.session.admin){
      next();
    }else{
      res.redirect("/admin/login")
    }
  }
  catch(error){
    console.log("Error in adminauth middelware",error)
    res.status(500).send("Internal Server error")
  }
}






module.exports={
  userAuth,
  adminAuth,

}