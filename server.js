require("dotenv").config()
const express = require("express")
const cors = require("cors")
const connectDB=require("./config/db")
const swaggerUi=require("swagger-ui-express")
const swaggerSpec=require("./docs/swagger")
const authRoutes=require("./routes/authRoutes")
const userRoutes = require("./routes/userRoutes")
const roomRoutes = require("./routes/roomRoutes")
const friendRoutes = require("./routes/friendRoutes")
const adminRoutes = require("./routes/adminRoutes")
const path = require("path")
const { app, server } = require("./socket/socket")
const messageRoutes = require("./routes/messageRoutes")

app.use(express.json())
app.use(cors())

app.use("/uploads", express.static(path.join(__dirname, "uploads")))

connectDB()

app.use("/api/auth",authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/rooms", roomRoutes)
app.use("/api/friends", friendRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/admin", adminRoutes)

app.use("/api-docs",swaggerUi.serve,swaggerUi.setup(swaggerSpec))

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`server is running on Port ${PORT}`)
})

