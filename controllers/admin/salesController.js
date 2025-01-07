const Order = require('../../models/orderSchema');
const payment=require('../../models/paymentSchema')
const PDFDocument = require('pdfkit');
const User = require('../../models/userSchema');
const excel = require('exceljs');
const moment = require('moment');

const getSalesReport = async (req, res) => {
  const moment = require('moment');
  try {
    const { range, startDate, endDate } = req.query;
    let filter = { status: 'Delivered' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Handle custom date range first (higher priority)
    if (startDate && endDate) {
      const start = moment(startDate, 'YYYY-MM-DD').startOf('day').toDate();
      const end = moment(endDate, 'YYYY-MM-DD').endOf('day').toDate();
      filter.createdOn = { $gte: start, $lte: end };
    } 
    // Handle range-based filters only if no custom range is provided
    else if (range === 'daily') {
      filter.createdOn = { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    } else if (range === 'weekly') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
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
    }

    // Handle 'all' range (no date filtering)
    if (range === 'all') {
      delete filter.createdOn;
    }

    // Fetch orders with the applied filters
    const orders = await Order.find(filter)
      .sort({ createdOn: -1 })
      .populate({
        path: 'user',
        populate: {
          path: 'payments',
          model: 'Payment',
          select: 'paymentMethod amount status transactionId paymentDate',
        },
      });

    // Calculate totals
    const totalOrders = orders.length;
    const totalDelivered = orders.filter(order => order.status === 'Delivered').length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);

    res.render('salesReport', {
      orders,
      totalOrders,
      totalDelivered,
      totalRevenue,
      totalDiscount,
      range: range || 'custom',
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
    const orders = await Order.find({ status: 'Delivered' }).populate('user', 'name');
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0); // Handle missing discount

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 30 });

    res.setHeader('Content-Disposition', 'attachment; filename="sales-report-delivered.pdf"');
    doc.pipe(res);

    const colWidths = [20, 150, 50, 60, 80, 50, 80];
    const rowHeight = 18;
    const maxRowsPerPage = 33;
    const maxTotalRows = 66; // Maximum of 2 pages

    let rowNumber = 1;

    function drawPageHeader() {
      doc.rect(20, 20, doc.page.width - 60, doc.page.height - 60).stroke();
      doc.fontSize(18).text('Sales Report (Delivered Orders)', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text('Order Summary:');
      doc.text(`Total Orders: ${orders.length}`);
      doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`);
      doc.text(`Total Discount: ₹${totalDiscount.toFixed(2)}`);
      doc.moveDown();

      const tableTop = doc.y;
      doc.fontSize(7).font('Helvetica-Bold');

      let xPos = 50;
      const headers = ['No.', 'Order ID', 'Amount (₹)', 'Status', 'Username', 'Discount (₹)', 'Payment Method'];
      headers.forEach((header, i) => {
        doc.rect(xPos, tableTop, colWidths[i], rowHeight).stroke().text(header, xPos + 5, tableTop + 5);
        xPos += colWidths[i];
      });

      return tableTop + rowHeight;
    }

    let rowY = drawPageHeader();
    doc.font('Helvetica');

    orders.slice(0, maxTotalRows).forEach((order, index) => {
      if (index > 0 && index % maxRowsPerPage === 0) {
        doc.addPage();
        rowY = drawPageHeader();
      }

      const fillColor = index % 2 === 0 ? '#f0f0f0' : '#ffffff';
      let xPos = 50;

      const rowData = [
        rowNumber++,
        order.orderId,
        `₹${order.totalPrice}`,
        order.status,
        order.user ? order.user.name : 'Unknown',
        `₹${order.discount || 0}`,
        order.paymentMethod || 'N/A'
      ];

      rowData.forEach((data, i) => {
        doc.rect(xPos, rowY, colWidths[i], rowHeight).fillAndStroke(fillColor, 'black');
        doc.fillColor('black').text(data, xPos + 5, rowY + 5);
        xPos += colWidths[i];
      });

      rowY += rowHeight;
    });

    if (orders.length > maxTotalRows) {
      doc.addPage();
      doc.fontSize(12).text(
        'Note: The report is truncated. Only the first 66 orders are displayed.',
        { align: 'center', valign: 'center' }
      );
    }

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
      { header: 'discount', key: 'discount', width: 15 },
      { header: 'Total Amount', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'payment Method', key: 'paymentmethod', width: 15 },

    ];

    orders.forEach((order) => {
      worksheet.addRow({
        orderId: order.orderId,
        date: moment(order.createdOn).format('YYYY-MM-DD'),
        customer: order.user ? order.user.name : 'Unknown', // Safeguard in case user is not populated
        discount:order.discount,
        amount: order.totalPrice,
        status: order.status,
        paymentmethod:order.paymentMethod
      });
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
    worksheet.addRow({}); // Add an empty row for spacing
    worksheet.addRow({ customer: 'Total Revenue', amount: totalRevenue });
    worksheet.addRow({ customer: 'Total Discount', amount: totalDiscount });

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
