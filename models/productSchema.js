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
    },

  productImage: {
    type: [String], 
    required: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  ratings: {
    type: [Number], 
    default: [],
  },
  averageRating: {
    type: Number, 
    default: 0,
  },

  status: {
    type: String,
    enum: ["Available", "Out of Stock", "Discontinued"], 
    required: true,
    default: "Available",
  },
  productOffer:{
    type:Number,
    default:0
},
salesCount: {
  type: Number, 
  default: 0,
},

}, 
{ timestamps: true }); 



const Product = mongoose.model("Product", productSchema);

module.exports=Product;