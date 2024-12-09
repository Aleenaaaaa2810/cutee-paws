const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

const loadwishlist = async (req, res) => {
  try {
   
    if (!req.session || !req.session.user) {
      return res.status(401).redirect('/login'); 
    }

    const userId = req.session.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

  
    const products = await Product.find({ _id: { $in: user.wishlist } }).populate('category');

    res.render("wishlist", { Wishlist: products });
  } catch (error) {
    console.error("Error loading wishlist:", error);
    res.status(500).redirect('/pageNotFound'); 
  }
};


const addTowishlist = async (req, res) => {
  try {
    const productId = req.body.productId;
    const userId = req.session.user && req.session.user.id; // Ensure correct user ID extraction

    if (!userId) {
      return res.status(401).json({ status: false, message: "User not logged in" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ status: false, message: "Product not found" });
    }

    if (user.wishlist.includes(productId)) {
      return res
        .status(200)
        .json({ status: false, message: "Product already in wishlist" });
    }

    user.wishlist.push(productId);
    await user.save();

    return res.status(200).json({ status: true, message: "Product added to wishlist" });
  } catch (error) {
    console.error("Error in addTowishlist:", error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
};
const deletewishlist = async (req, res) => {
  try {
    const productId = req.body.productId; // Get the productId from the request body
    const userId = req.session.user.id; // Get the user ID from the session

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    // Find the product in the user's wishlist
    const productIndex = user.wishlist.indexOf(productId);
    if (productIndex === -1) {
      return res.status(404).json({ status: false, message: 'Product not found in wishlist' });
    }

    // Remove the product from the wishlist
    user.wishlist.splice(productIndex, 1);
    await user.save();

    return res.json({ status: true, message: 'Product removed from wishlist successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};


module.exports = {
  loadwishlist,
  addTowishlist,
  deletewishlist
};
