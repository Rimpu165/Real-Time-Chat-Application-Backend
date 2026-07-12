const Message = require("../models/Message");
const Room = require("../models/Room");
const User = require("../models/User");
const { io, emitToUser, getReceiverSocketId } = require("../socket/socket");
const { areFriends } = require("../utils/friendUtils");
const webpush = require("web-push");

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:rimpurajput165@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("VAPID keys are not fully configured in environment variables. Web Push Notifications will be disabled.");
}

const sendPushNotificationToUser = async (userId, payloadData) => {
  try {
    const user = await User.findById(userId).select("pushSubscription");
    if (!user || !user.pushSubscription || user.pushSubscription.length === 0) {
      return;
    }

    const payload = JSON.stringify({
      title: payloadData.title,
      body: payloadData.body,
      data: {
        roomId: payloadData.roomId,
        url: `/chat?roomId=${payloadData.roomId}`
      }
    });

    const invalidEndpoints = [];

    const promises = user.pushSubscription.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err) {
        console.error("Push notification delivery failed for endpoint:", sub.endpoint, err.message);
        if (err.statusCode === 410 || err.statusCode === 404) {
          invalidEndpoints.push(sub.endpoint);
        }
      }
    });

    await Promise.all(promises);

    if (invalidEndpoints.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { pushSubscription: { endpoint: { $in: invalidEndpoints } } }
      });
    }
  } catch (error) {
    console.error("Error in sendPushNotificationToUser:", error);
  }
};

