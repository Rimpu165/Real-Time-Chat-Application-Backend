const FriendRequest = require("../models/FriendRequest");

/**
 * Check if two users are friends (have accepted friend request)
 */
async function areFriends(userId1, userId2) {
  const req = await FriendRequest.findOne({
    $or: [
      { fromUser: userId1, toUser: userId2, status: "accepted" },
      { fromUser: userId2, toUser: userId1, status: "accepted" },
    ],
  });
  return !!req;
}

module.exports = { areFriends };
