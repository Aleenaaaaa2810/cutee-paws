const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')

const productDetails = async (req, res) => {
  try {
    
    const userId=req.session.user
    const productId=req.query.id
    const product=await Product.findById(productId).populate('category')
    const findCategory=product.category
    const cateoryOffer=findCategory?.category||0
    const productOffer=product.productOffer
    totalOffer=cateoryOffer+productOffer
   
    res.render('product-details',{
      user:userId,
      product:product,
      quantity:product.quantity,
      totalOffer:totalOffer,
      category:findCategory
    })

     
  } catch (error) {
    console.error("Error in productDetails:", error);
    res.redirect('/pageNotFound');
  }
};


module.exports={
  productDetails,

}