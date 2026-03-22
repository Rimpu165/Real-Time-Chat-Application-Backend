const multer = require("multer")
const path = require("path")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/")
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        cb(null, `${req.user.id}-${Date.now()}${ext}`)
    }
})

const fileFilter = (req, file, cb) => {
    // Allow images, videos, audio, and common documents (pdf, doc, zip)
    const allowedTypes = [
        "image/", 
        "video/", 
        "audio/", 
        "application/pdf", 
        "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/x-zip-compressed"
    ];

    if (allowedTypes.some(type => file.mimetype.startsWith(type) || file.mimetype === type)) {
        cb(null, true)
    } else {
        cb(new Error("File type not supported"), false)
    }
}

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
})

module.exports = upload
