import { asyncHandler } from "../utils/async-Handler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js"  // to check if user exist or not
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

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
            $unset: {        //this is mongodb operater which is used to particular value of particular key of user 
                refreshToken: 1 // this remove the feild from document
            }         // in unset , basically pass a flag to which variable , u want to unset , simple ...

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
    .json(
        new ApiResponse(200 , req.user , "Current user fetched successfully")

    ) // json response is like that {status code , data want to send , message}
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
//TODO: AFTER UPDATING THE NEW AVATAR , DELETE THE OLD AVATAR IMAGE FROM CLOUDINARY ,, TAKE CLOUDNIARY URL , CREATE A UTILITY FXN TO DELETE THE AVATAR FROM CLOUDINARY
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
//MONGO DB AGGREGATION PIPELINE
const getUserChannelProfile = asyncHandler(async(req , res)=>{
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400 , "Username is missing")
    }

    // User.find({username}) // {} = where clause // this is ok that u find a user from username in database , then by user's id , u put some aggregation pipeline ... its ok .. but there is as such no need of it ... there is match feild in mongodevi aggregation pipelile , which do a work of finding the user from database then perform action on it ... so we can directly do that...

    // User.aggregate([ ]) // aggregate is a method , which takes a array , in which {} , {} , {} are pipelines nd it gives an arrays
    const channel = await User.aggregate([
        {
            $match:{                              // now u have one document or one user , now u have to find subscriber of that user
                username : username?.toLowerCase()
            }
        },
        {  // lookup for finding subscribers of that channel
            $lookup:{
                from: "subscriptions", // actually its Subscription , but in mongo db , every model name is converted to lower case nd in pural so ....
                localField: "_id",
                foreignField:"channel",  // for getting subscribers ... select channels from subscription model document nd count no. of users in it
                as: "subscribers"
            }
        },
        {  // lookup for finding channels that the particular user subscribed
            $lookup:{
                from: "subscriptions", // actually its Subscription , but in mongo db , every model name is converted to lower case nd in pural so ....
                localField: "_id",
                foreignField:"subscriber",  // for getting subscribed channels by particular user ... select subscribers from subscription model document nd count no. of channels in it
                as: "subscribedTo"

            }
        },
        {   // we need one more pipelines "addto" which retains the normal given feilds , but also add some more feilds to it 
            $addFields:{
                subscribersCount: {
                    // we want to calculate/count all documents , we have a fxn called "size"
                    $size : "$subscribers"  // from where u have to calculate / count the size of document , also user $ as now its become a feild

                },
                channelsSubscribedToCount :{
                    $size : "$subscribedTo"
                },
                isSubscribed :{  // to calculate wheather user subscribed the channel or not , we need a fxn called "cond" or condition which takes 3 parameter {if , then , else}
                    $cond :{
                        if:{$in : [req.user?._id , "$subscribers.subscriber" /* as subscribers is a feild , we can goes into the feild nd search for particular subscriber */]} , // we just have to check , if that partucular user is in the "subscribers " documents comes from subscribtion model , for whch we can use "in" fxn which calculate / check in array and object both
                        then: true, // is subscribed == true
                        else : false // is subscribed == false

                    }
                }
            }
        },
        {   // niw we also have to use one more pipeline "project" which means , we dont have to give all the details of user to the frontend ... we have to give selected feilds of user .. for which we can use project 
            $project:{ // to use this , just put 1 in all those feilds , which u want to show case on frontend .. simple
                fullName : 1,
                username : 1,
                subscribersCount : 1,
                channelsSubscribedToCount : 1,
                isSubscribed : 1,
                avatar : 1,
                coverImage : 1,
                email : 1,
                 




            }
        }

    ])
    // this const channel gives a array of object , in our case , we only matched one user ... thats why only 1 object/ output aray is returned

    if(!channel?.length){
        throw new ApiError(404 , "Channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200 , channel[0] , "User Channel fetched successfully")
    )

})

const getWatchHistory = asyncHandler(async(req , res)=>{
    // req.user._id // after using this , we dont get mongo db id , we get a object id string "22j2njn v vjufnfnnff" of this type , to get mongodb id , we need to pass this whole object id , but we r using moongoose , which automatically convert this object id into mongodb id while using findbyid , find or such type of fxn
    // so req.user._id gives us a object string only , ehich converted into mongodb id via mongoose
    const user = await User.aggregate([
        {
            $match:{
                // _id :  req.user._id // this is wrong , in aggregation pipeline , mongoose doesnot work nd it goes directly , so we need to convert it into mongodb id
                _id : new mongoose.Types.ObjectId(req.user._id) // mwthod to convert string into mongodb object id
            }
        },
        {// lookup for getting watch history from user 
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField:"_id",
                as: "watchHistory",
                pipeline:[   // this is method for using nested pipeline through u can go deep down into the tables ... ex : for getting watch history of user , we are inside user from where we go to videos from where we goes to owner (which again a user)
                    {
                        $lookup:{ // this subpipeline populate only limited info of owner to the watchHistory document
                            from: "users",
                            localField : "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[ // we dont have to give all info of owner to the video section , we only have to give limited info of owner user , so use project pipeline inside it
                                    {
                                        $project:{
                                            fullName : 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }

                            ]
                        }

                    },
                    {  // there is as such no need of this , we r just destructuring the format ... as after this lookup , we get a owner array .. whose 0th index gives all details of owner like full name , username , etc...
                        $addFields:{
                            owner : {
                                $first : "$owner"  // by doing this , in frontend , we get a object owner , from which after performing dot , he get all owner data
                                // also $first denites the zero th index or 1st elleemt of owner array , nd we r using owner as addfeild to override entrier owner array givrs from lookup to simple single object
                            }
                        }

                    }
                    
                ]
            }
        }



    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200 , 
            user[0].watchHistory ,
            "Watch History fetched successfully"
        )
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
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
}