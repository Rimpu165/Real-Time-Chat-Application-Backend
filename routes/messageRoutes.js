const express = require("express");
const { sendMessage, getMessages, markMessagesAsSeen, editMessage, deleteMessage } = require("../controllers/messageController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

/**
 * @swagger
 * /api/messages/send:
 *   post:
 *     summary: Send a message to a specific user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roomId:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/send", authMiddleware, upload.single("file"), sendMessage);

/**
 * @swagger
 * /api/messages/{roomId}:
 *   get:
 *     summary: Get message history for a specific room
 *     tags: [Messages]
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
 *         description: Array of messages
 *       401:
 *         description: Unauthorized
 */
router.get("/:roomId", authMiddleware, getMessages);

/**
 * @swagger
 * /api/messages/{roomId}/seen:
 *   put:
 *     summary: Mark messages in a room as seen
 *     tags: [Messages]
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
 *         description: Messages marked as seen
 */
router.put("/:roomId/seen", authMiddleware, markMessagesAsSeen);

/**
 * @swagger
 * /api/messages/{messageId}/edit:
 *   put:
 *     summary: Edit a specific message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newText:
 *                 type: string
 *     responses:
 *       200:
 *         description: Edited message
 */
router.put("/:messageId/edit", authMiddleware, editMessage);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   delete:
 *     summary: Delete a specific message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted
 */
router.delete("/:messageId", authMiddleware, deleteMessage);

module.exports = router;
