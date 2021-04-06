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
    ---Listening to company Table---
    Case update:
    one case is handel in update operation 
    of company table.
    1) If company name is changed then the emit is send
    to the company_id.
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