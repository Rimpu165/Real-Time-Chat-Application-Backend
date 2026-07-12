const User = require("../models/User")
const mongoose = require("mongoose")
const FriendRequest = require("../models/FriendRequest");

const getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const currentUserId = req.user.id || req.user._id;
    
    // Explicitly exclude current user by ID and email (if searching)
    const filter = { 
        _id: { $ne: currentUserId } 
    };

    if (search && search.trim()) {
      const term = search.trim();
      filter.$and = [
        { _id: { $ne: currentUserId } },
        {
          $or: [
            { name: { $regex: term, $options: "i" } },
            { email: { $regex: term, $options: "i" } },
          ]
        }
      ];
      // Clean up top-level _id if $and is used
      delete filter._id;
    }
    
    // Get all users (except current one)
    const users = await User.find(filter).select("name email profilePhoto status lastSeen");

    // Get all friend requests involving the current user to merge status
    const FriendRequest = require("../models/FriendRequest");
    const requests = await FriendRequest.find({
        $or: [
            { fromUser: currentUserId },
            { toUser: currentUserId }
        ]
    });

    const usersWithStatus = users.map(user => {
        const u = user.toObject();
        const userIdStr = user._id.toString();
        
        // Find if there's any request between current user and this user
        const request = requests.find(r => 
            r.fromUser.toString() === userIdStr || 
            r.toUser.toString() === userIdStr
        );

        if (!request) {
            u.friendshipStatus = "none";
        } else {
            if (request.status === "accepted") {
                u.friendshipStatus = "friends";
            } else if (request.status === "pending") {
                if (request.fromUser.toString() === currentUserId.toString()) {
                    u.friendshipStatus = "sent";
                } else {
                    u.friendshipStatus = "pending";
                }
            } else {
                // For rejected or other statuses, allow re-sending
                u.friendshipStatus = "none"; 
            }
        }
        return u;
    });


    res.status(200).json(usersWithStatus);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


