const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getPendingRequests,
  getSentRequests,
  checkFriendship,
  removeFriend,
  cancelSentRequest,
} = require("../controllers/friendController");

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   - name: Friends
 *     description: Friend request APIs (uses Socket.IO for real-time notifications)
 *
 * @swagger
 * /api/friends/send:
 *   post:
 *     summary: Send friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [toUserId]
 *             properties:
 *               toUserId:
 *                 type: string
 *                 description: ID of user to send friend request to
 *     responses:
 *       201:
 *         description: Friend request sent (receiver gets Socket.IO event "friendRequestReceived")
 *       400:
 *         description: Already friends, request pending, or invalid request
 *       404:
 *         description: User not found
 */
router.post("/send", sendFriendRequest);

/**
 * @swagger
 * /api/friends/accept/{requestId}:
 *   put:
 *     summary: Accept friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request accepted (sender gets Socket.IO event "friendRequestAccepted")
 *       403:
 *         description: Only receiver can accept
 *       404:
 *         description: Request not found
 */
router.put("/accept/:requestId", acceptFriendRequest);

/**
 * @swagger
 * /api/friends/reject/{requestId}:
 *   put:
 *     summary: Reject friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request rejected
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Request not found
 */
router.put("/reject/:requestId", rejectFriendRequest);

/**
 * @swagger
 * /api/friends/list:
 *   get:
 *     summary: Get list of friends
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of friend users
 */
router.get("/list", getFriends);

/**
 * @swagger
 * /api/friends/pending:
 *   get:
 *     summary: Get pending friend requests (received by me)
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of pending friend requests
 */
router.get("/pending", getPendingRequests);

/**
 * @swagger
 * /api/friends/sent:
 *   get:
 *     summary: Get sent friend requests (pending)
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of sent friend requests
 */
router.get("/sent", getSentRequests);

/**
 * @swagger
 * /api/friends/check/{targetUserId}:
 *   get:
 *     summary: Check friendship status with a user
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns status (none|pending|sent|accepted|rejected)
 */
router.get("/check/:targetUserId", checkFriendship);

/**
 * @swagger
 * /api/friends/remove/{friendId}:
 *   delete:
 *     summary: Remove a friend (Unfriend)
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend removed successfully
 *       404:
 *         description: Friendship not found
 */
router.delete("/remove/:friendId", removeFriend);
router.delete("/cancel/:targetUserId", cancelSentRequest);

module.exports = router;
