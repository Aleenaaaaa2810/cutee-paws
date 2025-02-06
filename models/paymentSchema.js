const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentMethod: {
        type: String,
        enum: ['Cash on Delivery', 'Razorpay', 'Wallet'],  
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0  
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],  
        default: 'Pending'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  
        required: true
    },
    transactionId: {
        type: String,
        unique: true,  
        required: true
    },
    paymentDate: {
        type: Date,
        default: Date.now  
    }
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