const getUserById = async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const targetUserId = req.params.id;

    const target = await User.findById(targetUserId).select("-password");
    if (!target) return res.status(404).json({ message: "User not found" });

    // Privacy Logic
    const isFriend = target.friends.some(id => id.toString() === currentUserId.toString());
    const isPrivate = target.isPrivate;

    // Get friendship status and request ID
    const request = await FriendRequest.findOne({
      $or: [
        { fromUser: currentUserId, toUser: targetUserId },
        { fromUser: targetUserId, toUser: currentUserId }
      ]
    });

    let friendshipStatus = "none";
    let friendshipRequestId = null;

    if (request) {
      friendshipRequestId = request._id;
      if (request.status === "accepted") {
        friendshipStatus = "friends";
      } else if (request.status === "pending") {
        if (request.fromUser.toString() === currentUserId.toString()) {
          friendshipStatus = "sent";
        } else {
          friendshipStatus = "pending";
        }
      }
    }

    if (isPrivate && !isFriend && target._id.toString() !== currentUserId.toString()) {
      // Return a stripped down version if private and not friends
      return res.status(200).json({
        _id: target._id,
        name: target.name,
        profilePhoto: target.profilePhoto,
        isPrivate: true,
        isFriend: false,
        friendshipStatus,
        friendshipRequestId,
        message: "This profile is private. Add them as a friend to see more."
      });
    }

    // Mutual Friends Calculation
    const me = await User.findById(currentUserId);
    const myFriends = me.friends.map(f => f.toString());
    const theirFriends = target.friends.map(f => f.toString());
    const mutual = myFriends.filter(id => theirFriends.includes(id));
    
    const userObj = target.toObject();
    userObj.mutualFriendsCount = mutual.length;
    userObj.isFriend = isFriend;
    userObj.friendshipStatus = friendshipStatus;
    userObj.friendshipRequestId = friendshipRequestId;

    res.status(200).json(userObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
    const { name, status, bio, isPrivate, age, gender, location, socialLinks } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    if (bio !== undefined) updates.bio = bio;
    if (isPrivate !== undefined) updates.isPrivate = isPrivate;
    if (age !== undefined) updates.age = age;
    if (gender !== undefined) updates.gender = gender;
    if (location !== undefined) updates.location = location;
    if (socialLinks !== undefined) updates.socialLinks = socialLinks;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { returnDocument: 'after', runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "Profile updated", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const uploadCoverPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No cover photo provided" });
    const user = await User.findByIdAndUpdate(req.user.id, { coverPhoto: req.file.path }, { new: true }).select("-password");
    res.status(200).json({ message: "Cover photo updated", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addToGallery = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: "No images provided" });
    const filePaths = req.files.map(f => f.path);
    const user = await User.findByIdAndUpdate(req.user.id, { $push: { gallery: { $each: filePaths } } }, { new: true }).select("-password");
    res.status(200).json({ message: "Gallery updated", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const removeFromGallery = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { $pull: { gallery: imageUrl } }, { new: true }).select("-password");
    res.status(200).json({ message: "Image removed from gallery", user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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

const toggleBlockUser = async (req, res) => {
  try {
    const currentUserId = req.user.id
    const { targetUserId } = req.params

    if (!targetUserId || String(targetUserId) === String(currentUserId)) {
      return res.status(400).json({ message: "Invalid target user" })
    }

    const [me, target] = await Promise.all([
      User.findById(currentUserId),
      User.findById(targetUserId),
    ])

    if (!me || !target) {
      return res.status(404).json({ message: "User not found" })
    }

    const alreadyBlocked = (me.blockedUsers || []).some(
      (id) => String(id) === String(targetUserId)
    )

    if (alreadyBlocked) {
      me.blockedUsers = (me.blockedUsers || []).filter(
        (id) => String(id) !== String(targetUserId)
      )
      await me.save()
      return res.status(200).json({ blocked: false, message: "User unblocked" })
    }

    me.blockedUsers = [...(me.blockedUsers || []), targetUserId]

    // Block implies break friend relation both sides.
    me.friends = (me.friends || []).filter((id) => String(id) !== String(targetUserId))
    target.friends = (target.friends || []).filter((id) => String(id) !== String(currentUserId))

    await Promise.all([me.save(), target.save()])

    return res.status(200).json({ blocked: true, message: "User blocked" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const subscribePush = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id
    const subscription = req.body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ message: "Invalid push subscription object" })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (!user.pushSubscription) {
      user.pushSubscription = []
    }

    const exists = user.pushSubscription.some(sub => sub.endpoint === subscription.endpoint)
    if (!exists) {
      user.pushSubscription.push(subscription)
      await user.save()
    }

    res.status(200).json({ message: "Subscribed to push notifications successfully" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const unsubscribePush = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id
    const endpoint = req.body.endpoint || req.query.endpoint

    if (!endpoint) {
      return res.status(400).json({ message: "Endpoint is required to unsubscribe" })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (user.pushSubscription) {
      user.pushSubscription = user.pushSubscription.filter(sub => sub.endpoint !== endpoint)
      await user.save()
    }

    res.status(200).json({ message: "Unsubscribed from push notifications successfully" })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

const getUserStats = async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const Message = require("../models/Message");
    const FriendRequest = require("../models/FriendRequest");

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const messagesToday = await Message.countDocuments({
      sender: currentUserId,
      createdAt: { $gte: startOfToday }
    });

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const newConnections = await FriendRequest.countDocuments({
      $or: [
        { fromUser: currentUserId },
        { toUser: currentUserId }
      ],
      status: "accepted",
      updatedAt: { $gte: startOfWeek }
    });

    res.status(200).json({
      messagesToday,
      newConnections
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserActivity = async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const FriendRequest = require("../models/FriendRequest");
    const CallLog = require("../models/CallLog");

    const formatRelativeTime = (date) => {
      const now = new Date();
      const diffMs = now - new Date(date);
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHrs < 24) return `${diffHrs}h ago`;
      if (diffDays === 1) return "Yesterday";
      return `${diffDays} days ago`;
    };

    // 1. Pending Friend Requests (received)
    const pendingRequests = await FriendRequest.find({
      toUser: currentUserId,
      status: "pending"
    }).populate("fromUser", "name").sort({ createdAt: -1 }).limit(5);

    const pendingActivities = pendingRequests.map(req => ({
      id: `req-${req._id}`,
      type: "request",
      text: `${req.fromUser?.name || "Someone"} sent you a connection request`,
      time: formatRelativeTime(req.createdAt),
      createdAt: req.createdAt
    }));

    // 2. Accepted Friend Requests
    const acceptedRequests = await FriendRequest.find({
      $or: [
        { fromUser: currentUserId },
        { toUser: currentUserId }
      ],
      status: "accepted"
    })
    .populate("fromUser", "name")
    .populate("toUser", "name")
    .sort({ updatedAt: -1 })
    .limit(5);

    const acceptedActivities = acceptedRequests.map(req => {
      const otherUser = req.fromUser._id.toString() === currentUserId.toString()
        ? req.toUser
        : req.fromUser;
      return {
        id: `acc-${req._id}`,
        type: "accept",
        text: `${otherUser?.name || "Someone"} accepted your connection request`,
        time: formatRelativeTime(req.updatedAt),
        createdAt: req.updatedAt
      };
    });

    // 3. Recent Call Logs
    const callLogs = await CallLog.find({
      $or: [
        { user: currentUserId },
        { peer: currentUserId }
      ]
    })
    .populate("peer", "name")
    .populate("user", "name")
    .sort({ createdAt: -1 })
    .limit(5);

    const callActivities = callLogs.map(log => {
      const isOutgoing = log.user._id.toString() === currentUserId.toString();
      const peerName = isOutgoing ? log.peer?.name : log.user?.name;
      let text = "";
      if (log.status === "missed") {
        text = isOutgoing ? `Missed call to ${peerName || "Someone"}` : `Missed call from ${peerName || "Someone"}`;
      } else {
        text = isOutgoing ? `Outgoing ${log.type} call to ${peerName || "Someone"}` : `Incoming ${log.type} call from ${peerName || "Someone"}`;
      }

      return {
        id: `call-${log._id}`,
        type: "call",
        text,
        time: formatRelativeTime(log.createdAt),
        createdAt: log.createdAt
      };
    });

    // Combine and sort
    let allActivities = [
      ...pendingActivities,
      ...acceptedActivities,
      ...callActivities
    ];

    allActivities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    allActivities = allActivities.slice(0, 5);

    res.status(200).json(allActivities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  uploadProfilePhoto,
  uploadCoverPhoto,
  addToGallery,
  removeFromGallery,
  updateUser,
  deleteUser,
  toggleBlockUser,
  subscribePush,
  unsubscribePush,
  getUserStats,
  getUserActivity,
}