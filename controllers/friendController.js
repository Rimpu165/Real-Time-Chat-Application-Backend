const FriendRequest = require("../models/FriendRequest");
const User = require("../models/User");
const { io, getReceiverSocketId } = require("../socket/socket");

// Send friend request
const sendFriendRequest = async (req, res) => {
  try {
    const fromUserId = req.user.id;
    const { toUserId } = req.body;

    if (!toUserId) {
      return res.status(400).json({ message: "Receiver user ID is required" });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already friends
    const existingAccepted = await FriendRequest.findOne({
      $or: [
        { fromUser: fromUserId, toUser: toUserId, status: "accepted" },
        { fromUser: toUserId, toUser: fromUserId, status: "accepted" },
      ],
    });
    if (existingAccepted) {
      return res.status(400).json({ message: "Already friends with this user" });
    }

    // Check for pending request
    const existingPending = await FriendRequest.findOne({
      $or: [
        { fromUser: fromUserId, toUser: toUserId, status: "pending" },
        { fromUser: toUserId, toUser: fromUserId, status: "pending" },
      ],
    });
    if (existingPending) {
      return res.status(400).json({
        message: existingPending.fromUser.toString() === fromUserId
          ? "Friend request already sent"
          : "You have a pending request from this user",
      });
    }

    const friendRequest = new FriendRequest({
      fromUser: fromUserId,
      toUser: toUserId,
      status: "pending",
    });
    await friendRequest.save();

    const populated = await FriendRequest.findById(friendRequest._id)
      .populate("fromUser", "name email profilePhoto")
      .populate("toUser", "name email profilePhoto");

    // Socket: notify receiver in real-time
    const receiverSocketId = getReceiverSocketId(toUserId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendRequestReceived", populated);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Accept friend request
const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId)
      .populate("fromUser", "name email profilePhoto")
      .populate("toUser", "name email profilePhoto");

    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }
    if (request.toUser._id.toString() !== userId) {
      return res.status(403).json({ message: "Only the receiver can accept this request" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request is no longer pending" });
    }

    request.status = "accepted";
    await request.save();

    // Socket: notify sender that request was accepted
    const fromUserId = request.fromUser._id.toString();
    const senderSocketId = getReceiverSocketId(fromUserId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestAccepted", request);
    }

    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reject friend request
const rejectFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }
    if (request.toUser.toString() !== userId) {
      return res.status(403).json({ message: "Only the receiver can reject this request" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request is no longer pending" });
    }

    request.status = "rejected";
    await request.save();

    // Socket: notify sender that request was rejected
    const fromUserId = request.fromUser.toString();
    const senderSocketId = getReceiverSocketId(fromUserId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestRejected", { requestId: request._id, fromUserId: userId });
    }

    res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get list of friends
const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    const accepted = await FriendRequest.find({
      status: "accepted",
      $or: [{ fromUser: userId }, { toUser: userId }],
    })
      .populate("fromUser", "name email profilePhoto status lastSeen")
      .populate("toUser", "name email profilePhoto status lastSeen");

    const friends = accepted.map((r) => {
      const friend = r.fromUser._id.toString() === userId ? r.toUser : r.fromUser;
      return friend;
    });

    res.status(200).json(friends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get pending friend requests (received by me)
const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await FriendRequest.find({
      toUser: userId,
      status: "pending",
    })
      .populate("fromUser", "name email profilePhoto")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get sent friend requests (pending - sent by me)
const getSentRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await FriendRequest.find({
      fromUser: userId,
      status: "pending",
    })
      .populate("toUser", "name email profilePhoto")
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check friendship status with a user
const checkFriendship = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.params;

    const request = await FriendRequest.findOne({
      $or: [
        { fromUser: userId, toUser: targetUserId },
        { fromUser: targetUserId, toUser: userId },
      ],
    });

    let status = "none";
    if (request) {
      status = request.status;
      if (request.fromUser.toString() === userId) {
        status = status === "pending" ? "sent" : status;
      }
    }

    res.status(200).json({
      status, // none | pending | sent | accepted | rejected
      request: request || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Remove friend (Unfriend)
const removeFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    const request = await FriendRequest.findOne({
      status: "accepted",
      $or: [
        { fromUser: userId, toUser: friendId },
        { fromUser: friendId, toUser: userId },
      ],
    });

    if (!request) {
      return res.status(404).json({ message: "Friendship not found" });
    }

    // Delete the friend request document
    await FriendRequest.findByIdAndDelete(request._id);

    // Remove from both User.friends arrays
    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

    // Emit socket event
    const receiverSocketId = getReceiverSocketId(friendId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendRemoved", { friendId: userId });
    }

    res.status(200).json({ message: "Friend removed successfully", friendId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getPendingRequests,
  getSentRequests,
  checkFriendship,
  removeFriend,
};
