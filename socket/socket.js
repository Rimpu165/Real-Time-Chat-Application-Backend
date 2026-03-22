const { Server } = require("socket.io");
const http = require("http");
const express = require("express");

const User = require("../models/User");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

const userSocketMap = {}; // { userId: socketId }

const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId];
};

// Emit to a specific user by userId (for notifications, etc.)
const emitToUser = (userId, event, data) => {
  const socketId = userSocketMap[userId];
  if (socketId) io.to(socketId).emit(event, data);
};

io.on("connection", async (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  
  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id;
    // Mark user as online in DB (optional, but good for consistency)
    await User.findByIdAndUpdate(userId, { status: "online" });
  }

  // send event to all connected clients regarding online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // --- ROOM EVENTS ---
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User ${userId} joined room ${roomId}`);
  });

  socket.on("leaveRoom", (roomId) => {
    socket.leave(roomId);
    console.log(`User ${userId} left room ${roomId}`);
  });

  // --- TYPING EVENTS ---
  socket.on("typing", ({ roomId }) => {
    socket.to(roomId).emit("userTyping", { userId });
  });

  socket.on("stopTyping", ({ roomId }) => {
    socket.to(roomId).emit("userStoppedTyping", { userId });
  });

  // --- WEBRTC SIGNALING (VOICE/VIDEO CALLING) ---
  
  // Caller initiates call
  socket.on("callUser", (data) => {
    const { userToCall, signalData, from, name, isVideo } = data;
    const receiverSocketId = getReceiverSocketId(userToCall);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incomingCall", { signal: signalData, from, name, isVideo });
    }
  });

  // Receiver answers call
  socket.on("answerCall", (data) => {
    const { to, signal } = data;
    const callerSocketId = getReceiverSocketId(to);

    if (callerSocketId) {
      io.to(callerSocketId).emit("callAccepted", signal);
    }
  });

  // Relay ICE Candidates for p2p connection
  socket.on("iceCandidate", (data) => {
     const { to, candidate } = data;
     const peerSocketId = getReceiverSocketId(to);

     if (peerSocketId) {
         io.to(peerSocketId).emit("iceCandidate", candidate);
     }
  });

  // End a call
  socket.on("endCall", (data) => {
     const { to } = data;
     const peerSocketId = getReceiverSocketId(to);

     if (peerSocketId) {
         io.to(peerSocketId).emit("callEnded");
     }
  });

  // --- GROUP VOICE/VIDEO CALL (Socket.IO real-time) ---
  // Start group/room call - notifies all participants in the room
  socket.on("callRoom", (data) => {
    const { roomId, signalData, from, name, isVideo } = data;
    socket.to(roomId).emit("incomingRoomCall", {
      signal: signalData,
      from,
      name,
      isVideo,
      roomId,
    });
  });

  // Answer/join a group call - send signal to specific user in room
  socket.on("roomCallAnswer", (data) => {
    const { roomId, toUserId, signal } = data;
    const targetSocketId = getReceiverSocketId(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("roomCallAnswered", {
        signal,
        from: userId,
        roomId,
      });
    }
  });

  // Relay ICE candidate for group call (peer-to-peer in mesh)
  socket.on("roomIceCandidate", (data) => {
    const { toUserId, candidate } = data;
    const targetSocketId = getReceiverSocketId(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("roomIceCandidate", {
        candidate,
        from: userId,
      });
    }
  });

  // End group call - notify all in room
  socket.on("endRoomCall", (data) => {
    const { roomId } = data;
    io.to(roomId).emit("roomCallEnded", { roomId });
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected", socket.id);
    if (userId) {
      delete userSocketMap[userId];
      const now = new Date();
      // Update last unseen and status
      await User.findByIdAndUpdate(userId, { lastSeen: now, status: "offline" });
      // Tell others this specific user went offline and when
      io.emit("userOffline", { userId, lastSeen: now });
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

module.exports = { app, io, server, getReceiverSocketId, emitToUser };
