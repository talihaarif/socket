const { default: axios } = require("axios");
const config = require("config");
const { checkIds, addIds } = require("../utils/channelCache");
const { sendWebhookError } = require("../utils/webhook");
const { createHash } = require("../utils/hash");

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


    const queryMessageInsert=(messageTemp,ids,hash)=>{
        let id = messageTemp.channel_id;
        delete messageTemp.channel_id;
        if(messageTemp.replying_id){
            console.log("new query reply");
            io.to(id).emit("newReplyMessage", { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp,hash:hash });
            io.to(messageTemp.parent.sender_id).emit("newReplyMessage", { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp,hash:hash });
        }
        else if (messageTemp.is_forwarded) {
            io.to(id).emit("forwardMessage", { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp,hash:hash });
            io.to(messageTemp.sender_id).emit("forwardMessage", { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp,hash:hash });
        } 
        else{
            console.log("new query message");
            io.to(id).emit("newMessage", { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp,hash:hash });
            io.to(messageTemp.sender_id).emit("newMessage", { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp,hash:hash });
        }
        
    }

    const queryMessageUpdate=(messageTemp,messageUpdateCheck,ids,update_message_emit_name,hash)=>{
        
        if (messageUpdateCheck.deleted_at) {
            messageTemp.message = messageTemp.attachments = messageTemp.audio_video_file = null;
            io.to(messageTemp.channel_id).emit(update_message_emit_name, { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp,hash:hash});
            if(update_message_emit_name == "replyUpdateMessage"){
                io.to(messageTemp.parent.sender_id).emit(update_message_emit_name, { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp,hash:hash});
            }else
                io.to(messageTemp.sender_id).emit(update_message_emit_name, { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp,hash:hash});
        } 
        else if (messageUpdateCheck.is_read || messageUpdateCheck.child_read || messageUpdateCheck.pinned_by || (messageUpdateCheck.updated_at && Object.keys(messageUpdateCheck).length == 1)) {
            return 0;
        }
         else {
            io.to(messageTemp.channel_id).emit(update_message_emit_name, { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp,hash:hash });
            if(update_message_emit_name == "replyUpdateMessage"){
                io.to(messageTemp.parent.sender_id).emit(update_message_emit_name, { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp,hash:hash });
            }else
                io.to(messageTemp.sender_id).emit(update_message_emit_name, { type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp,hash:hash });
        }
    }

    /*
    ---Listening to message Table---
    When any changes occurs in messages table then this change event function runs and return 
    an object which contain an object containing all the details of the document that is created,
    updated or deleted.
    Case Insert:
    The cases handled in insert operation of messages table are:

    1) If is_forwarded field of message is set then forwardMessage emit is send to channel room.
    2) If send_after field of message is set then newMessage emit is send to sender only.
    3) If reminded_to field of message is set then newMessage emit is send to the user who reminded the message.
    4) Otherwise newMessage emit is send to channel room.

    Case update:
    The cases handled in update operation of messages table are:

    1) If send_after field of message is null then sendAfterMessage emit is send to the channel room.
    2) If deleted_at field of message is set then updateMessage emit is send to channel room.
    3) If is_read field of message is set then no emit is send.
    4) Otherwise updateMessage emit is send to channel room.

    After any emit is send then saveMessageEmits function is called to store the event for one minute.
    */

    message.on("change", async(change) => {
        let messageTemp = change.fullDocument;
        let channel_id = messageTemp.channel_id;
        let hash = createHash(messageTemp.created_at,change);
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
                    if(ids.type == 'query'){
                        queryMessageInsert(messageTemp,ids,hash);
                    }
                    else if (messageTemp.is_forwarded) {
                        let id = messageTemp.channel_id;
                        delete messageTemp.channel_id;
                        io.to(id).emit("forwardMessage", { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp,hash:hash });
                    } else if (messageTemp.send_after) {
                        let send_after_emit_name = messageTemp.replying_id ? "newReplyMessage" : "newMessage";
                        let id = messageTemp.channel_id;
                        delete messageTemp.channel_id;
                        io.to(messageTemp.sender_id).emit(send_after_emit_name, { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp,hash:hash });
                    } else if (messageTemp.reminded_to) {
                        let id = messageTemp.channel_id;
                        delete messageTemp.channel_id;
                        io.to(messageTemp.reminded_to).emit("newMessage", { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp,hash:hash});
                    } else if (messageTemp.replying_id) {
                        console.log("new reply");
                        let id = messageTemp.channel_id;
                        delete messageTemp.channel_id;
                        io.to(id).emit("newReplyMessage", { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp,hash:hash });
                    } else {
                        console.log("new message");
                        let id = messageTemp.channel_id;
                        delete messageTemp.channel_id;
                        io.to(id).emit("newMessage", { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: id, data: messageTemp,hash:hash });
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
                    if(ids.type == 'query'){
                        queryMessageUpdate(messageTemp,messageUpdateCheck,ids,update_message_emit_name,hash);
                    }
                    else if (messageUpdateCheck.send_after === null) {
                        io.to(messageTemp.channel_id).emit(send_after_emit_name, { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp,hash:hash });
                    } else if (messageUpdateCheck.deleted_at) {
                        messageTemp.message = messageTemp.attachments = messageTemp.audio_video_file = null;
                        io.to(messageTemp.channel_id).emit(update_message_emit_name, { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp,hash:hash});
                    } else if (messageUpdateCheck.is_read || messageUpdateCheck.child_read || messageUpdateCheck.pinned_by || (messageUpdateCheck.updated_at && Object.keys(messageUpdateCheck).length == 1)) {
                        break;
                    }
                    else if (messageUpdateCheck.delete_after){
                        io.to(messageTemp.sender_id).emit(update_message_emit_name, { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp,hash:hash });
                    }
                     else {
                        io.to(messageTemp.channel_id).emit(update_message_emit_name, { message_token: change._id, type: ids.type, company_id: ids.company_id, team_id: ids.team_id, channel_id: messageTemp.channel_id, data: messageTemp,hash:hash });
                    }
                    break;
            }
        } catch (err) {
            console.log(err.response);
            sendWebhookError(err, "message change stream", change);
        }
    });
};

module.exports = message;