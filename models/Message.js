const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    message: {
      type: String,
      default: ""
    },
    fileUrl: {
      type: String,
      default: ""
    },
    fileType: {
      type: String,
      enum: ["text", "image", "video", "document", "audio"],
      default: "text"
    },
    fileName: {
      type: String,
      default: ""
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent"
    },
    audioDuration: {
      type: Number,
      default: 0
    },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
