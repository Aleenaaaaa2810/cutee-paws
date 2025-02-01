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


    let page = parseInt(req.query.page) || 1;
    let limit = 5; // Number of orders per page
    let skip = (page - 1) * limit;

    if (startDate && endDate) {
      const start = moment(startDate, 'YYYY-MM-DD', true).startOf('day').toDate();
      const end = moment(endDate, 'YYYY-MM-DD', true).endOf('day').toDate();

      if (!isNaN(start) && !isNaN(end)) {
        filter.createdOn = { $gte: start, $lte: end };
      } else {
        console.error('Invalid date range:', startDate, endDate);
        return res.status(400).send('Invalid date range');
      }
    }

    if (!startDate && !endDate && range) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (range === 'daily') {
        filter.createdOn = { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      } else if (range === 'weekly') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        filter.createdOn = { $gte: startOfWeek, $lte: endOfWeek };
      } else if (range === 'monthly') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        filter.createdOn = { $gte: startOfMonth, $lte: endOfMonth };
      } else if (range === 'yearly') {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31);
        filter.createdOn = { $gte: startOfYear, $lte: endOfYear };
      } else if (range === 'all') {
        delete filter.createdOn;
      }
    }

    console.log('Filter being applied:', filter);

    const totalOrdersCount = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrdersCount / limit);


    const orders = await Order.find(filter)
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'user',
        populate: {
          path: 'payments',
          model: 'Payment',
          select: 'paymentMethod amount status transactionId paymentDate',
        },
      })
      .lean(); 

      const totalOrders = totalOrdersCount;
      const totalDelivered = orders.filter(order => order.status === 'Delivered').length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);

    const ordersWithFinalAmount = orders.map(order => {
      order.finalAmount = (order.totalPrice || 0) - (order.discount || 0) + 60; // Add delivery charge
      return order;
    });

    res.render('salesReport', {
      orders: ordersWithFinalAmount,
      totalOrders,
      totalDelivered,
      totalRevenue,
      totalDiscount,
      range: range || 'custom',
      startDate: startDate || '',
      endDate: endDate || '',
      pagination: {
        totalPages,
        currentPage: page
      }
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
    const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 30 });

    res.setHeader('Content-Disposition', 'attachment; filename="sales-report-delivered.pdf"');
    doc.pipe(res);

    const colWidths = [20, 150, 50, 50, 60, 60, 50, 80]; // Adjusted column widths
    const rowHeight = 18;
    const maxRowsPerPage = 33;

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
      const headers = [
        'No.',
        'Order ID',
        'Amount (₹)',
        'Discount (₹)',
        'Final Amount (₹)',
        'Status',
        'Username',
        'Payment Method',
      ];
      headers.forEach((header, i) => {
        doc.rect(xPos, tableTop, colWidths[i], rowHeight).stroke().text(header, xPos + 5, tableTop + 5);
        xPos += colWidths[i];
      });

      return tableTop + rowHeight;
    }

    let rowY = drawPageHeader();
    doc.font('Helvetica');

    orders.forEach((order, index) => {
      if (index > 0 && index % maxRowsPerPage === 0) {
        doc.addPage();
        rowY = drawPageHeader();
      }

      const fillColor = index % 2 === 0 ? '#f0f0f0' : '#ffffff';
      let xPos = 50;

      const finalAmount = (order.totalPrice || 0) - (order.discount || 0) + 60; // Calculate final amount

      const rowData = [
        rowNumber++,
        order.orderId,
        `₹${order.totalPrice}`,
        `₹${order.discount || 0}`,
        `₹${finalAmount}`,
        order.status,
        order.user ? order.user.name : 'Unknown',
        order.paymentMethod || 'N/A',
      ];

      rowData.forEach((data, i) => {
        doc.rect(xPos, rowY, colWidths[i], rowHeight).fillAndStroke(fillColor, 'black');
        doc.fillColor('black').text(data, xPos + 5, rowY + 5);
        xPos += colWidths[i];
      });

      rowY += rowHeight;
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating PDF');
  }
};





const downloadExcel = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'Delivered' }).populate('user', 'name');

    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report (Delivered Orders)');

    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 30 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Discount (₹)', key: 'discount', width: 15 },
      { header: 'Total Amount (₹)', key: 'amount', width: 15 },
      { header: 'Final Amount (₹)', key: 'finalAmount', width: 15 }, // Added final amount column
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Payment Method', key: 'paymentmethod', width: 15 },
    ];

    orders.forEach((order) => {
      const finalAmount = (order.totalPrice || 0) - (order.discount || 0) + 60; // Calculate final amount
      worksheet.addRow({
        orderId: order.orderId,
        date: moment(order.createdOn).format('YYYY-MM-DD'),
        customer: order.user ? order.user.name : 'Unknown',
        discount: order.discount || 0,
        amount: order.totalPrice,
        finalAmount, // Add final amount to the row
        status: order.status,
        paymentmethod: order.paymentMethod || 'N/A',
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
