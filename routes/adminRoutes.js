const express = require("express");
const router = express.Router();

const {
    getDashboardStats,
    getAllUsers,
    deleteUser,
    getAllRooms,
    deleteRoom,
    toggleBlockUser,
    updateUserRole
} = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// All routes are protected by authMiddleware and adminMiddleware

router.get("/stats", authMiddleware, adminMiddleware, getDashboardStats);

router.get("/users", authMiddleware, adminMiddleware, getAllUsers);
router.delete("/users/:id", authMiddleware, adminMiddleware, deleteUser);

router.get("/rooms", authMiddleware, adminMiddleware, getAllRooms);
router.delete("/rooms/:id", authMiddleware, adminMiddleware, deleteRoom);

router.patch("/users/:id/block", authMiddleware, adminMiddleware, toggleBlockUser);
router.patch("/users/:id/role", authMiddleware, adminMiddleware, updateUserRole);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get application statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Application statistics retrieved successfully
 *       403:
 *         description: Forbidden - Admin access required
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Forbidden - Admin access required
 */

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/admin/rooms:
 *   get:
 *     summary: Get all rooms
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rooms retrieved successfully
 *       403:
 *         description: Forbidden - Admin access required
 */

/**
 * @swagger
 * /api/admin/rooms/{id}:
 *   delete:
 *     summary: Delete a room
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room deleted successfully
 *       403:
 *         description: Forbidden - Admin access required
 */

/**
 * @swagger
 * /api/admin/users/{id}/block:
 *   patch:
 *     summary: Toggle block/unblock status of a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User block status toggled successfully
 */

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   patch:
 *     summary: Update a user's role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       200:
 *         description: User role updated successfully
 */

module.exports = router;
