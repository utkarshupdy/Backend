// require('dotenv').config({path: './env'}) // Although its work perfect BUT BUT this breaks the consistency of code , as in our project we used module.js (import statements)
import dotenv from 'dotenv'
dotenv.config({         // as this feature is experimental , to use this , we have to add some code in package.json at scripts-->dev line
    path: './env'
})


// import mongoose from 'mongoose'
// import { DB_NAME } from './constants';
import connectDB from './db/index.js';

connectDB()




/* THIS IS APPROCH ONE TO CONNECT MONGOOSE WITH DATABASE
import express from 'express'

const app = express()

// function connectDB(){}   one method to connect any database from mongoose
// connectDB()

// another javascript approch is to ussing iffies (immidietly exicute the function)
// (()=>{})() , before using iffies , put semicolon before it , to avoid any error

// AS ALWAYS ASSUME DATABASE IS STORED IN DIFFERENT CONTINENT , ITS ALWAYS TAKE TIME TO GET RESPONSE FROM DB , its always suggested to use ASYNC AWAIT whenever u talk with  DB
    ;(async ()=>{
        try {
            await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)    // db connected
            // assume case when db is connected , but tgere is error in app due to which it doesnit talk with db , foe this there is listeners in express
            app.on("error" , (error)=>{   // LISTERNERS 
                console.log("ERROR: " , error)
                throw error
            })
            app.listen(process.env.PORT , ()=>{
                console.log(`App is listening on port ${process.env.PORT}`)
            })

            
        } catch (error) {
            console.log("ERROR" , error)
            throw error
            
        }
    })()


    */