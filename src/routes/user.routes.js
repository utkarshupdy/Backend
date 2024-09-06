import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";

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


export default router

// import all these thigs in app.js