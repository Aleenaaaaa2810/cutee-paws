const { default: mongoose } = require("mongoose");
const monngoose=require("mongoose")
const {Schema}=mongoose;

const productSchema = new Schema({
  name: { 
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },

  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  regularPrice: {
    type: Number,
    required: true,
  },
  salePrice: {
    type: Number,
    default: 0,
  },

  quantity: { 
    type: Number, 
    required: true,
    //  default: 0 
    },

  productImage: {
    type: [String], 
    required: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["Available", "Out of Stock", "Discontinued"], // Fixed typos in options
    required: true,
    default: "Available",
  },
}, 
{ timestamps: true }); 



const Product = mongoose.model("Product", productSchema);

module.exports=Product;