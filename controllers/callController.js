const CallLog = require("../models/CallLog");
const Room = require("../models/Room");

const createCallLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomId, peerId, type, direction, status, durationSec } = req.body;

    if (!roomId || !peerId || !direction) {
      return res.status(400).json({ message: "roomId, peerId and direction are required" });
    }

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });
    const isParticipant = (room.participants || []).some((p) => String(p) === String(userId));
    if (!isParticipant) return res.status(403).json({ message: "Unauthorized" });

    const log = await CallLog.create({
      room: roomId,
      user: userId,
      peer: peerId,
      type: type || "audio",
      direction,
      status: status || "started",
      durationSec: Number(durationSec || 0),
    });

    const populated = await log.populate("peer", "name profilePhoto");
    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getRoomCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });
    const isParticipant = (room.participants || []).some((p) => String(p) === String(userId));
    if (!isParticipant) return res.status(403).json({ message: "Unauthorized" });

    const logs = await CallLog.find({ room: roomId, user: userId })
      .populate("peer", "name profilePhoto")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { createCallLog, getRoomCallHistory };
