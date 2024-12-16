const Order = require('../../models/orderSchema');
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
    let filter = {};
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
    const orders = await Order.find(filter);

    // Calculating totals
    const totalOrders = orders.length;
    const totalPending = orders.filter(order => order.status === 'Pending').length;
    const totalCancelled = orders.filter(order => order.status === 'Cancelled').length;
    const totalProcessing = orders.filter(order => order.status === 'Processing').length;
    const totalShipped = orders.filter(order => order.status === 'Shipped').length;
    const totalDelivered = orders.filter(order => order.status === 'Delivered').length;

    // Rendering the filtered sales report
    res.render('salesReport', {
      orders,
      totalOrders,
      totalPending,
      totalCancelled,
      totalProcessing,
      totalShipped,
      totalDelivered,
      range: range || 'custom',  // Use 'range' instead of 'filterRange'
      startDate: startDate || '',
      endDate: endDate || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching sales report');
  }
};


// // Generate PDF
const downloadPDF = async (req, res) => {
  const doc = new PDFDocument();
  res.setHeader('Content-Disposition', 'attachment; filename="sales-report.pdf"');

  doc.pipe(res);
  doc.fontSize(16).text('Sales Report', { align: 'center' });
  doc.moveDown();

  // Example data
  doc.fontSize(12).text('Order Summary:');
  doc.text(`Total Orders: 7`);
  doc.text(`Total Revenue: ₹1878.00`);
  doc.text(`Total Discount: ₹108.00`);
  doc.end();
};

// Generate Excel
const downloadExcel = async (req, res) => {
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  worksheet.columns = [
    { header: 'Order ID', key: 'orderId', width: 30 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Customer', key: 'customer', width: 20 },
    { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    { header: 'Amount', key: 'amount', width: 10 },
    { header: 'Discount', key: 'discount', width: 10 },
  ];

  const orders = await Order.find({});
  orders.forEach((order) => {
    worksheet.addRow({
      orderId: order.orderId,
      date: moment(order.date).format('YYYY-MM-DD'),
      customer: order.customer,
      paymentMethod: order.paymentMethod,
      amount: order.amount,
      discount: order.discount,
    });
  });

  res.setHeader('Content-Disposition', 'attachment; filename="sales-report.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
};

module.exports={
  getSalesReport,
  downloadExcel,
  downloadPDF

}
