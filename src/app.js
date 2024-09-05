import express from 'express'
import cookieParser from 'cookie-parser'  // use to access/set cookies of user browser i.e. perform CRUD operation in user cookies from server
import cors from 'cors'           // if any problem in cors , refer cors video (how to connect backend with frontend) or refer fullstack folder in downloads



const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN   ,                    // in env file , if we put CORS_ORIGIN = *  it menas any one have access to the backend , to prevent this , specify to which website , url host u allow to take access
    credentials: true,   // if u want to learn more abt this ,press cntrl nd  click on credentials || or refer docs of cors from npmjs
}))   // this method used in all middlewares/configuration

app.use(express.json({
    limit:"20kb"   // before few years body-parser package is use to take json files in express , now its inbuilt fxn
}))
//  now what is data is come from url ?  use package urlencoded
app.use(express.urlencoded({/*inside we have to gives options , althrough this is not complusory to gives , but its better practise*/ 
    extended: true,   // this menas we have allowed to use objects inside objects
    limit:"16kb"
}))
app.use(express.static("public")) // if we want to store something in over server like assest , images , we can staore it in folder named "public" in my code using this package static of express
app.use(cookieParser())


 //***********************************ROUTES***********************************
 import userRouter from './routes/user.routes.js' // as user.routers.js export default a fxn , its doesn't matter what name u gove to that fxn here

 // routes decleration
 // to apply routes , use middleware here
//  app.use("/users" , userRouter /* which router i want to activate at /user , whenever i type /user , middleware gives control to userrouter */)
 app.use("/api/v1/users" , userRouter)
 // http://localhost:8000/api/v1/users/register    "THIS IS HOW URL IS MADE" now no changes in app.js , if we want login , go to userrouter nd add login route


export {app} // this is also a way to export