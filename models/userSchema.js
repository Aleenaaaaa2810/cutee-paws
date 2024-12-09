const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required:false,
    unique:true,
    sparse:true,
    default:null
  },
  googleId: {
    type: String,
    unique: true,
    
  },

  password: {
    type: String,
  required:false
      
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
    isValid: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  createdOn: {
    type: Date,
    default: Date.now,
  },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
});
userSchema.pre('save', async function (next) {
  if (this.isModified('password') && !this.password.startsWith('$2')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});


userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) {
    console.error('No password stored for this user.');
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;

