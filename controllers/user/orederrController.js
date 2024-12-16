const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Cart = require('../../models/cartShema');
const Address = require('../../models/addressSchema');
const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Coupon=require('../../models/couponSchema')
const Wallet=require('../../models/walletSchema')
const { v4: uuidv4 } = require('uuid'); 

const getorder = async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    const coupon= await Coupon.find({})
    console.log(coupon)

    // Check if user is authenticated
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized access.' });
    }

    console.log('User ID:', userId);

    
    const userAddress = await Address.find({ userId });

   
    const cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!cart || cart.items.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart is empty.' });
    }

    
    const totalPrice = cart.items.reduce((total, item) => total + item.quantity * item.price, 0);
   

    
    res.render('order', { userAddress: userAddress || [], cart, totalPrice ,coupon});
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Internal Server Error');
  }
};


const postorder = async (req, res) => {
  try {
    const { items, totalPrice, addressId } = req.body;

    // Parse items if received as a string
    let parsedItems;
    try {
      parsedItems = typeof items === "string" ? JSON.parse(items) : items;
    } catch (error) {
      return res.status(400).json({ success: false, message: "Invalid items format." });
    }

    // Validate input
    if (!parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
      return res.status(400).json({ success: false, message: "Ordered items are required." });
    }

    if (!totalPrice || isNaN(totalPrice)) {
      return res.status(400).json({ success: false, message: "Total price is invalid or missing." });
    }

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ success: false, message: "Invalid address ID." });
    }

    const userId = req.session?.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized access." });
    }


    

    // Map cart items to order format
    const orderedItems = parsedItems.map((item) => ({
      product: item.productId?._id || item.productId,
      quantity: item.quantity,
      price: item.price,
    }));

    // Save order
    const newOrder = new Order({
      user: userId,
      orderedItems,
      totalPrice,
      finalAmount: totalPrice,
      address: addressId,
      status: "Pending",
      invoiceDate: new Date(),
      createdOn: new Date(),
    });

    await newOrder.save();


    for (const item of orderedItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        console.warn(`Product not found for ID: ${item.product}`);
        continue;
      }

      // Increase the product quantity
      product.quantity -= item.quantity;
      await product.save();
    }

    // Delete items from cart
    const cart = await Cart.findOne({ userId });
    console.log("cart:",cart)
    if (cart) {
      cart.items = []; 
      await cart.save();
    }

    // Respond with success
    res.status(200).json({
      success: true,
      message: "Checkout successful, cart is now empty",
      orderId: newOrder._id,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ success: false, message: "Failed to place order. Please try again." });
  }
};


const orderPage = async (req, res) => {
  try {
    const userId = req.session?.user?.id;
   
    const order = await Order.findOne({ user: userId })
      .sort({ createdOn: -1 }) 
      .lean();

    if (!order) {
      return res.status(404).send('Order not found!');
    }

    res.render('orderplaced', {
      orderId: order.orderId,
      orderDate: order.createdOn.toLocaleDateString(),
      totalPrice: order.finalAmount,
      status: order.status,
    });
  } catch (error) {
    console.error('Error rendering order page:', error);
    res.status(500).send('An error occurred while rendering the order page.');
  }
};

const profileOderget = async (req, res) => {
  try {
    const userId = req.session?.user?.id;

    const orders = await Order.find({ user: userId })
      .sort({ createdOn: -1 }) // Fetch all orders in descending order
      .populate('orderedItems.product') // Populate product details
      .lean();

    if (!orders || orders.length === 0) {
      return res.render('profileOrderpage', { orders: [] }); // Pass empty array if no orders
    }

    res.render('profileOrderpage', { orders });
  } catch (error) {
    console.error('Error rendering orders page:', error);
    res.status(500).send('An error occurred while rendering the orders page.');
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).send('Order ID is required.');
    }

    if (!req.session?.user?.id) {
      return res.status(401).send('User not logged in.');
    }

    const order = await Order.findOne({ orderId: orderId, user: req.session.user.id });
    console.log(order);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or you do not have permission to cancel this order.' });
    }

    if (order.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'This order has already been cancelled.' });
    }

    // Proceed with cancellation
    order.status = 'Cancelled';
    await order.save();

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found.' });
    }

    wallet.balance += order.finalAmount;

    wallet.transactions.push({
      transactionId: uuidv4(),
      description: 'Refund for order cancellation',
      amount: order.finalAmount,
      date: new Date(),
    });

    await wallet.save();

    return res.status(200).json({ success: true, message: 'Order successfully cancelled and amount added to wallet.' });

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).send('An error occurred while cancelling the order.');
  }
};


const returnorder = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).send('Order ID is required.');
    }

    if (!req.session?.user?.id) {
      return res.status(401).send('User not logged in.');
    }

    const order = await Order.findOne({ orderId: orderId, user: req.session.user.id });
    console.log(order);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or you do not have permission to return this order.' });
    }

    // Ensure the order is in the "Delivered" status to allow return
    if (order.status !== 'Delivered') {
      return res.status(400).json({ success: false, message: 'Only delivered orders can be returned.' });
    }

    // Update the order status to "Returned"
    order.status = 'Returned';
    await order.save();

    return res.status(200).json({ success: true, message: 'Order successfully returned.' });

  } catch (error) {
    console.error('Error returning order:', error);
    res.status(500).send('An error occurred while returning the order.');
  }
};








module.exports = {
  getorder,
  postorder,
  orderPage,
  profileOderget,
  cancelOrder,
  returnorder,
};