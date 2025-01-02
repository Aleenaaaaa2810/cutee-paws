const Order = require('../../models/orderSchema');
const payment=require('../../models/paymentSchema')
const PDFDocument = require('pdfkit');
const User = require('../../models/userSchema');
const excel = require('exceljs');
const moment = require('moment');

// Fetch and display sales report
const getSalesReport = async (req, res) => {
  console.log("sales report requested");
  const moment = require('moment');

  try {
    const { range, startDate, endDate } = req.query;
    let filter = { 
      status: 'Delivered', 
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Apply range filters
    if (range === 'daily') {
      filter.createdOn = { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    } else if (range === 'weekly') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      filter.createdOn = { $gte: startOfWeek, $lte: endOfWeek };
    } else if (range === 'monthly') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      filter.createdOn = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (range === 'yearly') {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      endOfYear.setHours(23, 59, 59, 999);
      filter.createdOn = { $gte: startOfYear, $lte: endOfYear };
    } else if (startDate && endDate) {
      const start = moment(startDate, 'YYYY-MM-DD').startOf('day').toDate();
      const end = moment(endDate, 'YYYY-MM-DD').endOf('day').toDate();
      
      if (!moment(start).isValid() || !moment(end).isValid()) {
        return res.status(400).send('Invalid startDate or endDate');
      }

      filter.createdOn = { $gte: start, $lte: end };
    }

    // Fetch orders with the applied filters
   // Fetch orders with the applied filters
const orders = await Order.find(filter)
.sort({ createdOn: -1 }) // Sort by `createdOn` in descending order
.populate({
  path: 'user', // Populate the user details in the order
  populate: { // Nested populate to include payment details for the user
    path: 'payments', // Field in the User schema referencing Payment
    model: 'Payment', // Explicitly mention the Payment model
    select: 'paymentMethod amount status transactionId paymentDate', // Select fields to include
  },
});

  
  console.log(orders);
    
    // Calculating totals
    const totalOrders = orders.length;
    const totalPending = orders.filter(order => order.status === 'Pending').length;
    const totalCancelled = orders.filter(order => order.status === 'Cancelled').length;
    const totalProcessing = orders.filter(order => order.status === 'Processing').length;
    const totalShipped = orders.filter(order => order.status === 'Shipped').length;
    const totalDelivered = orders.filter(order => order.status === 'Delivered').length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    // Rendering the filtered sales report
    res.render('salesReport', {
      orders,
      totalOrders,
      totalPending,
      totalCancelled,
      totalProcessing,
      totalShipped,
      totalDelivered,
      totalRevenue, 
      range: range || 'custom',  // Use 'range' instead of 'filterRange'
      startDate: startDate || '',
      endDate: endDate || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching sales report');
  }
};


const downloadPDF = async (req, res) => {
  try {
    // Fetch only "Delivered" orders
    const orders = await Order.find({ status: 'Delivered' });
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    const doc = new PDFDocument();
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report-delivered.pdf"');

    doc.pipe(res);
    doc.fontSize(16).text('Sales Report (Delivered Orders)', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text('Order Summary:');
    doc.text(`Total Orders: ${orders.length}`);
    doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`);
    doc.moveDown();

    doc.text('Order Details:');
    orders.forEach(order => {
      doc.text(`Order ID: ${order.orderId}, Amount: ₹${order.totalPrice}, Status: ${order.status}`);
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating PDF');
  }
};



const downloadExcel = async (req, res) => {
  try {
    // Fetch only "Delivered" orders and populate the user field
    const orders = await Order.find({ status: 'Delivered' }).populate('user', 'name');

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report (Delivered Orders)');

    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 30 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    orders.forEach((order) => {
      worksheet.addRow({
        orderId: order.orderId,
        date: moment(order.createdOn).format('YYYY-MM-DD'),
        customer: order.user ? order.user.name : 'Unknown', // Safeguard in case user is not populated
        amount: order.totalPrice,
        status: order.status,
      });
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    worksheet.addRow({}); // Add an empty row for spacing
    worksheet.addRow({ customer: 'Total Revenue', amount: totalRevenue });

    res.setHeader('Content-Disposition', 'attachment; filename="sales-report-delivered.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating Excel');
  }
};



module.exports={
  getSalesReport,
  downloadExcel,
  downloadPDF

}
