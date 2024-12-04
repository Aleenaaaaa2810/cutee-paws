const Category = require('../../models/categorySchema'); 

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
      console.log(category)
      if (!category) {
          return res.status(404).json({ success: false, message: 'Category not found' });
      }
     return  res.status(200).json({ success: true, message: "Category edited successfully" });
  } catch (error) {
    console.log("Error")
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


module.exports = {
  CategoryInfo,
  addCategory,
  editcategory,
  getcategoryedit,
  CategoryListing

};
