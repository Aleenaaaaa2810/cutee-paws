const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Cart = require('../../models/cartShema');
const Address = require('../../models/addressSchema');
const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Wallet=require('../../models/walletSchema')
const { v4: uuidv4 } = require('uuid'); 



const getorder = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; 
    const pageSize = parseInt(req.query.pageSize) || 10; 
    const skip = (page - 1) * pageSize;

    const orders = await Order.find({})
      .skip(skip) 
      .limit(pageSize) 
      .sort({ _id: -1 })
      .populate('user', 'name email')
      .populate('orderedItems.product', 'name price');

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: 'No orders found.' });
    }

    const totalOrders = await Order.countDocuments(); 
    const totalPages = Math.ceil(totalOrders / pageSize); 

    const sanitizedOrders = orders.map(order => {
      order.orderedItems = order.orderedItems.filter(item => item.product);
      order.finalAmount = (order.totalPrice || 0) + 60; 

      return order;
    });

    res.render('adminOrders', {
      orders: sanitizedOrders,
      statusOptions: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalOrders: totalOrders
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
};



const updateStatusorder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.status(200).json({ success: true, message: 'Order status updated.', order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
};


const approvereturn = async (req, res) => {
  const orderId = req.params.orderId;
  const userId = req.session.user?.id;

  try {
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.status.toLowerCase() !== 'return requested') {
      return res.status(400).json({ success: false, message: 'Return has not been requested or already processed.' });
    }

    for (const item of order.orderedItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.quantity += item.quantity;
        await product.save();
      }
    }
    order.status = 'Returned';
    await order.save();

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0, transactions: [] });
    }

    wallet.balance += order.finalAmount;
    wallet.transactions.push({
      transactionId: uuidv4(),
      description: 'Refund for order cancellation',
      amount: order.finalAmount,
      date: new Date(),
    });

    await wallet.save();

    return res.json({ success: true, message: 'Return approved successfully.' });
  } catch (error) {
    console.error('Error approving return:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};





const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByIdAndDelete(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.status(200).json({ success: true, message: 'Order deleted successfully.' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ success: false, message: 'Failed to delete order.' });
  }
};

module.exports = {
  getorder,
  updateStatusorder,
  approvereturn,
  deleteOrder
};