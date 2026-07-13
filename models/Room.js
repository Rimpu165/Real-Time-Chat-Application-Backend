const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    isGroup: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String, // Only used if it's a group chat
      trim: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    groupImage: {
      type: String,
      default: ""
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  { timestamps: true }
);

// Index to optimize chat list retrieval for participants
roomSchema.index({ participants: 1 });

module.exports = mongoose.model("Room", roomSchema);
