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
    const { id } = req.params || req.query;
   

    const { name, description, price } = req.body;
    const imagePaths = req.files?.map(file => file.path) || [];

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { name, description, price, productImage: imagePaths },
      { new: true }
    );

    if (!updatedProduct) {
      console.error("Product not found with ID:", id);
      return res.status(404).send({ message: "Product not found" });
    }

    res.redirect(`/admin/editProduct?id=${id}`);
  } catch (error) {
    console.error("Error in updateProduct:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};




const removeImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }

    if (!product.productImage.includes(imageId)) {
      return res.status(404).send({ message: "Image not found" });
    }

    product.productImage = product.productImage.filter(image => image !== imageId);
    await product.save();

    const filePath = path.join(__dirname, "../public/uploads", imageId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(200).send({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error in removeImage:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};

const blockProduct = async (req, res) => {
  try {
    const productId = req.params.id;

  
    await Product.findByIdAndUpdate(productId, { isBlocked: true });

    
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Error blocking product:', error);
    res.status(500).send('Internal Server Error');
  }
};


const unblockProduct = async (req, res) => {
  try {
    const productId = req.params.productId;

    
    await Product.findByIdAndUpdate(productId, { isBlocked: true });

    res.redirect('/admin/products'); 
  } catch (error) {
    console.error('Error blocking product:', error);
    res.status(500).send('Internal Server Error');
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
  unblockProduct

};
