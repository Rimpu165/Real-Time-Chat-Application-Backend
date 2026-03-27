const Message = require("../models/Message");
const Room = require("../models/Room");
const { io, emitToUser } = require("../socket/socket");
const { areFriends } = require("../utils/friendUtils");

const sendMessage = async (req, res) => {
  try {
    const { roomId, message, replyTo, audioDuration } = req.body;
    const senderId = req.user.id; // from auth middleware

    const hasMessage = message && message.trim() !== "";
    const hasFile = req.file !== undefined;

    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }

    if (!hasMessage && !hasFile) {
      return res.status(400).json({ message: "Message content or a file is required" });
    }

    // --- One-message limit for non-friends (direct chat only) ---
    const room = await Room.findById(roomId);
    if (room && !room.isGroup) {
      const otherParticipant = room.participants.find(
        (p) => p.toString() !== senderId
      );
      if (otherParticipant) {
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


    let fileUrl = "";
    let fileType = "text";
    let fileName = "";

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
      audioDuration: audioDuration || 0
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

    // Find unread messages in the room where sender is NOT the current user
    const filter = {
      room: roomId,
      sender: { $ne: userId },
      status: { $ne: "seen" }
    };

    // Note: in older Mongoose, updateMany might not return modified count easily, this will just update them all
    await Message.updateMany(filter, { status: "seen" });

    // Emit a socket event letting other users in the room know messages are seen
    io.to(roomId).emit("messagesSeen", { roomId, byUser: userId });

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

module.exports = { sendMessage, getMessages, markMessagesAsSeen, editMessage, deleteMessage, reactToMessage };
