const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Cart = require('../../models/cartShema');
const Address = require('../../models/addressSchema');
const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');

const getorder = async (req, res) => {
  try {
    const userId = req.session?.user?.id;

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

    
    res.render('order', { userAddress: userAddress || [], cart, totalPrice });
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
    const { orderId } = req.body; // Extract orderId from request body
    // Check if orderId is provided
    if (!orderId) {
      return res.status(400).send('Order ID is required.');
    }

    // Ensure the user is logged in (session exists)
    if (!req.session?.user?.id) {
      return res.status(401).send('User not logged in.');
    }

    // Find the order by orderId (use _id instead of orderId)
    const order = await Order.findOne({ orderId: orderId, user: req.session.user.id });
    console.log(order)

    // Check if the order was found
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or you do not have permission to cancel this order.' });
    }

    // Check if the order is already cancelled or not in a cancellable status
    if (order.status === 'Cancelled') {
     
      return res.status(400).json({ success: false, message: 'This order has already been cancelled.' });
    }

    // Update the order status to 'Cancelled'
    order.status = 'Cancelled';
    await order.save();

    // Send success response
    return res.status(200).json({ success: true, message: 'Order successfully cancelled.' });
    
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).send('An error occurred while cancelling the order.');
  }
};







module.exports = {
  getorder,
  postorder,
  orderPage,
  profileOderget,
  cancelOrder
};