import Category from "../models/Category.js";
import cloudinary from "../config/cloudinary.js";

const uploadBufferToCloudinary = (fileBuffer, folder = "fanhub_plus/icon") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    uploadStream.end(fileBuffer);
  });
};

export const listCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res
      .status(200)
      .json({ success: true, count: categories.length, categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const name = (req.body.name || req.body['name '])?.trim();
    const slug = (req.body.slug || req.body['slug '])?.trim();
    const description = (req.body.description || req.body['description '])?.trim() || '';
    let iconUrl = (req.body.iconUrl || req.body['iconUrl '])?.trim() || '';

    // 2. Validation
    if (!name || !slug) {
      return res.status(400).json({
        message: 'Name and slug are required',
        received: req.body,
      });
    }

    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category slug already exists' });
    }

    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      iconUrl = uploadResult.secure_url;
    }

    const category = await Category.create({
      name,
      slug,
      description,
      iconUrl,
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    console.error('Create Category Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name, slug, description, iconUrl } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (name) category.name = name;
    if (slug) category.slug = slug;
    if (description !== undefined) category.description = description;

    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      category.iconUrl = uploadResult.secure_url;
    } else if (iconUrl !== undefined) {
      category.iconUrl = iconUrl;
    }

    const updatedCategory = await category.save();

    res
      .status(200)
      .json({
        success: true,
        message: "Category updated",
        category: updatedCategory,
      });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await Category.findByIdAndDelete(req.params.id);
    res
      .status(200)
      .json({ success: true, message: "Category removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
