class ApiResponse {
    constructor(statusCode , data , message = "Success"){
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success =  statusCode < 400 // if we sending some data from server to user , its status code is liw b/w a range , in our code , we take the limit as 400 , for more info refer "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status"
    }
}   

export { ApiResponse }