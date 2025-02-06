const Category = require('../../models/categorySchema'); 
const Product = require('../../models/productSchema');
const Products=require("../../models/productSchema")

const CategoryInfo = async (req,res) => {
  try {
    const page = parseInt(req.query.page) || 1; 
    const limit = 4; 
    const skip = (page - 1) * limit; 

    
    const categoryData = await Category.find({})
      .sort({ createdAt: 1 }) 
      .skip(skip)
      .limit(limit);


    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);

    
    res.render('category', {
      cat: categoryData,
      currentPage: page,
      totalPages,
      totalCategories,
    });
  } catch (error) {
    console.error('Error fetching category information:', error);
    res.redirect('/pageerror'); 
  }
};


const addCategory = async (req, res) => {
  const { name, description } = req.body;

  try {
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
          return res.status(400).json({ error: 'Category already exists' });
      }

      const newCategory = new Category({ name, description });
      await newCategory.save();

     return  res.status(200).json({ message: 'Category added successfully' });
  } catch (error) {
      console.error('Error adding category:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
};


const editcategory = async (req, res) => {
  try {
      
      const { name, description } = req.body;
      const id = req.params.id;

      const category = await Category.findByIdAndUpdate(id, { name, description }, { new: true });
      if (!category) {
          return res.status(404).json({ success: false, message: 'Category not found' });
      }
     return  res.status(200).json({ success: true, message: "Category edited successfully" });
  } catch (error) {
      console.error("Error in editcategory:", error);
      res.status(500).json({ success: false, message: 'Internal server error' });
  }
};




const getcategoryedit = async (req, res) => {
  try {

      const category = await Category.findById(req.params.id);

      res.render('categoryedit', {
          category,
          id: category._id,
          name: category.name,
          description: category.description,
      });
  } catch (error) {
      console.error(error);
      res.status(500).send("Failed to load the edit category page.");
  }
};


const CategoryListing = async (req, res) => {
  try {
      const { id } = req.params;
      const category = await Category.findById(id);

      if (!category) {
          return res.status(404).json({ error: 'Category not found' });
      }

      category.isListed = !category.isListed; 
      await category.save();

      res.status(200).json({
          message: `Category ${category.isListed ? 'listed' : 'unlisted'} successfully`,
          category,
      });
  } catch (error) {
      res.status(500).json({ error: 'Failed to toggle category listing' });
  }
};


const addcategoryoffer = async (req, res) => {
  try {
    const percentage = parseInt(req.body.percentage);
    if (percentage >= 100) {
      return res.status(400).json({
        status: false,
        message: "Offer percentage cannot be 100% or more.",
      });
    }

    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({ status: false, message: "Category not found." });
    }

    const products = await Product.find({ category: category._id });

    const hasHigherProductOffer = products.some(
      (product) => product.productOffer > percentage
    );

    if (hasHigherProductOffer) {
      return res.json({
        status: false,
        message: "Some products already have a higher product offer.",
      });
    }

    await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

    for (const product of products) {
      product.productOffer = 0;
      product.salePrice = product.regularPrice - Math.floor(product.regularPrice * (percentage / 100));
      await product.save();
    }

    res.json({ status: true, message: "Category offer applied successfully." });
  } catch (error) {
    console.error("Error in addcategoryoffer:", error);
    res.status(500).json({ status: false, message: "Internal server error." });
  }
};



const removecategoryoffer = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(400).json({ status: false, message: "Category not found." });
    }

    const percentage = category.categoryOffer;
    const products = await Product.find({ category: category._id });

    if (products.length > 0) {
      for (const product of products) {
        product.salePrice = product.regularPrice;
        product.productOffer = 0;
        await product.save();
      }
    }

    category.categoryOffer = 0;
    await category.save();

    res.json({ status: true, message: "Category offer removed successfully." });
  } catch (error) {
    console.error("Error in removecategoryoffer:", error);
    res.status(500).json({ status: false, message: "Internal server error." });
  }
};




module.exports = {
  CategoryInfo,
  addCategory,
  editcategory,
  getcategoryedit,
  CategoryListing,
  addcategoryoffer,
  removecategoryoffer

};
