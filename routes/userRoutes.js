const express = require("express")
const router = express.Router()

const { 
  getUsers, 
  getUserById, 
  uploadProfilePhoto, 
  uploadCoverPhoto, 
  addToGallery, 
  removeFromGallery, 
  updateUser, 
  deleteUser, 
  toggleBlockUser 
} = require("../controllers/userController")
const authMiddleware = require("../middleware/authMiddleware")
const upload = require("../middleware/uploadMiddleware")

router.get("/", authMiddleware, getUsers)
router.put("/", authMiddleware, updateUser)
router.delete("/", authMiddleware, deleteUser)

router.get("/:id", authMiddleware, getUserById)

const handleUpload = (req, res, next) => {
  upload.single("photo")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message })
    next()
  })
}

const handleCoverUpload = (req, res, next) => {
  upload.single("cover")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message })
    next()
  })
}

const handleGalleryUpload = (req, res, next) => {
  upload.array("images", 10)(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message })
    next()
  })
}

router.post("/profile-photo", authMiddleware, handleUpload, uploadProfilePhoto)
router.put("/profile-photo", authMiddleware, handleUpload, uploadProfilePhoto)
router.post("/cover-photo", authMiddleware, handleCoverUpload, uploadCoverPhoto)
router.post("/gallery", authMiddleware, handleGalleryUpload, addToGallery)
router.delete("/gallery", authMiddleware, removeFromGallery)
router.put("/block/:targetUserId", authMiddleware, toggleBlockUser)

module.exports = router

/**
 * @swagger
 * /api/users/profile-photo:
 *   post:
 *     summary: Upload profile photo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile photo uploaded successfully
 *       400:
 *         description: Bad request (No file or invalid file type)
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
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
 *         description: User data
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/users:
 *   put:
 *     summary: Update current user information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *
 *   delete:
 *     summary: Delete current user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/users/profile-photo:
 *   put:
 *     summary: Update profile photo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile photo updated successfully
 *       400:
 *         description: Bad request
 */