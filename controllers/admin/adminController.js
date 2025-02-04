const User= require("../../models/userSchema")
const mongoose =require("mongoose");
const bcrypt =require("bcrypt")
const Swal = require('sweetalert2');
const moment = require('moment');
const Products=require("../../models/productSchema")
const Category = require('../../models/categorySchema');
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
    console.log("hiiiiiiiiiiiiiiiiiiiiiiii logined")
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
    const { range = 'all' } = req.query; 
    let filter = { status: 'Delivered' };

    if (range === 'daily') {
      const startOfWeek = moment().startOf('isoWeek').toDate();  // Get the start of the week (Sunday)
      const endOfWeek = moment().endOf('isoWeek').toDate();      // Get the end of the week (Saturday)
      filter.createdOn = { $gte: startOfWeek, $lte: endOfWeek };
    } else if (range === 'weekly') {
      const startOfMonth = moment().startOf('month').toDate();
      const endOfMonth = moment().endOf('month').toDate();
      filter.createdOn = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (range === 'monthly') {
      const startOfYear = moment().startOf('year').toDate();
      const endOfYear = moment().endOf('year').toDate();
      filter.createdOn = { $gte: startOfYear, $lte: endOfYear };
    } else if (range === 'yearly') {
      // Modify to show data for the last 10 years (decade)
      const startOfDecade = moment().subtract(10, 'years').startOf('year').toDate();
      const endOfDecade = moment().endOf('year').toDate();
      filter.createdOn = { $gte: startOfDecade, $lte: endOfDecade };
    } else if (range === 'all') {
      delete filter.createdOn;
    }

    const orders = await Order.find(filter);

    const groupedOrders = {};

    orders.forEach((order) => {
      let groupLabel;

      if (range === 'daily') {
        groupLabel = moment(order.createdOn).format('dddd');  // Days of the week (e.g., Sunday, Monday, etc.)
      } 
      // Modify the logic for the "weekly" range to show weeks of the month
      else if (range === 'weekly') {
        const weekOfMonth = moment(order.createdOn).week() - moment(order.createdOn).startOf('month').week() + 1;
        groupLabel = `Week ${weekOfMonth}`;
      } 
      // Modify the logic for the "monthly" range to show months of the year
      else if (range === 'monthly') {
        groupLabel = moment(order.createdOn).format('MMMM');  // Full month names (e.g., January, February, etc.)
      }
      // For "yearly" and "all", retain the original logic
      else if (range === 'yearly') {
        groupLabel = moment(order.createdOn).format('YYYY'); // Show each year in the last decade
      } else if (range === 'all') {
        groupLabel = 'All Orders';
      }

      if (!groupedOrders[groupLabel]) {
        groupedOrders[groupLabel] = { totalRevenue: 0, orderCount: 0 };
      }

      groupedOrders[groupLabel].totalRevenue += order.totalPrice;
      groupedOrders[groupLabel].orderCount += 1;
    });
   
    const salesData = {
      labels: Object.keys(groupedOrders), // X-axis labels: days of the week, weeks, months, etc.
      revenue: Object.values(groupedOrders).map((data) => data.totalRevenue), // Revenue values
      orders: Object.values(groupedOrders).map((data) => data.orderCount), // Orders values
    };

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    const topProducts = await Products.find().sort({ salesCount: -1 }).limit(10);

    const topCategories = await Products.aggregate([
      { $group: { _id: '$category', totalSales: { $sum: '$salesCount' } } },
      { $sort: { totalSales: -1 } },
      { $limit: 10 },
      { $lookup: {
          from: 'categories', 
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      { $project: { categoryName: '$categoryInfo.name', totalSales: 1 } }
    ]);

    res.render('dashboard', { salesData, totalOrders, totalRevenue, range, topProducts, topCategories });
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



