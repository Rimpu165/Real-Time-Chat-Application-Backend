const User = require("../models/User")

const getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { name: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
      ];
    }
    const users = await User.find(filter).select("-password")

    res.status(200).json(users)

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const getUserById = async (req, res) => {
  try {

    const user = await User.findById(req.params.id).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json(user)

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an image file" })
    }

    const photoUrl = req.file.path;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePhoto: photoUrl },
      { returnDocument: 'after' }
    ).select("-password")

    if (!user) {
        return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json({
      message: "Profile photo uploaded successfully",
      user
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const updateUser = async (req, res) => {
  try {
    const { name, status } = req.body

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, status },
      { returnDocument: 'after', runValidators: true }
    ).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json({
      message: "User updated successfully",
      user
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.status(200).json({ message: "User deleted successfully" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

module.exports = { getUsers, getUserById, uploadProfilePhoto, updateUser, deleteUser }