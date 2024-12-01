const mongoose = require("mongoose");
const env = require("dotenv").config();  // Ensure environment variables are loaded

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);  // No need for deprecated options
        console.log("Database connected successfully");
    } catch (error) {
        console.error(`Database connection error: ${error.message}`); // Correct error logging
        process.exit(1);  // Exit with failure
    }
};

module.exports = connectDB;
