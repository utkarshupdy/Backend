class ApiError extends Error{  // this apierror (error) class is provided by node.js but as we know request / response is given by express not by node js , so req res error vcant handle by node.js , w ehave to make seperate classes for handling req , res 
    constructor(
        statusCode,
        message="Something went wrong",
        errors = [],
        stack = ""
         
    ){ // these all below statements r overriding 
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false;
        this.errors = errors

        if(stack){
            this.stack = stack
        } else{
            Error.captureStackTrace(this , this.constructor)
        }



    }

}
export {ApiError}