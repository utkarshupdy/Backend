import {asyncHandler} from "../utils/async-Handler.js"
// error, request, response, next
const registerUser = asyncHandler(async(req , res)=>{
     res.status(200).json({
        message:"chai aur backend "
    })


})   
export {
    registerUser,
}