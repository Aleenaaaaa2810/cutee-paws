const mongoose=require("mongoose");
const env=require("dotenv").config();


const connectDB =async()=>{
  try {
      await mongoose.connect(process.env.MONGODB_URL)//mongodb connect
     console.log("db connected")
  }
    catch(error){
   console.log('Db connection error.message')
   process.exit(1)//exit
    }
  }


  module.exports=connectDB;