const User = require("../models/User")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")


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
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" })
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

module.exports = { signup, login, logout }