import { asyncHandler } from "../utils/async-Handler.js"
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js"  // to check if user exist or not
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

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
        httpOnly:true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" , options)
    .json(new ApiResponse(200 , {} , "User logged out successfully"))

})

export {
    registerUser,
    loginUser,
    logoutUser
}