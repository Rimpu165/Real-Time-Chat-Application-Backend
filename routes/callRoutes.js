const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { createCallLog, getRoomCallHistory } = require("../controllers/callController");

const router = express.Router();

router.post("/log", authMiddleware, createCallLog);
router.get("/room/:roomId", authMiddleware, getRoomCallHistory);

module.exports = router;
