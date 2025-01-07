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


    const relatedProducts = await Product.find({
      category: findCategory,
      _id: { $ne: productId }
    }).limit(4);

   
    res.render('product-details',{
      user:userId,
      product:product,
      quantity:product.quantity,
      totalOffer:totalOffer,
      category:findCategory, relatedProducts: relatedProducts 
    })

     
  } catch (error) {
    console.error("Error in productDetails:", error);
    res.redirect('/pageNotFound');
  }
};


const rateProduct =  async (req, res) => {
  const { productId, rating } = req.body;

  if (!productId || !rating) {
    return res.status(400).send({ error: 'Invalid request data' });
  }

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send({ error: 'Product not found' });
    }

    // Update product ratings (logic depends on your schema)
    product.ratings.push(rating);
    product.averageRating = product.ratings.reduce((a, b) => a + b) / product.ratings.length;
    await product.save();

    res.send({ averageRating: product.averageRating });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: 'Server error' });
  }
}


module.exports={
  productDetails,
  rateProduct

}