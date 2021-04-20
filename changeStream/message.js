const { default: axios } = require("axios");
const { saveMessageEmits } = require("../utils/emitQueue");
const config = require("config");
const { checkIds, addIds } = require("../utils/channelCache");
const { sendWebhookError } = require("../utils/webhook");
const message = (conn, io) => {
    /*
    Connection with database for listening to changes
    */

    const message = conn
        .collection("messages")
        .watch({ fullDocument: "updateLookup" });

    console.log("message change stream running");
    const configuration = {
        headers: {
            "Content-Type": "application/json",
            "token": "MyNodeToken"
        },
    };
    const url = config.get("url");

    /*
    ---Listening to message Table---

    Case Insert:
    There cases are handel in insert operation 
    of message table.
    1) If is_delayed is set then we don't emit any event
    2) If receiver_id is null then the emit is send
    to the company_id+team_id+channel_id room.
    3) If channel_id is null then the emit is send
    to the company_id+team_id+user_id room.

    Case update:
    two cases are handel in update operation 
    of message table.
    1) If receiver_id is null then the emit is send
    to the company_id+team_id+channel_id room.
    2) If channel_id is null then the emit is send
    to the company_id+team_id+user_id room.

    */

    message.on("change", async(change) => {
        let messageTemp = change.fullDocument;
        let channel_id = messageTemp.channel_id;
        let result;
        try {
            let ids = checkIds(channel_id);
            if (ids == false) {
                let body = JSON.stringify({ channel_id });
                result = await axios.post(url + "api/teamAndCompanyId", body, configuration);
                ids = result.data;
                addIds({ channel_id: channel_id, team_id: ids.team_id, company_id: ids.company_id, type: ids.type });
            }
            switch (change.operationType) {
                case "insert":
                    if (messageTemp.replying_id) {
                        let message_id = messageTemp.replying_id;
                        let body = JSON.stringify({ message_id });
                        result = await axios.post(url + "api/getMessage", body, configuration);
                        messageTemp.parent = result.data.message;
                    }
                    if (messageTemp.is_forwarded) {
                        let id = messageTemp.channel_id;
                        delete messageTemp.channel_id;
                        io.to(id).emit("forwardMessage", { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp });
                        saveMessageEmits({ message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp, emit_to: id, emit_name: "forwardMessage" });
                    } else if (messageTemp.send_after) {
                        console.log("in send_after")
                        let send_after_emit_name = messageTemp.replying_id ? "newReplyMessage" : "newMessage";
                        let id = messageTemp.channel_id;
                        delete messageTemp.channel_id;
                        console.log("sending emit to id",messageTemp.sender_id)
                        io.to(messageTemp.sender_id).emit(send_after_emit_name, { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp });
                        messageTemp.replying_id ? "" : saveMessageEmits({ message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp, emit_to: messageTemp.sender_id, emit_name: send_after_emit_name });
                    } else if (messageTemp.reminded_to) {
                        let id = messageTemp.channel_id;
                        delete messageTemp.channel_id;
                        io.to(messageTemp.reminded_to).emit("newMessage", { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp });
                        saveMessageEmits({ message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp, emit_to: messageTemp.reminded_to, emit_name: "reminded_to" });
                    } else if (messageTemp.replying_id) {
                        let id = messageTemp.channel_id;
                        delete messageTemp.channel_id;
                        io.to(id).emit("newReplyMessage", { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp });
                    } else {
                        let id = messageTemp.channel_id;
                        delete messageTemp.channel_id;
                        io.to(id).emit("newMessage", { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp });
                        saveMessageEmits({ message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp, emit_to: id, emit_name: "newMessage" });
                    }
                    break;
                case "update":
                    let messageUpdateCheck = change.updateDescription.updatedFields;
                    let send_after_emit_name = messageTemp.replying_id ? "replySendAfterMessage" : "sendAfterMessage";
                    let update_message_emit_name = messageTemp.replying_id ? "replyUpdateMessage" : "updateMessage";
                    if (messageTemp.replying_id) {
                        let message_id = messageTemp.replying_id;
                        let body = JSON.stringify({ message_id });
                        result = await axios.post(url + "api/getMessage", body, configuration);
                        messageTemp.parent = result.data.message;
                    }
                    if (messageUpdateCheck.send_after === null) {
                        io.to(messageTemp.channel_id).emit(send_after_emit_name, { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp });
                        messageTemp.replying_id ? "" : saveMessageEmits({ message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp, emit_to: messageTemp.channel_id, emit_name: send_after_emit_name });
                    } else if (messageUpdateCheck.deleted_at) {
                        messageTemp.message = messageTemp.attachments = messageTemp.audio_video_file = null;
                        io.to(messageTemp.channel_id).emit(update_message_emit_name, { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp });
                        messageTemp.replying_id ? "" : saveMessageEmits({ message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp, emit_to: messageTemp.channel_id, emit_name: update_message_emit_name });
                    } else if (messageUpdateCheck.is_read) {
                        break;
                    }
                    else if (messageUpdateCheck.child_read){
                        break;
                    }
                     else {
                        io.to(messageTemp.channel_id).emit(update_message_emit_name, { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp });
                        messageTemp.replying_id ? "" : saveMessageEmits({ message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp, emit_to: messageTemp.channel_id, emit_name: update_message_emit_name });
                    }
                    break;
            }
        } catch (err) {
            console.log(err.response);
            sendWebhookError(err);
        }
    });
};

module.exports = message;