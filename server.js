const express = require("express")
const connectDB=require("./config/db")
const swaggerUi=require("swagger-ui-express")
const swaggerSpec=require("./docs/swagger")
const authRoutes=require("./routes/authRoutes")
const userRoutes = require("./routes/userRoutes")
const path = require("path")
require("dotenv").config()


const app = express()
app.use(express.json())

app.use("/uploads", express.static(path.join(__dirname, "uploads")))

connectDB()

app.use("/api/auth",authRoutes)
app.use("/api/users", userRoutes)

app.use("/api-docs",swaggerUi.serve,swaggerUi.setup(swaggerSpec))

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`server is running on Port ${PORT}`)
})

