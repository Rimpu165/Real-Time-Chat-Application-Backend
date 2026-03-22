# Chat Application - Frontend Implementation Guide

This document describes how to integrate a frontend with the Chat Application Backend API.

---

## Table of Contents
1. [Base Configuration](#base-configuration)
2. [Authentication](#authentication)
3. [REST API Endpoints](#rest-api-endpoints)
4. [Socket.IO Real-Time Events](#socketio-real-time-events)
5. [Voice & Video Calls (WebRTC)](#voice--video-calls-webrtc)
6. [Feature Implementation Checklist](#feature-implementation-checklist)

---

## Base Configuration

| Item | Value |
|------|-------|
| **Base URL** | `http://localhost:5000` |
| **API Prefix** | `/api` |
| **Swagger Docs** | `http://localhost:5000/api-docs` |
| **Auth Header** | `Authorization: Bearer <token>` |
| **Socket.IO** | Connect to `http://localhost:5000` |

---

## Authentication

### Register (Signup)
```http
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```
**Response:** `{ "message": "User registered successfully", "user": {...} }`

*Alias:* `POST /api/auth/register` (same as signup)

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```
**Response:** `{ "token": "eyJhbG...", "user": { "_id", "name", "email", "profilePhoto", "status", "lastSeen" } }`

### Get Profile (Authenticated)
```http
GET /api/auth/profile
Authorization: Bearer <token>
```
**Response:** Full user object (without password)

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```
**Note:** Stateless JWT. Client must remove token on logout.

---

## REST API Endpoints

All endpoints below (except auth login/signup) require: `Authorization: Bearer <token>`

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users (supports `?search=term`) |
| GET | `/api/users/:id` | Get user by ID |
| PUT | `/api/users` | Update current user `{ name, status }` |
| POST | `/api/users/profile-photo` | Upload profile photo (multipart/form-data, field: `photo`) |

### Friends
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/friends/send` | Send friend request `{ toUserId }` |
| PUT | `/api/friends/accept/:requestId` | Accept friend request |
| PUT | `/api/friends/reject/:requestId` | Reject friend request |
| GET | `/api/friends/list` | List friends |
| GET | `/api/friends/pending` | Pending requests (received by me) |
| GET | `/api/friends/sent` | Sent requests (pending) |
| GET | `/api/friends/check/:targetUserId` | Check status: `none` \| `pending` \| `sent` \| `accepted` \| `rejected` |

### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rooms/direct` | Create/get 1-vs-1 room `{ receiverId }` |
| POST | `/api/rooms/group` | Create group `{ groupName, participants: [userId, ...] }` |
| GET | `/api/rooms` | List user's rooms |
| GET | `/api/rooms/:roomId/send-status` | Check if can send (for one-message limit) |
| PUT | `/api/rooms/:roomId/add` | Add members to group `{ userIds: [...] }` |
| PUT | `/api/rooms/:roomId/remove` | Remove member `{ removeUserId }` |
| PUT | `/api/rooms/:roomId/leave` | Leave group |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/messages/send` | Send message `{ roomId, message, replyTo? }` or multipart with `file` |
| GET | `/api/messages/:roomId` | Get message history |
| PUT | `/api/messages/:roomId/seen` | Mark as seen |
| PUT | `/api/messages/:messageId/edit` | Edit message `{ newText }` |
| DELETE | `/api/messages/:messageId` | Delete message |

**Important:** Non-friends can send only **one** intro message in direct chat. After that, they must become friends to continue.

---

## Socket.IO Real-Time Events

**Connect:**
```javascript
const socket = io("http://localhost:5000", {
  query: { userId: currentUser._id }  // Required for user mapping
});
```

### Client → Server (Emit)

| Event | Payload | Purpose |
|-------|---------|---------|
| `joinRoom` | `{ roomId }` | Join chat room (do this when opening a chat) |
| `leaveRoom` | `{ roomId }` | Leave chat room |
| `typing` | `{ roomId }` | User started typing |
| `stopTyping` | `{ roomId }` | User stopped typing |
| `callUser` | `{ userToCall, signalData, from, name, isVideo }` | Start 1-vs-1 call |
| `answerCall` | `{ to, signal }` | Answer 1-vs-1 call |
| `iceCandidate` | `{ to, candidate }` | WebRTC ICE candidate (1-vs-1) |
| `endCall` | `{ to }` | End 1-vs-1 call |
| `callRoom` | `{ roomId, signalData, from, name, isVideo }` | Start group call |
| `roomCallAnswer` | `{ roomId, toUserId, signal }` | Join group call |
| `roomIceCandidate` | `{ toUserId, candidate }` | WebRTC ICE (group) |
| `endRoomCall` | `{ roomId }` | End group call |

### Server → Client (Listen)

| Event | Payload | Purpose |
|-------|---------|---------|
| `receiveMessage` | `Message` | New message in room |
| `newMessageNotification` | `{ roomId, senderName, preview }` | New message when NOT in that room (for toast/badge) |
| `messageEdited` | `{ messageId, newText }` | Message was edited |
| `messageDeleted` | `{ messageId }` | Message was deleted |
| `messagesSeen` | `{ roomId, byUser }` | Messages marked as seen |
| `friendRequestReceived` | `FriendRequest` | Incoming friend request |
| `friendRequestAccepted` | `FriendRequest` | Your request was accepted |
| `userTyping` | `{ userId }` | Someone typing |
| `userStoppedTyping` | `{ userId }` | Stopped typing |
| `getOnlineUsers` | `string[]` | Array of online user IDs |
| `userOffline` | `{ userId, lastSeen }` | User went offline |
| `incomingCall` | `{ signal, from, name, isVideo }` | Incoming 1-vs-1 call |
| `callAccepted` | `signal` (RTCSessionDescription) | Call answered |
| `iceCandidate` | `candidate` (RTCIceCandidate) | ICE candidate (1-vs-1) |
| `callEnded` | - | Call ended |
| `incomingRoomCall` | `{ signal, from, name, isVideo, roomId }` | Incoming group call |
| `roomCallAnswered` | `{ signal, from, roomId }` | User joined group call |
| `roomIceCandidate` | `{ candidate, from }` | ICE (group) |
| `roomCallEnded` | `{ roomId }` | Group call ended |

---

## Voice & Video Calls (WebRTC)

### 1-vs-1 Call Flow

**Caller:**
1. `getUserMedia({ audio: true, video: isVideo })`
2. Create `RTCPeerConnection` with STUN: `stun:stun.l.google.com:19302`
3. Add tracks: `pc.addTrack(track, stream)`
4. Create offer: `pc.createOffer()` → `pc.setLocalDescription(offer)`
5. Emit `callUser`: `{ userToCall, signalData: pc.localDescription, from, name, isVideo }`
6. On `callAccepted`: `pc.setRemoteDescription(signal)`
7. On `iceCandidate`: `pc.addIceCandidate(candidate)`

**Receiver:**
1. On `incomingCall`: show modal with `{ signal, from, name, isVideo }`
2. On accept: `getUserMedia`, create `RTCPeerConnection`, add tracks
3. `pc.setRemoteDescription(signal)` (the offer)
4. Create answer: `pc.createAnswer()` → `pc.setLocalDescription(answer)`
5. Emit `answerCall`: `{ to: from, signal: pc.localDescription }`
6. On `iceCandidate`: `pc.addIceCandidate(candidate)`

**Both:**
- `pc.ontrack` → attach `event.streams[0]` to remote `<video>` element
- `pc.onicecandidate` → emit `iceCandidate` when `event.candidate` exists
- On `callEnded` or hang up: stop tracks, close `pc`, emit `endCall`

### Group Calls
Group calls use the same WebRTC logic but with `callRoom`, `roomCallAnswer`, `roomIceCandidate`, `endRoomCall`. Each participant connects to the initiator (mesh can be extended for peer-to-peer between all members).

---

## Feature Implementation Checklist

### Phase 1: Core
- [ ] Login / Register UI
- [ ] Store JWT, add to all API requests
- [ ] Socket.IO connect with `userId` on login
- [ ] List rooms (GET /rooms)
- [ ] Create/open direct chat (POST /rooms/direct)
- [ ] Send message (POST /messages/send)
- [ ] Get messages (GET /messages/:roomId)
- [ ] Listen: `receiveMessage`, append to chat
- [ ] `joinRoom` when opening chat, `leaveRoom` when leaving

### Phase 2: Friends & Restrictions
- [ ] Friend request: send, accept, reject
- [ ] List friends, pending requests
- [ ] Search users (GET /users?search=)
- [ ] Check send-status (GET /rooms/:roomId/send-status)
- [ ] One-message limit UI: show "Send friend request to continue"
- [ ] Listen: `friendRequestReceived`, `friendRequestAccepted`

### Phase 3: Groups
- [ ] Create group (friends only)
- [ ] Add/remove members, leave group
- [ ] Group chat UI (same as direct, use room.name)

### Phase 4: Real-Time UX
- [ ] Typing indicator: emit `typing`/`stopTyping`, listen for `userTyping`
- [ ] Message seen status
- [ ] Edit/delete message
- [ ] Toast for `newMessageNotification` (when not in that room)
- [ ] Online/offline: listen `getOnlineUsers`, `userOffline`

### Phase 5: Voice/Video
- [ ] Call buttons (Voice, Video) in chat header
- [ ] Incoming call modal (accept/reject)
- [ ] WebRTC: getUserMedia, RTCPeerConnection
- [ ] Call overlay with local + remote video
- [ ] End call

---

## Example: Send Message with File

```javascript
const formData = new FormData();
formData.append("roomId", roomId);
formData.append("message", "Check this out");
formData.append("file", fileInput.files[0]);

fetch(`${API_URL}/messages/send`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData
});
```

---

## Example: Socket Connection

```javascript
const socket = io("http://localhost:5000", {
  query: { userId: user._id }
});

socket.on("receiveMessage", (msg) => {
  if (msg.room === activeRoomId) appendMessage(msg);
  else showNotification(msg);
});

socket.on("incomingCall", ({ signal, from, name, isVideo }) => {
  showIncomingCallModal({ signal, from, name, isVideo });
});
```

---

For full API schemas and try-it-out, use **Swagger UI**: `http://localhost:5000/api-docs`
