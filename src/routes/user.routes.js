import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router()
router.route("/register").post(registerUser)


export default router

// import all these thigs in app.js