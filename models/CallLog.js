const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    peer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["audio", "video"],
      default: "audio",
    },
    direction: {
      type: String,
      enum: ["incoming", "outgoing"],
      required: true,
    },
    status: {
      type: String,
      enum: ["started", "answered", "rejected", "missed", "ended"],
      default: "started",
    },
    durationSec: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CallLog", callLogSchema);
