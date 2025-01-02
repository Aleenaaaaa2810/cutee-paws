const mongoose = require('mongoose');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Cart = require('../../models/cartShema');
const Address = require('../../models/addressSchema');
const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Coupon=require('../../models/couponSchema')
const Wallet=require('../../models/walletSchema')
const PDFDocument = require('pdfkit');


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
   

    
    res.render('order', { userAddress: userAddress || [], cart, totalPrice ,coupon,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Internal Server Error');
  }
};




const postorder = async (req, res) => {
  try {
    const { items, totalPrice, addressId ,paymentMethod ,razorpayDetails} = req.body;

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
//newwwwwwwwwwwwww
    const validMethods = ['Cash on Delivery', 'Razorpay', 'Wallet'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method selected.' });
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
      payments:item.paymentMethod,
     
      
    }));

    // Save order
    const newOrder = new Order({
      user: userId,
      orderedItems,
      totalPrice,
      finalAmount: totalPrice,
      address: addressId,
      status: "Pending",
paymentMethod: paymentMethod, // Ensure this matches a valid enum value      invoiceDate: new Date(),
      createdOn: new Date(),
      razorpayDetails: razorpayDetails || null, // Save razorpay details here
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
      paymentMethods: order.paymentMethod, // Ensure this matches the schema field
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




const generateInvoicePDF = async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    const orderId = req.params?.orderId;

    const order = await Order.findOne({ orderId: orderId, user: userId })
      .populate('user', 'name') // Populate user name
      .populate({
        path: 'orderedItems.product',
        select: 'name price', // Populate product name and price
      })
    
      .lean();

    if (!order) {
      return res.status(404).send('Order not found!');
    }

  

    if (!order.orderedItems || order.orderedItems.length === 0) {
      return res.status(404).send('No products found in this order.');
    }

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${orderId}.pdf"`);
    doc.pipe(res);

    // Add a page border
    doc.rect(30, 30, 550, 750).stroke();

    // Header Section
    doc.fontSize(18).fillColor('green').text('Cutee Paws', { align: 'center' });
    doc.fontSize(12).fillColor('black').text('email:cuteepaws@gmail.com', { align: 'center' });
    doc.text('place:OOrakkad, pin:686868', { align: 'center' });
    doc.text('pho:+91 2222334455', { align: 'center' });
    

    doc.moveDown(2);

    // Invoice Title
    doc.fontSize(24).fillColor('green').text('Invoice', { align: 'center' });
    doc.moveDown();

    // User Details Section
    doc.fontSize(12).fillColor('black').text(`Username: ${order.user?.name || 'N/A'}`);
    doc.moveDown();

    // Order Details Section
    doc.text(`Order ID: ${order._id}`);
    doc.text(`Order Date: ${new Date(order.createdOn).toLocaleDateString()}`);
    doc.text(`Payment Method: ${order.paymentMethod}`);
    doc.moveDown();

    // Products Table Header
    doc.fontSize(14).fillColor('green').text('Products:', { underline: true });
    doc.moveDown(0.5);

    const tableStartX = 50; // Left margin for the table
    const tableWidth = 500; // Total table width
    const columnWidths = [50, 150, 100, 100, 100]; // Individual column widths
    const columnPositions = columnWidths.reduce((acc, width, i) => {
      acc.push((acc[i - 1] || tableStartX) + (i > 0 ? columnWidths[i - 1] : 0));
      return acc;
    }, []);

    // Draw Table Header
    const headerY = doc.y;
    doc.fontSize(10).fillColor('green');
    const headers = ['S.No', 'Product Name', 'Quantity', 'Price', 'Total'];
    headers.forEach((header, index) => {
      doc.text(header, columnPositions[index], headerY, { width: columnWidths[index], align: 'center' });
    });

    // Add a line below the header
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(tableStartX, doc.y).lineTo(tableStartX + tableWidth, doc.y).stroke();
    doc.moveDown(0.5);

    // Draw Table Rows
    let isEvenRow = true;
    order.orderedItems.forEach((item, index) => {
      const { product, quantity, price } = item;
      const rowY = doc.y;

      // Alternate Row Background
      doc.rect(tableStartX, rowY - 2, tableWidth, 18).fill(isEvenRow ? '#f0f0f0' : '#ffffff').stroke();

      // Draw Row Data
      const rowData = [
        `${index + 1}`,
        `${product?.name || 'N/A'}`,
        `${quantity}`,
        `₹${price}`,
        `₹${quantity * price}`,
      ];
      doc.fontSize(12).fillColor('black');
      rowData.forEach((data, colIndex) => {
        doc.text(data, columnPositions[colIndex], rowY, {
          width: columnWidths[colIndex],
          align: 'center',
        });
      });

      doc.moveDown(0.5);
      isEvenRow = !isEvenRow;
    });

    // Add a line below the table
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(tableStartX, doc.y).lineTo(tableStartX + tableWidth, doc.y).stroke();

    // Total Amount Section
    doc.moveDown();
    doc.fontSize(16).fillColor('black').text(`Total Amount: ₹${order.finalAmount}`, { align: 'right' });

    doc.end();
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).send('An error occurred while generating the invoice PDF.');
  }
};


const getOrderDetails= async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ refundAmount: order.finalAmount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const updatePaymentStatus= async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { paymentStatus } = req.body;

    const order = await Order.findOneAndUpdate(
      { orderId },
      { 'razorpayDetails.paymentStatus': paymentStatus },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, message: 'Payment status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}















module.exports = {
  getorder,
  postorder,
  orderPage,
  profileOderget,
  cancelOrder,
  returnorder,
  generateInvoicePDF,
  getOrderDetails,
  updatePaymentStatus
};