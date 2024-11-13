const mongoose=require("mongoose")
const {Schema}=mongoose;



const userSchema= new Schema({
  name:{
    type:String,
    required:true
  },
  email:{
    type:String,
    required:true,
    unique:true
  },
  phone:{
    type:String,
    required:false,
    unique:false,
    sparse:true,
    default:null // single sign up -no phonenumber
  },

  googleId:{
    type:String,
    unique:true
  },

  password:{
    type:String,
    required:false//sigle signup-nouse password
  },

  isBlocked:{
    type:Boolean,
    default:false
  },

  isAdmin:{
    type:Boolean,
    default:false
  },

  cart:[{
    type:Schema.Types.ObjectId,
  ref:"cart",
}],

wallet:{
  type:Number,
  default:0
},
wishlist:[{
  type:Schema.Types.ObjectId,
  ref:"wishlist"
}],

orderHistory:[{
  type:Schema.Types.ObjectId,
  ref:"Order"
}],

createdOn:{
  type:Date,
  default:Date.now
},

referalCode:{
  type:String
},

redeemed:{
  type:Boolean
},

redeemedUsers:[{
  type:Schema.Types.ObjectId,
  ref:"User"
}],

searchHistory:[{
  category:{
    type:Schema.type.ObjectId,
    ref:"Category",
  },
  brand:{
    type:String
  },
  searchOn:{
    type:Date,
    default:Date.now
  }
}]
})





const User =mongoose.model("User",userSchema);
module.exports =user