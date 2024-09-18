import { Router } from "express";
import {
    loginUser,
    logoutUser,
    registerUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()
router.route("/register").post(
    upload.fields([  // two type of files we have to handle , avtar and coverimage
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }

    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secured route
router.route("/logout").post(verifyJWT, logoutUser) // verify jwt is a middleware(reference dena hai) contain next , which forward the code to next fxn

// create a endpoint to refresh token , all this is under secured route ..... as user is looged in
router.route("/refresh-token").post(refreshAccessToken)  // a endpoint to refresh the refresh token

router.route("/change-password").post(verifyJWT, changeCurrentPassword)

router.route("/current-user").get(verifyJWT, getCurrentUser)

router.route("/update-account").patch(verifyJWT, updateAccountDetails) // we have to use patch , if we use POST , all the details of user in databse is changed ... b ut we just have to change one or two details , so use patch ...

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar) // we have to verify if user loggedin first , then upload the avatar file first via multer in cloudinary , then call the main fxn updateUserAvatar

router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

// for getting user details , we fetch it from params , nd call it as username , so we have to put route as username only
router.route("/c/:username").get(verifyJWT, getUserChannelProfile) // we r using params , so anything writtem after colon(:) is considered as route

router.route("/history").get(verifyJWT, getWatchHistory)


export default router

// import all these thigs in app.js