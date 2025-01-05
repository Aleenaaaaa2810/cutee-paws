const express = require('express');
const router = express.Router();
const passport = require('passport');
const profilecontroller=require('../controllers/user/profilecontroller')
const userController = require("../controllers/user/userController");
const productController=require('../controllers/user/productController')
const cartController=require('../controllers/user/cartController')
const orederrController=require('../controllers/user/orederrController')
const wishlistController=require('../controllers/user/wishlistController')
const walletController=require('../controllers/user/walletController')
const paymentController=require('../controllers/user/paymentcontroller')
const { userAuth } = require("../middelwares/auth");



// Utility for handling async errors (optional)
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Page not found route
router.get("/pageNotFound", asyncHandler(userController.pageNotFound));

// Nav routes
router.get("/", asyncHandler(userController.loadHomepage));
router.get("/shop",userAuth, asyncHandler(userController.loadshop));
router.get("/about",userAuth, asyncHandler(userController.loadabout));
router.get("/cart", userAuth,asyncHandler(userController.loadcart));

router.get("/contact",userAuth, asyncHandler(userController.loadcontact));
router.get("/otp",userAuth, asyncHandler(userController.loadotp));

// Signup routes
router.get("/signup", asyncHandler(userController.loadsignup));
router.post("/signup", asyncHandler(userController.signup));

// OTP verification routes
router.post("/verify-otp", asyncHandler(userController.verifyOtp));
router.post("/resendotp", userController.resendOtp);

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

    res.redirect("/"); 
  } else {
    res.redirect("/login"); 
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

router.get('/profile',userAuth,profilecontroller.userprofile)
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

router.get('/productDetails',userAuth,productController.productDetails)
router.post('/rate-product', productController.rateProduct);

router.get('/cartPage',userAuth,cartController.getCart)
router.post('/cart/add',userAuth,cartController.postCart);
router.post('/cart/increase', cartController.increaseQuantity);
router.post('/cart/decrease', cartController.decreaseQuantity);
router.post('/remove-item',cartController.removeCart);



router.get('/Order',userAuth,orederrController.getorder)
router.post('/submitOrders',userAuth,orederrController.postorder)
router.get('/orderSummary',userAuth,orederrController.orderPage)
router.get('/profileOrder',userAuth,orederrController.profileOderget)
router.post('/cancel-order',userAuth,orederrController.cancelOrder)
router.post ('/return-order',userAuth,orederrController.returnorder)

router.get('/getOrderDetails/:orderId',userAuth, orederrController.getOrderDetails)
router.post('/updatePaymentStatus/:orderId',userAuth, orederrController.updatePaymentStatus)


router.post('/payment',userAuth,paymentController.onlinepayment)
router.get('/wishlist',userAuth,wishlistController.loadwishlist)
router.post('/addTowishlist',userAuth,wishlistController.addTowishlist)
router.post('/removefromwishlist',userAuth, wishlistController.deletewishlist);

router.get("/wallet",userAuth, walletController.getWallet);
router.post("/addwallet",userAuth, walletController.addMoney);
router.post('/wallet-payment',userAuth,walletController.walletpay)

router.get('/invoice/:orderId', userAuth, orederrController.generateInvoicePDF);










module.exports = router;
