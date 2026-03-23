require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");

const makeAdmin = async () => {
    try {
        await connectDB();
        
        const email = process.argv[2];
        if (!email) {
            console.log("Please provide an email. Usage: node make-admin.js <email>");
            process.exit(1);
        }

        const user = await User.findOneAndUpdate(
            { email },
            { role: "admin" },
            { returnDocument: "after" }
        );

        if (!user) {
            console.log(`User with email ${email} not found.`);
        } else {
            console.log(`Success! User ${user.name} (${user.email}) is now an Admin.`);
        }

        process.exit(0);
    } catch (error) {
        console.error("Error making admin:", error.message);
        process.exit(1);
    }
};

makeAdmin();
