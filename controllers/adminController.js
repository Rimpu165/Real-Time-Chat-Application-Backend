const User = require("../models/User");
const Room = require("../models/Room");
const Message = require("../models/Message");

const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalRooms = await Room.countDocuments();
        const totalMessages = await Message.countDocuments();

        res.status(200).json({
            totalUsers,
            totalRooms,
            totalMessages
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Optional: you can also delete all messages sent by this user,
        // or remove them from friends lists. For now, we'll keep it simple
        // and just delete the user record to prevent orphan data errors.
        await Message.deleteMany({ sender: id });

        res.status(200).json({ message: "User and their messages deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.find()
            .populate("participants", "name email")
            .populate("admin", "name email")
            .sort({ createdAt: -1 });
        res.status(200).json(rooms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const room = await Room.findByIdAndDelete(id);

        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        // Delete all messages associated with the room
        await Message.deleteMany({ room: id });

        res.status(200).json({ message: "Room and its messages deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const toggleBlockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        user.isBlocked = !user.isBlocked;
        await user.save();
        res.status(200).json({
            message: `User ${user.isBlocked ? "blocked" : "unblocked"} successfully`,
            user: { id: user._id, isBlocked: user.isBlocked }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!["user", "admin"].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }
        const user = await User.findByIdAndUpdate(id, { role }, { new: true });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User role updated successfully", user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getDashboardStats,
    getAllUsers,
    deleteUser,
    getAllRooms,
    deleteRoom,
    toggleBlockUser,
    updateUserRole
};
