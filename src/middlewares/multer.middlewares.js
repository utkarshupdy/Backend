/*  "jate waqt merese milke jana"
                         "BY : MULTER" */
import multer from "multer" // read multer Readme.md "https://github.com/expressjs/multer" from github for better understandig

const storage = multer.diskStorage({
    destination: function(req , file , cb /*call back*/){
        cb(null , "./public/temp")
    },
    filename: function(req , file , cb){
        // const uniqueSuffix = Date.now()+'-'+Math.round(Math.random()*1E9)
        // cb(null, file.fieldname + '-' + uniqueSuffix)
        cb(null, file.originalname)//although its not good practise becoz if there r 5 files exist with original name , they r override , to these files r in server for very small time , we neglect it
    }
})
export const upload = multer({
    storage: storage
})


