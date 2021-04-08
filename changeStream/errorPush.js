const pushError = (conn, io) => {
    /*
    Connection with database for listening to changes
    */
    const pushError = conn
        .collection("push_errors")
        .watch({ fullDocument: "updateLookup" });

    console.log("Push errors change stream running");

    /*
    ---Listening to company Table---
    Case update:
    one case is handel in update operation 
    of company table.
    1) If company name is changed then the emit is send
    to the company_id.
    */
   pushError.on("change", async (change) => {
        try{
        let pushErrorTemp = change.fullDocument;
        switch (change.operationType) {
            case "insert":
                io.to(pushErrorTemp.user_id).emit('tokenRefresh',pushErrorTemp)
                break;
        }
    } catch (error) {
        sendWebhookError(error);
    }
    });
};

module.exports = pushError;