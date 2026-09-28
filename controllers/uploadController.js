import cloudinary from '../config/cloudinary.js';

export const uploadMedia = async (req, res) => {
  try {
    const { image, folder = 'avatars' } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'No image data provided' });
    }

    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: `fanhub_plus/${folder}`,
      resource_type: 'auto',
    });

    res.status(200).json({
      success: true,
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};