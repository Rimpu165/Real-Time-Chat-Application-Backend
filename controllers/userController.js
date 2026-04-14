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

    if (isPrivate && !isFriend && target._id.toString() !== currentUserId.toString()) {
      // Return a stripped down version if private and not friends
      return res.status(200).json({
        _id: target._id,
        name: target.name,
        profilePhoto: target.profilePhoto,
        isPrivate: true,
        isFriend: false,
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
    const { name, status, bio, isPrivate } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    if (bio !== undefined) updates.bio = bio;
    if (isPrivate !== undefined) updates.isPrivate = isPrivate;

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
}