const asyncHandler = (requestHandler)=>{
    return(req , res , next)=>{
        Promise.resolve(requestHandler(req , res , next)).catch((err)=>next(err))
    }
} // this is another method by using promises ............



export {asyncHandler}
// another method .................... via try catch
// const asyncHandler = ()=>{}
// const asyncHandler = (func)=>{()=>{}}
// const asyncHandler = (func)=> async ()=>{}


// const asyncHandler = (fn)=>async(req , res , next/*next for any middleware*/)=>{  // this is try catch method , thgere is one more metod describe above for this
//     try {
//         await fn(req , res , next)
        
//     } catch (error) {
//         res.status(err.code || 500).json({  // akind of json response
//             success: false,
//             message: err.message,
//         })
        
//     }


// } // its a higher order fxn ( fxn which accecpt fxn as an parameter or its also return fxn)
