
const express = require('express');
const app = express();
const path = require('path');
const multer = require('multer');
require("dotenv").config();
const db = require("./config/db");
const userRouter = require('./routes/userRouter'); 
const adminRouter = require('./routes/adminRouter'); 
const session = require('express-session');
const passport = require('./config/passport'); 

// Connect to the database
db();

// Middleware for parsing request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve static files from the 'uploads' folder inside 'routes'
app.use('/uploads', express.static('public/uploads'));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "defaultSecret",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 72 * 60 * 60 * 1000 }, 
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.user = req.user; // req.user is populated by Passport after login
  next();
});

// Cache prevention middleware
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// View engine setup
app.set("view engine", "ejs");
app.set("views", [
    path.join(__dirname, "views/user"),
    path.join(__dirname, "views/admin")
]);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use("/", userRouter); 
app.use("/admin", adminRouter); 



// Start the server
const PORT = process.env.PORT || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

