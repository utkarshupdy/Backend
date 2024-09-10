import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()
router.route("/register").post(
    upload.fields([  // two type of files we have to handle , avtar and coverimage
        {
            name:"avatar",
            maxCount: 1
        },
        {
            name:"coverImage",
            maxCount: 1
        }

    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secured route
router.route("/logout").post( verifyJWT , logoutUser) // verify jwt is a middleware(reference dena hai) contain next , which forward the code to next fxn


export default router

// import all these thigs in app.js