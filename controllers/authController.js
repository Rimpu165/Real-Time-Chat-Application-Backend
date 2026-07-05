const User = require("../models/User")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const sendEmail = require("../utils/sendEmail")


const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body
    const user = await User.findOne({ email })
    if (user) {
      return res.status(400).json({ message: "User already exists" })
    }
    const hashpassword = await bcrypt.hash(password, 10)
    const newUser = new User({
      name, email, password: hashpassword
    })
    await newUser.save()
    const userResponse = newUser.toObject();
    delete userResponse.password;
    res.status(201).json({
      message: "User registered successfully",
      user: userResponse
    })
  }
  catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "user not found" })
    }
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "invalid credentials" })
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" })
    const userResponse = user.toObject ? user.toObject() : user;
    delete userResponse.password;
    res.status(200).json({ token, user: userResponse })
  }
  catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const logout = async (req, res) => {
  try {
    res.status(200).json({ message: "Logout successful. Please remove token on client side." })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ message: "Email is required" })
    }
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: "No user with that email exists" })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex")

    // Set expire (1 hour)
    user.resetPasswordExpires = Date.now() + 3600000

    await user.save()

    // Create reset URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`

    const message = `You are receiving this email because you (or someone else) have requested the reset of a password. Please visit:\n\n${resetUrl}\n\nThis link is valid for 1 hour.`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Chatiq Password Reset</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password for your Chatiq account. Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>This link is valid for 1 hour. If you did not request this reset, please ignore this email and your password will remain unchanged.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b; text-align: center;">&copy; Chatiq. All rights reserved.</p>
      </div>
    `

    try {
      await sendEmail({
        email: user.email,
        subject: "Chatiq Password Reset Request",
        message,
        html,
      })

      res.status(200).json({ message: "Password reset email sent successfully" })
    } catch (err) {
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save()
      return res.status(500).json({ message: "Email could not be sent", error: err.message })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params
    const { password } = req.body

    if (!password) {
      return res.status(400).json({ message: "Password is required" })
    }

    // Get hashed token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex")

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" })
    }

    // Set new password
    user.password = await bcrypt.hash(password, 10)
    user.resetPasswordToken = null
    user.resetPasswordExpires = null

    await user.save()

    res.status(200).json({ message: "Password reset successful" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

module.exports = { signup, login, logout, forgotPassword, resetPassword }