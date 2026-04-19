const mongoose=require("mongoose")

const userSchema=new mongoose.Schema({
     name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    profilePhoto: {
        type: String,
        default: ""
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    status: {
        type: String,
        enum: ["online", "offline"],
        default: "offline"
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    bio: {
        type: String,
        default: "",
        maxlength: 200
    },
    coverPhoto: {
        type: String,
        default: ""
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    gallery: [{
        type: String
    }],
    age: {
        type: Number,
        default: null
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other", "Secret"],
        default: "Secret"
    },
    location: {
        type: String,
        default: ""
    },
    socialLinks: {
        instagram: { type: String, default: "" },
        twitter: { type: String, default: "" },
        github: { type: String, default: "" },
        linkedin: { type: String, default: "" }
    }
},{
    timestamps:true
})
module.exports=mongoose.model("User",userSchema)