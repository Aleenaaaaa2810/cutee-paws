const mongoose = require("mongoose");
const {Schema} = mongoose;
const {v4:uuidv4} = require('uuid');
const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  orderedItems: [{
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
   
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      default: 0
    }
  }],
  totalPrice: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number,
    required: true
  },
  address: {
    type: Schema.Types.ObjectId,
    ref: 'Address',
    required: true
  },
  invoiceDate: {
    type: Date
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested','Returned']
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true
  },
  paymentMethod:{
    type: String,
    required: true,
    enum: ['Cash on Delivery', 'Razorpay', 'Wallet'],  // Limiting payment methods

  },
  
  returnRequested: { 
    type: Boolean, 
    default: false 
  },  

  returnReason: {
    type: String,
    default: '',
    validate: {
      validator: function(value) {
        if (this.returnRequested && !value) {
          return false;
        }
        return true;
      },
      message: 'Return reason is required when return is requested'
    }
  },razorpayDetails: {  
        paymentId: String,
        orderId: String,
        signature: String,
        paymentStatus: String  
    },
    cancelReason: {
    type: String,
    required: false  
  }
});
   


const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
