import mongoose , { Schema}from 'mongoose'
// brypt simply help in hash ur password , so that its not leak when db made public
import jwt from "jsonwebtoken"; // basically whoever give them a token , it allows to take access of all data
import bcrypt from "bcrypt"

const userSchema = new Schema({
    username:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,  // if we want enable searching field in anythong , put its index as true
    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName:{
        type: String,
        required: true,
        trim: true,
        index: true,  // if we want enable searching field in anythong , put its index as true
    },
    avatar:{
        type: String, // cloudinary service stores files and store its url in this
        required: true,
    },
    coverimage:{
        type: String,
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password:{
        type:String,
        required:[true, 'Password is required']
    },
    refreshToken:{
        type:String,
    },

} , {timestamps:true})

userSchema.pre("save" , async function (next) { // pre is a kind of hook provided by mongoose
    // if(!this.isModified("password"))return next();
    // one more method
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password , 10 /*rounds in int 8 , 10 ...etc */)
        next()
    }
    
} ) // in this call back is require in pre hook but dont use ()=>{} becoz in this type , this function is not working , as no context is knowm
// these r called plugins which do some kind of activity just before data saving in database

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password/*user gives password */ , this.password/*encrypted password stored in db */)
}
userSchema.methods.generateAccessToken = function(){ // method to generate tokens 
    jwt.sign(
        {
            _id: this._id,
            email : this.email,
            username : this.username,
            fullName: this.fullName,

        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }

    )
} // both r jwt tokens
userSchema.methods.generateRefeshToken = function(){ // inrefresh token , there is less info , becouse it refresh frequently
    jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }

    )
}
export const User = mongoose.model("User" , userSchema)