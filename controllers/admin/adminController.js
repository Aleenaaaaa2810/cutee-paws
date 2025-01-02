const User= require("../../models/userSchema")
const mongoose =require("mongoose");
const bcrypt =require("bcrypt")
const Swal = require('sweetalert2');
const moment = require('moment');
const Order = require('../../models/orderSchema');


const pageerror= async (req,res)=>{
  res.render("admin-error")
}


const loadLogin = (req, res) => {
 
  if (req.session.admin) {
    return res.redirect("/admin/dashboard"); 
  }
  res.render("admin-login", { message: null });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true });

    if (admin) {
      if (password === admin.password) {
        req.session.admin = true;
        return res.redirect("/admin/dashboard");
      } else {
        
        return res.render("admin-login", {
          message: 'Incorrect password. Please try again.',
        });
      }
    } else {
    
      return res.render("admin-login", {
        message: 'Admin not found. Please check your email and try again.',
      });
    }
  } catch (error) {
    console.log("login error", error);
    return res.redirect("/pageerror");
  }
};









const logout = async (req, res) => {
  try {
    req.session.destroy((error) => {
      if (error) {
        console.log("Error destroying session", error);
        return res.redirect("/pageerror");
      }
       return res.redirect("/admin/login"); 
    });
  } catch (error) {
    console.log("Unexpected error during logout", error);
    res.redirect("/pageerror");
  }
};



const loadDashboard = async (req, res) => {
  try {
    const { range } = req.query || 'daily';

    let filter = { status: 'Delivered' };

    // Define date range filters
    if (range === 'daily') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filter.createdOn = { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    } else if (range === 'weekly') {
      const startOfWeek = moment().startOf('isoWeek').toDate();
      const endOfWeek = moment().endOf('isoWeek').toDate();
      filter.createdOn = { $gte: startOfWeek, $lte: endOfWeek };
    } else if (range === 'monthly') {
      const startOfMonth = moment().startOf('month').toDate();
      const endOfMonth = moment().endOf('month').toDate();
      filter.createdOn = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (range === 'yearly') {
      const startOfYear = moment().startOf('year').toDate();
      const endOfYear = moment().endOf('year').toDate();
      filter.createdOn = { $gte: startOfYear, $lte: endOfYear };
    }

    const orders = await Order.find(filter);

    // Group orders by the selected range
    const groupedOrders = {};
    orders.forEach((order) => {
      let groupLabel;
      if (range === 'daily') {
        groupLabel = moment(order.createdOn).format('YYYY-MM-DD');
      } else if (range === 'weekly') {
        groupLabel = `Week ${moment(order.createdOn).isoWeek()}`;
      } else if (range === 'monthly') {
        groupLabel = moment(order.createdOn).format('MMMM');
      } else if (range === 'yearly') {
        groupLabel = moment(order.createdOn).format('YYYY');
      }

      if (!groupedOrders[groupLabel]) {
        groupedOrders[groupLabel] = { totalRevenue: 0, orderCount: 0 };
      }

      groupedOrders[groupLabel].totalRevenue += order.totalPrice;
      groupedOrders[groupLabel].orderCount += 1;
    });

    // Prepare sales data for the chart
    const salesData = {
      labels: Object.keys(groupedOrders), // Labels for the X-axis (dates, weeks, etc.)
      revenue: Object.values(groupedOrders).map((data) => data.totalRevenue), // Revenue values
      orders: Object.values(groupedOrders).map((data) => data.orderCount), // Orders values
    };

    // Calculate total revenue and total orders
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    res.render('dashboard', { salesData, totalOrders, totalRevenue, range });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching dashboard data');
  }
};



module.exports = {
  loadLogin,
  login,
  loadDashboard,
  pageerror,
  logout


};



