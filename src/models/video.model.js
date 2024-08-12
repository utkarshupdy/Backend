import mongoose , {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"; // for performing aggregation in mongodb
// mongoose aggregation pipeline





const videoSchema = new Schema({
    videoFile:{
        type:String, // extarct from cloudinary url
        required:true,
    },
    thumbnail:{
        type:String,
        required: true,
    },
    title:{
        type:String,
        required: true,
    },
    description:{
        type:String,
        required: true,
    },
    duration:{
        type:Number,
        required: true,
    },
    views:{
        type:Number,
        default: 0,
    },
    isPublished:{
        type:Boolean,
        default: true,
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User",
    },
}, {timestamps: true})

videoSchema.plugin(mongooseAggregatePaginate) // these r called plugins which do some kind of activity just before data saving in database

export const Video = mongoose.model("Video" , videoSchema)