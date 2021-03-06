const { sendWebhookError } = require("../utils/webhook");
const { createHash } = require("../utils/hash");

const reminder = (conn, io) => {
    /*
    Connection with database for listening to changes
    */
   
    const reminder = conn
        .collection("reminders")
        .watch({ fullDocument: "updateLookup" });

    console.log("reminders change stream running");

     /*
    When any changes occurs in reminders table then this change event function runs and return 
    an object which contain an object containing all the details of the document that is created,
    updated or deleted.
    1) If new document is created then change operation type is insert.
        a) In insert newReminder emit is send to the user who reminded the message.
    2) If any document is deleted then change operation type is delete.
        a) In insert deleteReminder emit is send to the user who reminded the message.
    After any emit is send then saveReminderEmits function is called to store the event for one minute.
    */
    reminder.on("change",async (change) => {
        try{
        let reminderTemp = change.fullDocument;
        let hash = createHash(reminderTemp.created_at,change);
        switch (change.operationType) {
            case "insert":
                io.to(reminderTemp.user_id).emit("newReminder", {reminder:reminderTemp,hash:hash});
                break;
            case "delete":
                io.to(reminderTemp.user_id).emit("deleteReminder", {reminder:reminderTemp,hash:hash});
                break;
        }
    } catch (error) {
        sendWebhookError(error, "reminder change stream", change);
    }
    });
};

module.exports = reminder;