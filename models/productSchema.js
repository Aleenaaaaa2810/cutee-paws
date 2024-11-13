const { default: mongoose } = require("mongoose");
const monngoose=require("mongoose")
const {Schema}=mongoose;

const productSchema =new Schema({
  productSchema:{
    type:String,
    required:true, 
  },
   
  description:{
    type:String,
    required:true,
  },

  brand:{
    type:String,
    required:true
  },
  category:{
    type:Schema.Types.ObjectId,
    ref:"Category",
    required:true
  },
  regularPrice:{
    type:Number,
    required:true
  },

  salePrice:{
    type:Number,
    default:0
  },
  productoffer:{
    type:Number,
    default:0
  },
  quantity:{
    type:Number,
    default:true
  },
  color:{
    type:String,
    required:true
  },
  productImage:{
    type:[String],
    required:true
  },
  isBlocked:{
    type:Boolean,
    default:false
  },
  status:{
   type:String,
   enum:["Available","out of stock","Discountined" ],
   required:true,
   default:"Avilable"
  },

},{Timestamp:true})


const Product = mongoose.model("Product", productSchema);

module.exports=Product;