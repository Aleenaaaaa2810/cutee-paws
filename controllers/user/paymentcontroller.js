require('dotenv').config();
const Razorpay = require('razorpay');

const Payment = require('../../models/paymentSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Cart = require('../../models/cartShema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema');

function ensureLoggedIn(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

const onlinepayment = async (req, res) => {
    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_ID_KEY,
        key_secret: process.env.RAZORPAY_SECRET_KEY,
    });

    const options = {
        amount: req.body.amount * 100, 
        currency: req.body.currency || "INR",
        receipt: `receipt_${Date.now()}`,
        payment_capture: 1, 
    };
    


    try {
       
        const response = await razorpay.orders.create(options);

        res.json({
            order_id: response.id,
            currency: response.currency,
            amount: response.amount,
        });
    } catch (err) {
        console.error("Razorpay Order Creation Error:", err);
        res.status(400).send("Unable to create order. Please try again!");
    }
};

module.exports = {
    onlinepayment,
    ensureLoggedIn
};
