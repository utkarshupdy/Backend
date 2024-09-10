import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/async-Handler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
// import cookieParser from "cookie-parser";


// middleware have 4 types request , response , cb , next (function of next is to surpass the code further after performing middleware task)
export const verifyJWT = asyncHandler(async(req , res ,next)=>{ // here res has no use , so replace it by underscore "_"
    // we get access of token because we have given access of cookies to request and response .. using app.use(cookieParser)

  try {
      /*****************************************************************************************************MIGHT HAVE ERROR IN COOKIE OR COOKIES */
     const token =   req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","") // as ion postman , there is bearer access token , but we want only access token so rplace another thing with epty string
      // we can send tokens via postmen also  header--> type "Authorization" in  key and "Bearer - access token name" in value .... bearer is important keyword refer by jwt 
      if(!token){
          throw new ApiError(401 , "Unauthorized request")
      }
  
      const decodedToken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
  
      const user = await User.findById(decodedToken?._id).select( "-password -refreshToken")
  
      if(!user){
          throw new ApiError(401 , "Invalid Access Token")
      }
  
      req.user = user;
      next() // pass the code for further process
  } catch (error) {
    throw new ApiError(401 , error?.message || "Invalid Access Token")
    
  }


})