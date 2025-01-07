const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const getproductAddpage = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true });
    res.render("product-add", { cat: categories });
  } catch (error) {
    console.error("Error loading product add page:", error);
    res.redirect("/pageerror");
  }
};


const postProductAdd = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true });

    const { name, description, regularPrice, salePrice,quantity ,categoryId } = req.body;

    if (!name || !description || !regularPrice || !salePrice ||!quantity || !categoryId ) {
      return res.render("product-add", {
        cat: categories,
        error: "All fields are required.",
      });
    }



    if (!req.files || req.files.length === 0) {
      return res.render("product-add", {
        cat: categories,
        error: "Please upload at least one product image.",
      });
    }
    
    const images = req.files.map((file) => file.filename); 
   
    const regularPriceNum = parseFloat(regularPrice);
    const salePriceNum = parseFloat(salePrice);

    if (isNaN(regularPriceNum) || isNaN(salePriceNum) || regularPriceNum <= 0 || salePriceNum <= 0) {
      return res.render("product-add", {
        cat: categories,
        error: "Prices must be valid positive numbers.",
      });
    }

    if (salePriceNum >= regularPriceNum) {
      return res.render("product-add", {
        cat: categories,
        error: "Sale price must be less than the regular price.",
      });
    }

    
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.render("product-add", {
        cat: categories,
        error: "Invalid category selected.",
      });
    }
    



    
    const newProduct = new Product({
      name,
      description,
      regularPrice: regularPriceNum,
      salePrice: salePriceNum,
      category: categoryId,
      quantity,
      productImage: images,
    });
    console.log(newProduct)
    await newProduct.save();

    res.render("product-add", {
      cat: categories,
      success: "Product added successfully!",
    });
  } catch (error) {
    console.error("Error in postProductAdd:", error.message);
    res.render("product-add", {
      cat: "",
      error: "An unexpected error occurred. Please try again later.",
    });
  }
};




const getproduct = async (req, res) => {
  try {
    
    const products = await Product.find()
      .populate("category", "name") 
      .exec();

     return res.render('product', { products }); 
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Server Error");
  }
};





const editProduct = async (req, res) => {
  try {
    const productId = req.query.id || req.query.productId;
   

    const product = await Product.findById(productId);
   

    const cat = await Category.find();
   

    if (!product) {
      return res.status(404).send("Product not found");
    }

    res.render("productedit", { product, cat });
  } catch (error) {
    console.error("Error in editProduct:", error);
    res.status(500).send("Server error");
  }
};


const updateProduct = async (req, res) => {
  try {
    console.log("Files received:", req.files);
    console.log("Body received:", req.body);

    const productId = req.params.id;
    const { name, description, regularPrice, salePrice, quantity, categoryId } = req.body;
    console.log( name, description, regularPrice, salePrice, quantity, categoryId);
    
    const newImages = req.files.map((file) => file.filename); // Handle new uploaded images
  
      // Fetch existing product
      const product = await Product.findById(productId);
  
      // Update details
      product.name = name;
      product.description = description;
      product.regularPrice = regularPrice;
      product.salePrice = salePrice;
      product.quantity = quantity;
      product.category = categoryId;
  
      // Add new images to the product
      product.productImage.push(...newImages);
  
      // Save the product
      await product.save();
  
    res.json({ success: true, message: "Product updated successfully" });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).send('Failed to update product');
    }
  }




const removeImage = async (req, res) => {
  const { productId, imageId } = req.params;
  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.productImage = product.productImage.filter((img) => img !== imageId);

    await product.save();

    // Remove the image from the file system (optional)
    const imagePath = path.join(__dirname, '../public/uploads', imageId);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting image' });
  }
};

// Function to block a product
const blockProduct = async (req, res) => {
  try {
    const productId = req.params.productId; // Correct parameter extraction
    console.log("Product ID:", productId); // Log to verify correct ID
    
    await Product.findByIdAndUpdate(productId, { isBlocked: true });
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Error blocking product:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Function to unblock a product
const unblockProduct = async (req, res) => {
  try {
    console.log("reached")
    const productId = req.params.productId; // Extracting product ID from the route parameter
    
    await Product.findByIdAndUpdate(productId, { isBlocked: false });
    res.redirect('/admin/products'); // Redirect to the products page
  } catch (error) {
    console.error('Error unblocking product:', error);
    res.status(500).send('Internal Server Error');
  }
};




const addproductoffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;

    if (percentage >= 100) {
      return res.status(400).json({
        status: false,
        message: "Offer percentage cannot be 100% or more.",
      });
    }

    const findProduct = await Product.findOne({ _id: productId });
    if (!findProduct) {
      return res.status(404).json({ status: false, message: "Product not found." });
    }

    const findCategory = await Category.findOne({ _id: findProduct.category });

    if (findCategory.categoryOffer >= percentage) {
      return res.json({
        status: false,
        message: "A higher or equal category offer already exists.",
      });
    }

    findProduct.salePrice = findProduct.regularPrice - Math.floor(findProduct.regularPrice * (percentage / 100));
    findProduct.productOffer = percentage;

    await findProduct.save();

    // Remove the category offer if a product offer is applied
    findCategory.categoryOffer = 0;
    await findCategory.save();

    res.json({ status: true, message: "Product offer applied successfully." });
  } catch (error) {
    console.error("Error in addproductoffer:", error);
    res.status(500).json({ status: false, message: "Internal server error." });
  }
};

const removeproductoffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const findProduct = await Product.findOne({ _id: productId });

    if (!findProduct) {
      return res.status(404).json({
        status: false,
        message: "Product not found.",
      });
    }

    const percentage = findProduct.productOffer || 0;
    findProduct.salePrice = findProduct.regularPrice;
    findProduct.productOffer = 0;

    await findProduct.save();

    return res.status(200).json({
      status: true,
      message: "Product offer removed successfully.",
    });
  } catch (error) {
    console.error("Error in removeproductoffer:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error.",
    });
  }
};










module.exports = {
  getproductAddpage,
  postProductAdd,
  getproduct,
  editProduct,
  updateProduct,
  removeImage,
  blockProduct,
  unblockProduct,
  addproductoffer,
  removeproductoffer

};
