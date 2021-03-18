const { saveReminderEmits } = require("../utils/emitQueue");

const reminder = (conn, io) => {
    /*
    Connection with database for listening to changes
    */
   
    const reminder = conn
        .collection("reminders")
        .watch({ fullDocument: "updateLookup" });

    console.log("reminders change stream running");

    reminder.on("change",async (change) => {
        let reminderTemp = change.fullDocument;
        switch (change.operationType) {
            case "insert":
                io.to(reminderTemp.user_id).emit("newReminder", {reminder:reminderTemp});
                saveReminderEmits({reminder:reminderTemp,emit_to:reminderTemp.user_id,emit_name:"newReminder"});
                break;
            case "delete":
                io.to(reminderTemp.user_id).emit("deleteReminder", {reminder:reminderTemp});
                saveReminderEmits({reminder:reminderTemp,emit_to:reminderTemp.user_id,emit_name:"deleteReminder"});
                break;
        }
    });

};

module.exports = reminder;