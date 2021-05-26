const { addToken, removeToken } = require("../utils/token");
const { sendWebhookError } = require("../utils/webhook");

const token = (conn, io) => {
    /*
    Connection with database for listening to changes
    */
    const token = conn
        .collection("tokens")
        .watch({ fullDocument: "updateLookup" });
    console.log("token change stream running");

    /*
    ---Listening to Tokens table---
    When any changes occurs in tokens table then this change event function runs and return 
    an object which contain an object containing all the details of the document that is created,
    updated or deleted.

    Case: Insert:
    
    Call the addToken function in case of insert.

    Case: Delete:
    
    Call the removeToken function in case of delete.
    */
    token.on("change", (change) => {
        try{
        switch (change.operationType) {
            case "insert":
                addToken(change.fullDocument);
                break;
            case "delete":
                removeToken(change.documentKey._id);
                break;
        }
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "token change stream", change);
    }
    });
};

module.exports = token;