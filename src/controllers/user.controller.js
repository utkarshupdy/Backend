import { asyncHandler } from "../utils/async-Handler.js"
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js"  // to check if user exist or not
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";






// error, request, response, next
const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontent
    //validation (check from email is correct , name is correct , not empty , etc...)
    //check if user already exist : USERNAME AND EMAIL
    // check for images , check for avatar
    // upload them to cloudneiry , avatar
    //create user object - create entry in db
    //remove password nd refresh token feild from response
    // check for user creation
    // return response


    // if data come from form or json data , we can accesss it from (req.body) , if data come from url , we see it further
    const { fullName, email, username, password } = req.body
    console.log("email : ", email);

    // if(fullName === ""){
    //     throw new ApiError(400 , "full name is required")
    // }  // now one method is to use if else if else for every parameter 

    // another method is ...
    if (
        [fullName, email, username, password].some((feild) => feild?.trim() === "") // trim method remove whitespaces from left nd right end of string
    ) {
        throw new ApiError(400, "all feild are compulsory")
    }

    // User.findOne({email}) // this is correct but one more method 
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]   // checks if any of the element i.e. username or email matches , it throws error
    })
    if (existedUser) {
        throw new ApiError(409, "user with email nd username already exist")
    }

    // console.log(req.files)

    // multer gives access to files same as express give accress to body
    const avatarLocalPath = req.files?.avatar[0]?.path   // console log once to check if everything works fine
    // const coverImageLocalPath = req.files?.coverImage[0].path;

    let coverImageLocalPath ;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) throw new ApiError(400, "Avatar file is required")

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    if (!avatar) throw new ApiError(400, "Avatar file is required")

        // PUT ENTRY IN DB via user
    const user = await User.create({       // as database is in another continenet also it might possible we gbet an error , but it takes time , so use await here
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // const createdUser = await User.findById(user._id) // now chain it accordingly to selelct paramater u don't need in created user 
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" // give space and add all those parameter u dont need by adding - sign before parameter start

    )
    if(!createdUser){
        throw new ApiError(500 , "Something went wrong while registering the user")
    }

    return res.status(201).json(  // ITS good approch to give status code like res.status () instaed of giving it as apiresponse ..... althrough thats not wrong but also notba good practise
        new ApiResponse(200 , createdUser , "User Registered Successfully")
    )










})
export {
    registerUser,
}