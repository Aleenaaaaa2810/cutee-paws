const User= require("../../models/userSchema")
const mongoose =require("mongoose");
const bcrypt =require("bcrypt")
const Swal = require('sweetalert2');


const pageerror= async (req,res)=>{
  res.render("admin-error")
}


const loadLogin = (req, res) => {
 
  if (req.session.admin) {
    return res.redirect("/admin/dashboard"); 
  }
  res.render("admin-login", { message: null });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true });

    if (admin) {
      if (password === admin.password) {
        req.session.admin = true;
        return res.redirect("/admin");
      } else {
        
        return res.render("admin-login", {
          message: 'Incorrect password. Please try again.',
        });
      }
    } else {
    
      return res.render("admin-login", {
        message: 'Admin not found. Please check your email and try again.',
      });
    }
  } catch (error) {
    console.log("login error", error);
    return res.redirect("/pageerror");
  }
};


const loadDashboard =async (req,res)=>{
  if(req.session.admin){
    try {
      res.render("dashboard")
    } catch (error) {
      return res.redirect("/admin/pageerror"); 
    }
  }
}


const logout = async (req, res) => {
  try {
    req.session.destroy((error) => {
      if (error) {
        console.log("Error destroying session", error);
        return res.redirect("/pageerror");
      }
       return res.redirect("/admin/login"); 
    });
  } catch (error) {
    console.log("Unexpected error during logout", error);
    res.redirect("/pageerror");
  }
};


module.exports = {
  loadLogin,
  login,
  loadDashboard,
  pageerror,
  logout


};



