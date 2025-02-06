const User =require("../models/userSchema")
const mongoose = require('mongoose');



const userAuth = (req, res, next) => {
  if (req.session.user) {
    const userId = req.session.user.id; 

    if (mongoose.Types.ObjectId.isValid(userId)) {
      User.findById(userId)
        .then(user => {
          if (user) {
            if (!user.isBlocked) {
              next();
            } else {
              res.redirect("/logout"); 
            }
          } else {
            res.redirect("/logout"); 
          }
        })
        .catch(err => {
          console.error("Error in user auth middleware", err);
          res.status(500).send("Internal server error");
        });
    } else {
      res.redirect("/logout"); 
    }
  } else {
    res.redirect("/logout"); 
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
    res.status(500).send("Internal Server error")
  }
}






module.exports={
  userAuth,
  adminAuth,

}