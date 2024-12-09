const coupon =require('../../models/couponSchema')



const loadcoupon=async(req,res)=>{
try {
  return res.render('coupon')
  
} catch (error) {
  res.redirect('/pageNotFound')
  
}
}

const createcoupon=async(req,res)=>{
  try {
    
  } catch (error) {
    
  }
}


module.exports={
  loadcoupon,
  createcoupon
}