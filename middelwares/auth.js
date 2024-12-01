const User =require("../models/userSchema")

const userAuth =(req,res,next)=>{
  if(req.session.user){
    User.findById(req.session.user)
    .then(data=>{
      if(data && !data.isBlocked){
        next();

      }else{
        res.redirect("/login")
      }
    })
    .catch(error=>{
      console.log("Error in user auth middleware")
      res.status(500).send("Internal server error")
    })
  }
  else{
    res.redirect("/login")
  }
}

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
  adminAuth
}