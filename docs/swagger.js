const swaggerJsdoc = require("swagger-jsdoc")

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Chat Application Backend API",
      version: "1.0.0",
      description: "REST API for chat application with real-time Socket.IO, WebRTC support, and Cloudinary media uploads. See FRONTEND_GUIDE.md for implementation details."
    },
    servers: [
      {
        url: "https://real-time-chat-application-backend-tjm8.onrender.com",
        description: "Live Server"
      },
      {
        url: "http://localhost:5000",
        description: "Local Server"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        User: { type: "object", properties: { _id: { type: "string" }, name: { type: "string" }, email: { type: "string" }, profilePhoto: { type: "string" }, status: { type: "string" }, lastSeen: { type: "string", format: "date-time" } } },
        Room: { type: "object", properties: { _id: { type: "string" }, isGroup: { type: "boolean" }, name: { type: "string" }, participants: { type: "array", items: { $ref: "#/components/schemas/User" } }, admin: { type: "string" } } },
        Message: { type: "object", properties: { _id: { type: "string" }, sender: { $ref: "#/components/schemas/User" }, room: { type: "string" }, message: { type: "string" }, fileUrl: { type: "string" }, fileType: { type: "string" }, status: { type: "string" }, audioDuration: { type: "number" }, reactions: { type: "array", items: { type: "object", properties: { user: { $ref: "#/components/schemas/User" }, emoji: { type: "string" } } } }, createdAt: { type: "string" } } }
      }
    }
  },
  apis: ["./routes/*.js"]
}

const swaggerSpec = swaggerJsdoc(options)

module.exports = swaggerSpec