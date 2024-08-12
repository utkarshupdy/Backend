// CODE TO UPLOAD ANY FILES IN CLOUDINARY.................

import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs' // fs = file system

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY , 
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null;
        //upload file on cloudinary
        const response =  await cloudinary.uploader.upload(localFilePath , {
            resource_type: "auto" // options provided by cloudinary while uploading files
        })
        // file has been uploaded
        console.log("file is uploaded on cloudinary successfully" , response.url)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath) // doesn't move further without removing localally saved temporaray files as the upload operation failed
        return null;

        
    }
}

export {uploadOnCloudinary}
