const product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Cart = require('../../models/cartShema');
const User = require('../../models/userSchema');
const coupons=require('../../models/couponSchema')

const getCart = async (req, res) => {
  const userId = req.session.user;
  try {
    const cart = await Cart.findOne({ userId: userId.id }).populate('items.productId');
    console.log(JSON.stringify(cart, null, 2));

    cart.items.forEach(item => {
      
    });
    
    if (!cart) {
      console.log("Cart not found");
      return res.status(404).json({ error: 'Cart not found' });
    }

    res.render('add-to-cart', { cart });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching cart', details: error.message });
  }
};


let cart = []; 
const postCart = async (req, res) => {
  try {
    const user = req.session.user;
    const { productId, productDetails: { name, price } } = req.body;

    if (!user || !user.id) {
      return res.status(400).json({ error: "User is not logged in." });
    }

    
    if (!productId || !name || !price) {
      return res.status(400).json({ error: "Missing required fields: productId, quantity, or price." });
    }

    
    let dbCart = await Cart.findOne({ userId: user.id });

    if (!dbCart) {
      dbCart = new Cart({ userId: user.id, items: [] });
    }

    let quantity = 1;  

    
    const existingItem = dbCart.items.find(item => item.productId.toString() === productId);

    if (existingItem) {
  existingItem.quantity += quantity;
      existingItem.totalPrice = existingItem.price * existingItem.quantity;
    } else {
      
      dbCart.items.push({
        productId,
        quantity,
        price,
        totalPrice: price * quantity,
      });
    }

    
    await dbCart.save();

    res.status(200).json({ message: "Item added to cart successfully!", dbCart });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ error: "Error adding item to cart", details: error.message });
  }
};
const increaseQuantity = async (req, res) => {
  const { itemId } = req.body;
  try {
    const user = req.session.user;
    const dbCart = await Cart.findOne({ userId: user.id });

    if (!dbCart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const item = dbCart.items.find(item => item._id.toString() === itemId);
    
    // Check if item is found and if its quantity is less than 5
    if (item) {
      if (item.quantity < 5) {
        item.quantity += 1;
        item.totalPrice = item.price * item.quantity;
        await dbCart.save();
        return res.status(200).json({ message: "Item quantity increased", dbCart });
      } else {
        return res.status(400).json({ error: "Maximum quantity reached (5)" });
      }
    } else {
      return res.status(404).json({ error: "Item not found in cart" });
    }
  } catch (error) {
    console.error("Error increasing quantity:", error);
    res.status(500).json({ error: "Error increasing quantity", details: error.message });
  }
};


const decreaseQuantity = async (req, res) => {
  const { itemId } = req.body;
  try {
    const user = req.session.user;
    const dbCart = await Cart.findOne({ userId: user.id });

    if (!dbCart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const item = dbCart.items.find(item => item._id.toString() === itemId);
    if (item) {
      if (item.quantity > 1 &&item.quantity  ) {
        item.quantity -= 1;
        item.totalPrice = item.price * item.quantity;
        await dbCart.save();
        res.status(200).json({ message: "Item quantity decreased", dbCart });
      } else {
        res.status(400).json({ error: "Cannot decrease quantity below 1" });
      }
    } else {
      res.status(404).json({ error: "Item not found in cart" });
    }
  } catch (error) {
    console.error("Error decreasing quantity:", error);
    res.status(500).json({ error: "Error decreasing quantity", details: error.message });
  }
};

const removeCart = async (req, res) => {
  const userId = req.session.user;
  const { itemId } = req.body;

  try {
    const cart = await Cart.findOne({ userId: userId.id });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    
    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    
    cart.items.splice(itemIndex, 1);

    
    await cart.save();

    
    res.json({
      success: true,
      message: 'Item removed from cart',
      newCartTotal: cart.totalPrice 
    });
  } catch (error) {
    console.error("Error removing item:", error);
    res.status(500).json({ success: false, message: 'Error removing item', details: error.message });
  }
};





module.exports = {
  getCart,
  postCart,
  increaseQuantity,
  decreaseQuantity,
  removeCart,

  
};
