const express = require('express');
const router = express.Router();
const passport = require('passport');
const profilecontroller=require('../controllers/user/profilecontroller')
const userController = require("../controllers/user/userController");

// Utility for handling async errors (optional)
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Page not found route
router.get("/pageNotFound", asyncHandler(userController.pageNotFound));

// Nav routes
router.get("/", asyncHandler(userController.loadHomepage));
router.get("/shop", asyncHandler(userController.loadshop));
router.get("/about", asyncHandler(userController.loadabout));
router.get("/cart", asyncHandler(userController.loadcart));
router.get("/contact", asyncHandler(userController.loadcontact));
router.get("/wishlist", asyncHandler(userController.loadwishlist));
router.get("/otp", asyncHandler(userController.loadotp));

// Signup routes
router.get("/signup", asyncHandler(userController.loadsignup));
router.post("/signup", asyncHandler(userController.signup));

// OTP verification routes
router.post("/verify-otp", asyncHandler(userController.verifyOtp));
router.post("/resendotp", asyncHandler(userController.resendOtp));

// Login routes
router.get("/login", asyncHandler(userController.loadLogin));
router.post("/login", asyncHandler(userController.login));
router.get("/logout", userController.logout);


// Google OAuth routes
router.get("/auth/google", passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/auth/google/callback', passport.authenticate("google", {
  failureRedirect: "/login", // Redirect to login page on failure
}),
(req, res) => {
  // On successful login
  if (req.user) {
    // Store user info in session (if using sessions)
    req.session.user = {
      name: req.user.name, // Assuming `req.user` has a `name` property
      email: req.user.email,
      id: req.user.id,
    };

    res.redirect("/"); // Redirect to homepage
  } else {
    res.redirect("/login"); // Fallback if no user data
  }
}
);

//profileController
router.get('/forgot-password',profilecontroller.getForgotPassword)
router.post('/forgot-email-vaild',profilecontroller.forgotemailvaild)
router.post('/verify-passForgot-otp',profilecontroller.verifyForgotpassOtp)
router.get("/reset-password",profilecontroller.getResetpass)
router.post('/resend-forgot-otp',profilecontroller.resendOtp)
router.post('/reset-password',profilecontroller.postNewpassword)

router.get('/profile',profilecontroller.userprofile)
router.get('/change-email',profilecontroller.changeEmail)
router.post('/change-email',profilecontroller.changeEmailValid)
router.post('/verify-email-otp',profilecontroller.verifyEmailOtp)
router.post('/update-email',profilecontroller.updateemail)
router.get('/change-password',profilecontroller.changepassword)
router.post('/change-password',profilecontroller.changepasswordVaild)
router.post('/verify-changepassword-otp',profilecontroller.verifyChangepassOtp)

router.get('/addAddress',profilecontroller.addAddress)
router.post('/addAddress',profilecontroller.postAddAddress)
router.get('/edit-address',profilecontroller.editAddress)
router.post('/edit-Address',profilecontroller.posteditAddress)
router.get("/deleteAddress",profilecontroller.deleteAddress)

router.get("/filter",userController.filteProduct)
router.get("/filterPrice",userController.filterPrice)
router.post("/search",userController.searchProducts)



module.exports = router;
