const mongoose=require('mongoose');
const {Schema} =mongoose;


const addressSchema= new Schema ({
  userId:{
    type:Schema.Types.ObjectId,
    ref:"User",
    required:true
  },

  address:[{
    addressType:{
      type:String,
      required:true,
    },
    name:{
      type:String,
      required:true,
    },
    city:{
      type:Sting,
      required:true,

    },
    landMark:{
      type:Sting,
      required:true
    },
    state:{
      type:String,
      required:true
    },
    phone:{
      type:Sting,
      required:true
    },
    pincode:{
      type:Sting,
      required:true
    },

    altphone:{
      type:String,
      required:true
    }

  }]
})


const Address =mongoose.model("Address",addressSchema)

module.exports=Address