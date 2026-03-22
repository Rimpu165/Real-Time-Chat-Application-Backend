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
    status:{
        type:String,
        default:"offline"
    },
    profilePhoto: {
        type: String,
        default: ""
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }
},{
    timestamps:true
})
module.exports=mongoose.model("User",userSchema)