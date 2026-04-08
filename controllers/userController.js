const User = require("../models/User")

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
  updateUser,
  deleteUser,
  toggleBlockUser,
}