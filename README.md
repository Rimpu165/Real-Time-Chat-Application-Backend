# Chat Application Backend

Node.js/Express backend for a real-time chat application with Socket.IO and WebRTC support.

## Features
- JWT authentication
- Direct & group chat
- Friend requests (one-message limit for non-friends)
- Real-time messaging, typing, notifications
- Voice & video calls (1-vs-1 WebRTC)
- File attachments in messages
- Admin Dashboard and Management API

## Quick Start

```bash
npm install
npm run dev # or npm start
```

Server runs on `http://localhost:5000`

## Admin Capabilities

The `/api/admin` routes provide administrative privileges:
1. View overall dashboard statistics (total users, rooms, messages).
2. Get complete lists of all users and rooms.
3. Delete arbitrary users and their associated messages.
4. Delete chat rooms and their associated messages.

**Make yourself an Admin:**
Once your database is connected, you can promote any registered user to an Admin via the provided terminal script:
```bash
node make-admin.js "user@example.com"
```

## Documentation

| Resource | URL |
|----------|-----|
| **Swagger API Docs** | http://localhost:5000/api-docs |
| **Frontend Integration Guide** | [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md) |

The **FRONTEND_GUIDE.md** contains:
- All REST API endpoints with request/response
- Socket.IO events (emit & listen)
- WebRTC voice/video call flow
- Feature implementation checklist
- Code examples

## Environment

Create `.env` with:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chatdb
JWT_SECRET=your_secret_key
```