const sendMessage = async (req, res) => {
  try {
    const { roomId, message, replyTo, audioDuration, isForwarded, fileUrl: forwardedFileUrl, fileType: forwardedFileType, fileName: forwardedFileName, vanishTime } = req.body;
    const senderId = req.user.id; // from auth middleware

    const hasMessage = message && message.trim() !== "";
    const hasFile = req.file !== undefined;
    const hasForwardedFile = forwardedFileUrl && forwardedFileUrl.trim() !== "";

    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }

    if (!hasMessage && !hasFile && !hasForwardedFile) {
      return res.status(400).json({ message: "Message content or a file is required" });
    }

    // --- One-message limit for non-friends (direct chat only) ---
    const room = await Room.findById(roomId);
    if (room && !room.isGroup) {
      const otherParticipant = room.participants.find(
        (p) => p.toString() !== senderId
      );
      if (otherParticipant) {
        const [senderUser, receiverUser] = await Promise.all([
          User.findById(senderId).select("blockedUsers"),
          User.findById(otherParticipant.toString()).select("blockedUsers"),
        ]);

        const blockedBySender = (senderUser?.blockedUsers || []).some(
          (id) => String(id) === String(otherParticipant)
        );
        const blockedByReceiver = (receiverUser?.blockedUsers || []).some(
          (id) => String(id) === String(senderId)
        );

        if (blockedBySender || blockedByReceiver) {
          return res.status(403).json({
            message: "Messaging is blocked between these users.",
          });
        }

        const friends = await areFriends(senderId, otherParticipant.toString());
        if (!friends) {
          const myMessagesCount = await Message.countDocuments({
            room: roomId,
            sender: senderId,
          });
          const otherMessagesCount = await Message.countDocuments({
            room: roomId,
            sender: otherParticipant.toString(),
          });

          // Block if I already sent 1+ message AND they have NOT replied yet
          if (myMessagesCount >= 1 && otherMessagesCount === 0) {
            return res.status(403).json({
              message:
                "Recipient hasn't replied yet. You can send only one initial message. Send a friend request to unlock unlimited chatting.",
            });
          }
        }
      }
    }


    let fileUrl = forwardedFileUrl || "";
    let fileType = forwardedFileType || "text";
    let fileName = forwardedFileName || "";

    if (hasFile) {
      fileUrl = req.file.path;
      fileName = req.file.originalname || req.file.filename;
      // Determine general file type
      const mime = req.file.mimetype;
      if (mime.startsWith("image/")) fileType = "image";
      else if (mime.startsWith("video/")) fileType = "video";
      else if (mime.startsWith("audio/")) fileType = "audio";
      else fileType = "document";
    }

    const newMessage = new Message({
      sender: senderId,
      room: roomId,
      message: message || "", // can be empty if it's just a file
      fileUrl,
      fileType,
      fileName,
      replyTo: replyTo || null,
      audioDuration: audioDuration || 0,
      isForwarded: isForwarded === true || isForwarded === "true",
      vanishTime: vanishTime ? Number(vanishTime) : 0
    });

    await newMessage.save();

    // Update the room's latest message
    await Room.findByIdAndUpdate(roomId, { latestMessage: newMessage._id, updatedAt: new Date() });

    // Populate sender info and reply info before emitting
    await newMessage.populate([
      { path: "sender", select: "name profilePhoto" },
      { path: "replyTo", select: "message sender", populate: { path: "sender", select: "name" } }
    ]);

    // SOCKET IO - emit to room (users who joined)
    io.to(roomId).emit("receiveMessage", newMessage);

    // Real-time notification: emit to each participant (for badge/toast when not in room)
    const roomDoc = await Room.findById(roomId);
    if (roomDoc && roomDoc.participants) {
      const senderIdStr = senderId.toString();
      const preview = (message || (fileName ? `📎 ${fileName}` : "Attachment")).slice(0, 50);
      roomDoc.participants.forEach((p) => {
        const pid = p.toString ? p.toString() : p;
        if (pid !== senderIdStr) {
          emitToUser(pid, "newMessageNotification", {
            roomId,
            message: newMessage,
            senderName: newMessage.sender?.name || "Someone",
            preview: preview + (preview.length >= 50 ? "..." : ""),
          });

          const socketId = getReceiverSocketId(pid);
          if (!socketId) {
            sendPushNotificationToUser(pid, {
              title: newMessage.sender?.name || "New Message",
              body: preview + (preview.length >= 50 ? "..." : ""),
              roomId: roomId.toString()
            });
          }
        }
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;

    const messages = await Message.find({ room: roomId })
      .populate("sender", "name profilePhoto")
      .populate({ path: "replyTo", select: "message sender isDeleted", populate: { path: "sender", select: "name" } })
      .sort({ createdAt: 1 }); // Sort by creation time

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markMessagesAsSeen = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const seenAt = new Date();

    // Find unread messages in the room where sender is NOT the current user
    const filter = {
      room: roomId,
      sender: { $ne: userId },
      status: { $ne: "seen" }
    };

    // Find if there are messages that need to vanish
    const vanishMessages = await Message.find({
      ...filter,
      vanishTime: { $gt: 0 }
    });

    // Update all matching messages to seen
    await Message.updateMany(filter, { status: "seen", seenAt });

    // Schedule deletion timers for vanish messages
    vanishMessages.forEach((msg) => {
      setTimeout(async () => {
        try {
          await Message.findByIdAndDelete(msg._id);
          
          // Clean up Room's latestMessage reference if it points to this deleted message
          const roomDoc = await Room.findById(roomId);
          if (roomDoc && roomDoc.latestMessage && roomDoc.latestMessage.toString() === msg._id.toString()) {
            const prevMsg = await Message.findOne({ room: roomId, _id: { $ne: msg._id } }).sort({ createdAt: -1 });
            await Room.findByIdAndUpdate(roomId, { latestMessage: prevMsg ? prevMsg._id : null });
          }

          // Emit event to room
          io.to(roomId).emit("messageVanished", { messageId: msg._id, roomId });
        } catch (err) {
          console.error("Error deleting vanish message on timer:", err);
        }
      }, msg.vanishTime * 1000);
    });

    // Emit a socket event letting other users in the room know messages are seen
    io.to(roomId).emit("messagesSeen", { roomId, byUser: userId, seenAt });

    res.status(200).json({ message: "Messages marked as seen" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newText } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.sender.toString() !== userId) return res.status(403).json({ message: "Unauthorized to edit this message" });
    if (message.isDeleted) return res.status(400).json({ message: "Cannot edit a deleted message" });

    message.message = newText;
    message.isEdited = true;
    await message.save();

    io.to(message.room.toString()).emit("messageEdited", { messageId, newText: message.message, isEdited: true });

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.sender.toString() !== userId) return res.status(403).json({ message: "Unauthorized to delete this message" });

    message.isDeleted = true;
    message.message = "This message was deleted"; // obfuscate message text
    await message.save();

    // Let the room know the message was deleted
    io.to(message.room.toString()).emit("messageDeleted", { messageId });

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const reactToMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id;

        const message = await Message.findById(messageId);
        
        if (!message) return res.status(404).json({ message: "Message not found" });

        // Check if user already reacted with this emoji
        const existingReactionIndex = message.reactions.findIndex(
            r => r.user.toString() === userId && r.emoji === emoji
        );

        if (existingReactionIndex > -1) {
            // Remove reaction if it already exists (toggle)
            message.reactions.splice(existingReactionIndex, 1);
        } else {
            // Add new reaction
            message.reactions.push({ user: userId, emoji });
        }

        await message.save();

        // Populate user for the reaction returning to client
        await message.populate("reactions.user", "name profilePhoto");

        // Emit to room
        io.to(message.room.toString()).emit("messageReaction", { 
            messageId, 
            reactions: message.reactions 
        });

        res.status(200).json(message);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const clearRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const isParticipant = (room.participants || []).some(
      (p) => String(p) === String(userId)
    );
    if (!isParticipant) return res.status(403).json({ message: "Unauthorized" });

    await Message.deleteMany({ room: roomId });
    room.latestMessage = undefined;
    room.updatedAt = new Date();
    await room.save();

    io.to(roomId).emit("chatCleared", { roomId, byUser: userId });
    res.status(200).json({ message: "Chat cleared successfully", roomId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const translateMessage = async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) {
      return res.status(400).json({ message: "Text and targetLang are required" });
    }

    const https = require("https");
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    https.get(url, (apiRes) => {
      let data = "";
      apiRes.on("data", (chunk) => {
        data += chunk;
      });
      apiRes.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed[0]) {
            const translatedText = parsed[0].map((item) => item[0]).join("");
            res.status(200).json({ translatedText });
          } else {
            res.status(500).json({ message: "Translation response structure mismatch" });
          }
        } catch (err) {
          res.status(500).json({ message: "Translation parsing error: " + err.message });
        }
      });
    }).on("error", (err) => {
      res.status(500).json({ message: "Translation network error: " + err.message });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const togglePinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    
    if (!message) return res.status(404).json({ message: "Message not found" });

    message.isPinned = !message.isPinned;
    await message.save();

    // Populate sender info
    await message.populate("sender", "name profilePhoto");

    // Emit socket event to room
    io.to(message.room.toString()).emit("messagePinToggled", {
      messageId: message._id,
      isPinned: message.isPinned,
      message,
    });

    res.status(200).json({ message: `Message ${message.isPinned ? "pinned" : "unpinned"} successfully`, isPinned: message.isPinned, msg: message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPinnedMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const pinnedMessages = await Message.find({ room: roomId, isPinned: true, isDeleted: false })
      .populate("sender", "name profilePhoto")
      .populate({ path: "replyTo", select: "message sender isDeleted", populate: { path: "sender", select: "name" } })
      .sort({ createdAt: -1 });

    res.status(200).json(pinnedMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  markMessagesAsSeen,
  editMessage,
  deleteMessage,
  reactToMessage,
  clearRoomMessages,
  translateMessage,
  togglePinMessage,
  getPinnedMessages,
};
