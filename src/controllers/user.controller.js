import { asyncHandler } from "../utils/async-Handler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"  // to check if user exist or not
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefeshToken()
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false }) // as save is mongodb fxn , it kickin password also before saving this in database , so we have to make false the validatebeforesave method 


        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresha nd access tokens")

    }

}



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

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
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
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(  // ITS good approch to give status code like res.status () instaed of giving it as apiresponse ..... althrough thats not wrong but also notba good practise
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )


})

const loginUser = asyncHandler(async (req, res) => {
    // req body se data le aao
    // username or email
    //find the user
    //password check
    //access and refresh token
    // send cookie

    const { email, username, password } = req.body

    if (!(username || email)) {
        throw new ApiError(400, "username or email is required")
    }

    // User.findOne({email}) // if want to login via email only
    // User.findOne({username}) // if want to login via username only
    const user = await User.findOne({           // this findOne , updateOne is the mongodb mongoose provided method for User Database
        $or: [{ username }, { email }]             // this $or is given by mongoDB syntax
    })                                           // if want to login via username/ email only so find username or email

    if (!user) {
        throw new ApiError(404, "User doesn't exist")
    }

    // check for password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(404, "Invalid User Crediantials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")


    const options = {     // after performing httpOnly nd secure true , cokkies can only be modified from server only ... not from frontend side
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken  // this is code to handle the case when user want to save accesstoken , refreshtoken mannually in local Storage ,ALTHOUGHT ITS NOT COMPULSORY
                },
                "user loggedIn successfully"
            )
        )




})

const logoutUser = asyncHandler(async (req, res) => {
    // in login we have data which is given by user , but but in case of logout , there is no data provided by user
    // for this we have to design self middleware , search in middleware folder
    //now we have access of user with req.user as a manually created middleware
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {        //this is mongodb operater which is used to particular value of particular key of user 
                refreshToken: undefined
            }

        },
        {
            new: true // this return new value updated in database
        }

    )

    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))

})

// now we have to create a endpoint  controller to refresh user token whenever its access token expires ........

const refreshAccessToken = asyncHandler(async (req, res) => {
    // now first of all to refresh the user token , we have to send refresh token of user stored in db , whuch comes from cookies
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incommingRefreshToken) {
        throw new ApiError(401, "Unauthorized Request")
    }
    try {
        //see the token which is with user is in encrypted form , so to verify with token stored in db  , we have to first decode the user token , so that we get the id of user  , for which we have to use jwt .verify fxn which takes paramters like refresh token secret key (to authenticate ) nd encoded user toen nd send decoded user token
        const decodedToken = jwt.verify(incommingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        //while created refresh token , we have given user id to the generate refrsh token , so if we have decoded refresh token, we can get user id from that nd search for token stored by user in db via user id
        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }

        if (incommingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401 , error?.message || "Invalid Refresh Token")

    }

})

const changeCurrentPassword = asyncHandler(async(req , res)=>{
     const {oldPassword , newPassword , confPassword} = req.feild

     if(newPassword != confPassword){
        throw new ApiError(400 , "New Password and Confirm Password must be same")
     }
  
     //check for id or _id
    const user =  await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400 , "Invalid Old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave : false}) // validateBeforeSave is method which check all authentications before saving something in database

    return res
    .status(200)
    .json(new ApiResponse(200 , {} , "Password Changed Successfully"))
})

const getCurrentUser = asyncHandler(async(req , res)=>{
    return res
    .status(200)
    .json(200 , req.user , "Current user fetched successfully") // json response is like that {status code , data want to send , message}
})

const updateAccountDetails = asyncHandler(async(req , res)=>{
    //if we want to update files of user .... we have to put it in seperate endpoint , where he can on the spot update and save the files in the database
    const {fullName , email} = req.body
    if(!fullName || !email){
        throw new ApiError(400 , "All Feilds are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName : fullName,
                email : email,
            }
        },
        {new:true} // after using this , updated information is retured
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200 , user , "Account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async(req , res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400 , "Error while uploading Avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id ,
        {
            $set:{   // to modify 1 2 feilds of user , not all database
                avatar : avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Avatar updated successfully")
    )
})
const updateUserCoverImage = asyncHandler(async(req , res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400 , "Avatar file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400 , "Error while uploading Avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id ,
        {
            $set:{   // to modify 1 2 feilds of user , not all database
                coverImage : coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Cover Image updated successfully")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}