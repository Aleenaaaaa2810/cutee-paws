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
    // Fetch categories for rendering in case of errors
    const categories = await Category.find({ isListed: true });

    // Extract data from the form
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
    
    const images = req.files.map((file) => file.filename); // Relative paths
    console.log(name, description, regularPrice, salePrice, categoryId )
    // Validate price fields
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

    // Validate category existence
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return res.render("product-add", {
        cat: categories,
        error: "Invalid category selected.",
      });
    }
    



    console.log("SAving data", name,
      description,
    regularPriceNum,
     salePriceNum,
      categoryId,
      quantity,
       images,)
       
    // Create and save the product
    const newProduct = new Product({
      name,
      description,
      regularPrice: regularPriceNum,
      salePrice: salePriceNum,
      category: categoryId,
      quantity,
      productImage: images,
    });
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


 const  editProduct = async (req, res) => {
  try {
      const productId = req.query.productId; 
      console.log(req.query)
      console.log(productId)
      
      const product = await Product.findById(productId); 

const cat = await Category.find();
console.log(cat);

      if (!product) {
          return res.status(404).send('Product not found');
      }

      res.render('productedit', { product,cat }); 
  } catch (error) {
      console.error(error);
      res.status(500).send('Server error'); 
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    
    const { name, description, regularPrice, salePrice, quantity, categoryId } = req.body;
    console.log(req.body)

    if (!name || !description || !regularPrice || !salePrice || !quantity || !categoryId) {
      return res.redirect('/products');
    }

    if (parseFloat(salePrice) > parseFloat(regularPrice)) {
      return res.status(400).send('Sale price cannot be greater than the regular price');
    }

    
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        {
          name: name.trim(), // Trim whitespace
          description: description.trim(), // Trim whitespace
          regularPrice: isNaN(regularPrice) ? 0 : parseFloat(regularPrice), // Validate numeric value
          salePrice: isNaN(salePrice) ? 0 : parseFloat(salePrice), // Validate numeric value
          quantity: isNaN(quantity) ? 0 : parseInt(quantity), // Validate numeric value
          category: categoryId, // Ensure categoryId is valid
        },
        { new: true } // Return the updated product
      );
      

    if (!updatedProduct) {
      return res.status(404).send('Product not found');
    }

    res.redirect('/products');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};





module.exports = {
  getproductAddpage,
  postProductAdd,
  getproduct,
  editProduct,
  updateProduct

};
