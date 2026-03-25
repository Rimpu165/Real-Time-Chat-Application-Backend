const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            folder: "cloudinary",
            resource_type: "auto",
            public_id: `${req.user ? req.user.id : "user"}-${Date.now()}`
        };
    }
});

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

module.exports = upload;
