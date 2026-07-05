const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error("FATAL ERROR: MONGO_URI environment variable is not defined!");
      process.exit(1);
    }
    
    const safeUri = uri.startsWith("mongodb") 
      ? `${uri.split("@")[1] || uri}` 
      : "INVALID_URI_SCHEME";
      
    console.log(`Connecting to MongoDB Atlas (Host: ${safeUri.split("?")[0]})...`);
    
    await mongoose.connect(uri);
    console.log("Mongoose connected successfully!");
  } catch (error) {
    console.error("Database connection failure:", error.message || error);
    process.exit(1);
  }
};

module.exports = connectDB;
