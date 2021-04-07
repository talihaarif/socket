const { sendWebhookError } = require("../utils/webhook");

const error = (conn, io) => {
    /*
    Connection with database for listening to changes
    */
    const error = conn
        .collection("error_logs")
        .watch({ fullDocument: "updateLookup" });

    console.log("Error change stream running");

     /*
    When any changes occurs in error_logs table then this change event function runs and return 
    an object which contain an object containing all the details of the document that is created,
    updated or deleted.
    1) If new document is created then change operation type is insert.
        a) if subject of error is message then messageError emit is send to the user_id who performed this request.
        b) if subject of error is channel then channelError emit is send to the user_id who performed this request.
        c) if subject of error is team then teamError emit is send to the user_id who performed this request.
        d) if subject of error is company then companyError emit is send to the user_id who performed this request.
        e) if subject of error is user then userError emit is send to the user_id who performed this request.
    */
   error.on("change", async (change) => {
       try{
        let errorTemp = change.fullDocument;
        switch (change.operationType) {
            case "insert":
                if(errorTemp.subject=='message')
                    io.to(errorTemp.user_id).emit("messageError",errorTemp);
                else if(errorTemp.subject=='channel')
                    io.to(errorTemp.user_id).emit("channelError",errorTemp);
                else if(errorTemp.subject=='team')
                    io.to(errorTemp.user_id).emit("teamError",errorTemp);
                else if(errorTemp.subject=='company')
                    io.to(errorTemp.user_id).emit("companyError",errorTemp);
                else if(errorTemp.subject=='user')
                    io.to(errorTemp.user_id).emit("userError",errorTemp);
                break;
        }
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
    });
};

module.exports = error;