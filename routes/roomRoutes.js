const express = require("express");
const { createOrGetRoom, createGroupRoom, getUserRooms, addGroupMember, removeGroupMember, leaveGroup, getRoomSendStatus } = require("../controllers/roomController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * @swagger
 * /api/rooms/direct:
 *   post:
 *     summary: Retrieve or create a 1-v-1 room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               receiverId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Room data
 */
router.post("/direct", authMiddleware, createOrGetRoom);

/**
 * @swagger
 * /api/rooms/group:
 *   post:
 *     summary: Create a Group Chat
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupName:
 *                 type: string
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Group Room Created
 */
router.post("/group", authMiddleware, createGroupRoom);

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Get all rooms/chats for the logged-in user
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of rooms
 */
router.get("/", authMiddleware, getUserRooms);

/**
 * @swagger
 * /api/rooms/{roomId}/send-status:
 *   get:
 *     summary: Check if user can send messages (one-message limit for non-friends)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Returns canSend, introUsed, message
 */
router.get("/:roomId/send-status", authMiddleware, getRoomSendStatus);

/**
 * @swagger
 * /api/rooms/{roomId}/add:
 *   put:
 *     summary: Add members to group (admin only, friends only)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Updated room
 */
router.put("/:roomId/add", authMiddleware, addGroupMember);

/**
 * @swagger
 * /api/rooms/{roomId}/remove:
 *   put:
 *     summary: Remove member from group (admin only)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               removeUserId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated room
 */
router.put("/:roomId/remove", authMiddleware, removeGroupMember);

/**
 * @swagger
 * /api/rooms/{roomId}/leave:
 *   put:
 *     summary: Leave a group
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *     responses:
 *       200:
 *         description: Left successfully
 */
router.put("/:roomId/leave", authMiddleware, leaveGroup);

module.exports = router;
