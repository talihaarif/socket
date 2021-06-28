const { sendWebhookError } = require("../utils/webhook");
const { createHash } = require("../utils/hash");
const { messageEmit, getIds, queryMessageInsert, queryMessageUpdate } = require("../utils/message");

const message = (conn, io) => {
    /*
    Connection with database for listening to changes
    */

    const message = conn
        .collection("messages")
        .watch({ fullDocument: "updateLookup" });

    console.log("message change stream running");

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
        try {
            let ids = await getIds(channel_id);
            switch (change.operationType) {
                case "insert":
                    if(ids.type == 'support'){
                        await queryMessageInsert(io,messageTemp,ids,hash,channel_id);
                    }
                    else if (messageTemp.is_forwarded) {
                        console.log("in forward message",messageTemp);
                        await messageEmit(io,channel_id,"forwardMessage",messageTemp,ids,hash,channel_id);
                    } else if (messageTemp.send_after) {
                        let send_after_emit_name = messageTemp.replying_id ? "newReplyMessage" : "newMessage";
                        await messageEmit(io,messageTemp.sender_id,send_after_emit_name,messageTemp,ids,hash,channel_id);
                    } else if (messageTemp.replying_id) {
                        await messageEmit(io,channel_id,"newReplyMessage",messageTemp,ids,hash,channel_id);
                    } else {
                        console.log("new message",messageTemp);
                        await messageEmit(io,channel_id,"newMessage",messageTemp,ids,hash,channel_id);
                    }
                    break;
                case "update":
                    let messageUpdateCheck = change.updateDescription.updatedFields;
                    let send_after_emit_name = messageTemp.replying_id ? "replySendAfterMessage" : "sendAfterMessage";
                    let update_message_emit_name = messageTemp.replying_id ? "replyUpdateMessage" : "updateMessage";
                    if(ids.type == 'support'){
                        await queryMessageUpdate(io,messageTemp,messageUpdateCheck,ids,update_message_emit_name,hash,channel_id);
                    }
                    else if (messageUpdateCheck.send_after === null) {
                        await messageEmit(io,channel_id,send_after_emit_name,messageTemp,ids,hash,channel_id);
                    } else if (messageUpdateCheck.deleted_at) {
                        messageTemp.message = messageTemp.attachments = messageTemp.audio_video_file = null;
                        await messageEmit(io,channel_id,update_message_emit_name,messageTemp,ids,hash,channel_id);
                    } else if (messageUpdateCheck.is_read || messageUpdateCheck.child_read || messageUpdateCheck.pinned_by || messageUpdateCheck.replied_created_at || messageUpdateCheck.replied_sender_id || messageUpdateCheck.addReaction || messageUpdateCheck.removeReaction || (messageUpdateCheck.updated_at && Object.keys(messageUpdateCheck).length == 1)) {
                        break;
                    }
                    else if (messageUpdateCheck.delete_after){
                        await messageEmit(io,messageTemp.sender_id,update_message_emit_name,messageTemp,ids,hash,channel_id);
                    }
                     else {
                        await messageEmit(io,channel_id,update_message_emit_name,messageTemp,ids,hash,channel_id);
                    }
                    break;
            }
        } catch (err) {
            sendWebhookError(err, "message change stream", change);
        }
    });
};

module.exports = message;