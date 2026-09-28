import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const uploadBufferToCloudinary = (
  fileBuffer,
  folder = "fanhub_plus/avatars",
) => {
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

export const register = async (req, res) => {
  try {
    const { name, email, password, favoriteCategories } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide name, email, and password" });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (cleanEmail === "admin@fanhub.com") {
      return res
        .status(403)
        .json({ message: "Admin account is pre-configured and cannot be registered" });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    let avatarUrl = "";
    if (req.file) {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
      avatarUrl = uploadResult.secure_url;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let parsedCategories = [];
    if (favoriteCategories) {
      try {
        parsedCategories =
          typeof favoriteCategories === "string"
            ? JSON.parse(favoriteCategories)
            : favoriteCategories;
      } catch {
        parsedCategories = [];
      }
    }

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      avatarUrl,
      favoriteCategories: parsedCategories,
      role: "user",
      isVerified: true,
    });

    const token = generateToken(newUser._id, newUser.role);

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        avatarUrl: newUser.avatarUrl,
        role: newUser.role,
        isVerified: newUser.isVerified,
        displayPrefs: newUser.displayPrefs,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isVerified: user.isVerified,
        displayPrefs: user.displayPrefs,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide an email" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found with this email" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    user.resetToken = otp;
    user.resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Your FanHub Password Reset Code",
      text: `Your 4-digit verification code is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #231C14; background: #FFFDF7; border-radius: 12px;">
          <h2 style="color: #FF5F1F;">FanHub Password Reset</h2>
          <p>Hello ${user.name},</p>
          <p>You recently requested to reset your password. Use the 4-digit code below:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #FF5F1F; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #7A6F64; font-size: 13px;">This code is valid for 10 minutes. If you did not make this request, you can ignore this email.</p>
        </div>
      `,
    });

    res.status(200).json({
      message: "Verification code sent to your registered email address.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyResetCode = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Please provide email and verification code" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      email: cleanEmail,
      resetToken: otp.trim(),
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    res.status(200).json({ message: "Verification code confirmed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ message: "Please provide email, code, and new password" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({
      email: cleanEmail,
      resetToken: otp.trim(),
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.status(200).json({
      message: "Password has been reset successfully. You can now log in.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ resetToken: token });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification token" });
    }

    user.isVerified = true;
    user.resetToken = null;
    await user.save();

    res.status(200).json({ message: "Email verified successfully!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    res.status(200).json({ user: req.user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, avatarUrl, favoriteCategories, displayPrefs } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (favoriteCategories) user.favoriteCategories = favoriteCategories;
    if (displayPrefs) {
      user.displayPrefs = {
        ...user.displayPrefs,
        ...displayPrefs,
      };
    }

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl,
        favoriteCategories: updatedUser.favoriteCategories,
        role: updatedUser.role,
        displayPrefs: updatedUser.displayPrefs,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    // Verify token with Google API
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    if (!googleRes.ok) {
      return res.status(401).json({ message: "Invalid or expired Google token" });
    }

    const payload = await googleRes.json();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: "No email associated with Google account" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    let user = await User.findOne({
      $or: [{ email: cleanEmail }, { googleId }]
    });

    if (user) {
      if (!user.googleId) user.googleId = googleId;
      if (!user.avatarUrl && picture) user.avatarUrl = picture;
      if (!user.isVerified) user.isVerified = true;
      await user.save();
    } else {
      // Create new user with random password hash
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      const cleanUsername = name
        ? `@${name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15)}_${Math.floor(1000 + Math.random() * 9000)}`
        : `@user_${Math.floor(1000 + Math.random() * 9000)}`;

      user = await User.create({
        name: name || cleanEmail.split("@")[0],
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        avatarUrl: picture || "",
        googleId,
        isVerified: true,
        role: "user"
      });
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(500).json({ message: "Google authentication failed" });
  }
};

