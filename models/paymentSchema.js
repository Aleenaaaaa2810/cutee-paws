const mongoose = require('mongoose');

// Define the Payment Schema
const paymentSchema = new mongoose.Schema({
    paymentMethod: {
        type: String,
        enum: ['Cash on Delivery', 'Razorpay', 'Wallet'],  // Limiting payment methods
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0  // Amount should be a positive number
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],  // Possible payment statuses
        default: 'Pending'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // Reference to a User collection (if you're associating with a user)
        required: true
    },
    transactionId: {
        type: String,
        unique: true,  // Ensure each transaction has a unique ID
        required: true
    },
    paymentDate: {
        type: Date,
        default: Date.now  // Automatically sets the payment date to now
    }
});

// Create a model based on the schema
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
