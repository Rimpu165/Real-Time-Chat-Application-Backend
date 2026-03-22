const Room = require("../models/Room");
const Message = require("../models/Message");
const { areFriends } = require("../utils/friendUtils");

// Get or create a 1-to-1 room
const createOrGetRoom = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (!receiverId) {
       return res.status(400).json({ message: "Receiver ID is required" });
    }

    // Check if a 1-to-1 room already exists between these two users
    let room = await Room.findOne({
      isGroup: false,
      participants: { $all: [senderId, receiverId] }
    }).populate("participants", "name email profilePhoto status lastSeen");

    if (!room) {
      // Create a new room
      room = new Room({
        isGroup: false,
        participants: [senderId, receiverId]
      });
      await room.save();
      room = await room.populate("participants", "name email profilePhoto status lastSeen");
    }

    res.status(200).json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a Group Room (participants must be friends with creator)
const createGroupRoom = async (req, res) => {
    try {
        const { groupName, participants } = req.body;
        const creatorId = req.user.id;

        if (!groupName || !participants || participants.length === 0) {
             return res.status(400).json({ message: "Group name and participants are required" });
        }

        // Ensure creator is in participants and all others are friends
        const uniqueParticipants = [...new Set([creatorId, ...participants])];
        for (const pid of uniqueParticipants) {
            if (pid === creatorId) continue;
            const friends = await areFriends(creatorId, pid);
            if (!friends) {
                return res.status(403).json({
                    message: `You can only add friends to a group. User ${pid} is not your friend. Send a friend request first.`,
                });
            }
        }

        let room = new Room({
            isGroup: true,
            name: groupName,
            participants: uniqueParticipants,
            admin: creatorId
        });

        await room.save();
        room = await room.populate("participants", "name email profilePhoto status lastSeen");
        
        res.status(201).json(room);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Get all rooms for the logged-in user
const getUserRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const rooms = await Room.find({ participants: userId })
      .populate("participants", "name email profilePhoto status lastSeen")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add members to a group
const addGroupMember = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userIds } = req.body; // array of user IDs to add
        const currentUserId = req.user.id;

        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });
        if (!room.isGroup) return res.status(400).json({ message: "Not a group chat" });
        if (room.admin.toString() !== currentUserId) return res.status(403).json({ message: "Only admin can add members" });

        // Add users that are not already in the group - must be friends with admin
        const newMembers = userIds.filter(id => !room.participants.some(p => p.toString() === id));
        for (const uid of newMembers) {
            const friends = await areFriends(currentUserId, uid);
            if (!friends) {
                return res.status(403).json({
                    message: `You can only add friends to the group. User ${uid} is not your friend.`,
                });
            }
        }
        room.participants.push(...newMembers);
        
        await room.save();
        const updatedRoom = await Room.findById(roomId).populate("participants", "name email profilePhoto status lastSeen");
        res.status(200).json(updatedRoom);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Remove member from group
const removeGroupMember = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { removeUserId } = req.body; 
        const currentUserId = req.user.id;

        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });
        if (!room.isGroup) return res.status(400).json({ message: "Not a group chat" });
        if (room.admin.toString() !== currentUserId) return res.status(403).json({ message: "Only admin can remove members" });
        if (room.admin.toString() === removeUserId) return res.status(400).json({ message: "Admin cannot remove themselves" });

        room.participants = room.participants.filter(p => p.toString() !== removeUserId);
        
        await room.save();
        const updatedRoom = await Room.findById(roomId).populate("participants", "name email profilePhoto status lastSeen");
        res.status(200).json(updatedRoom);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Leave a group
const leaveGroup = async (req, res) => {
    try {
        const { roomId } = req.params;
        const currentUserId = req.user.id;

        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ message: "Room not found" });
        if (!room.isGroup) return res.status(400).json({ message: "Not a group chat" });

        room.participants = room.participants.filter(p => p.toString() !== currentUserId);

        // If admin leaves, assign to the next available user
        if (room.admin.toString() === currentUserId && room.participants.length > 0) {
            room.admin = room.participants[0];
        }

        await room.save();
        res.status(200).json({ message: "Left group successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Check if user can send more messages in a direct room (for one-message limit)
const getRoomSendStatus = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.isGroup) {
      return res.status(200).json({ canSend: true, isGroup: true });
    }

    const otherParticipant = room.participants.find((p) => p.toString() !== userId);
    if (!otherParticipant) {
      return res.status(200).json({ canSend: true });
    }

    const friends = await areFriends(userId, otherParticipant.toString());
    if (friends) {
      return res.status(200).json({ canSend: true });
    }

    const Message = require("../models/Message");
    const count = await Message.countDocuments({
      room: roomId,
      sender: userId,
    });

    res.status(200).json({
      canSend: count < 1,
      introUsed: count >= 1,
      message: count >= 1
        ? "Send a friend request to continue chatting"
        : "You can send one intro message. They must accept your friend request for more.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createOrGetRoom, createGroupRoom, getUserRooms, addGroupMember, removeGroupMember, leaveGroup, getRoomSendStatus };
