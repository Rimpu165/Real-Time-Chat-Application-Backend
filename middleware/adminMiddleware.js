const adminMiddleware = (req, res, next) => {
    // Requires authMiddleware to be run first, so req.user exists
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }
}

module.exports = adminMiddleware;
