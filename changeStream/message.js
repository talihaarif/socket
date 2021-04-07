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
          "token":"MyNodeToken"
        },
      };
    const url = config.get("url");
   
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

    message.on("change",async (change) => {
        let messageTemp = change.fullDocument;
        let channel_id=messageTemp.channel_id;
        let result;
        try {
            let ids=checkIds(channel_id);
            if(ids==false){
                let body = JSON.stringify({ channel_id });
                result =await axios.post(url+"api/teamAndCompanyId", body, configuration);
                ids=result.data;
                addIds({channel_id:channel_id,team_id:ids.team_id,company_id:ids.company_id,type:ids.type});
            }
            switch (change.operationType) {
                case "insert":
                    if(messageTemp.is_forwarded){
                        let id=messageTemp.channel_id;
                        delete messageTemp.channel_id;
                        io.to(id).emit("forwardMessage", {message_token:change._id,type:ids.type,company_id:ids.company_id,team_id:ids.team_id,channel_id:id,data:messageTemp});
                        saveMessageEmits({message_token:change._id,type:ids.type,company_id:ids.company_id,team_id:ids.team_id,channel_id:id,data:messageTemp,emit_to:id,emit_name:"forwardMessage"});
                    }
                    else if(messageTemp.send_after){
                        let id=messageTemp.channel_id;
                        delete messageTemp.channel_id;
                        io.to(messageTemp.sender_id).emit("newMessage", {message_token:change._id,type:ids.type,company_id:ids.company_id,team_id:ids.team_id,channel_id:id,data:messageTemp});
                        saveMessageEmits({message_token:change._id,type:ids.type,company_id:ids.company_id,team_id:ids.team_id,channel_id:id,data:messageTemp,emit_to:messageTemp.sender_id,emit_name:"send_after"});
                    }
                    else if(messageTemp.reminded_to){
                        let id=messageTemp.channel_id;
                        delete messageTemp.channel_id;
                        io.to(messageTemp.reminded_to).emit("newMessage", {message_token:change._id,type:ids.type,company_id:ids.company_id,team_id:ids.team_id,channel_id:id,data:messageTemp});
                        saveMessageEmits({message_token:change._id,type:ids.type,company_id:ids.company_id,team_id:ids.team_id,channel_id:id,data:messageTemp,emit_to:messageTemp.reminded_to,emit_name:"reminded_to"});
                    }
                    else{
                        let id=messageTemp.channel_id;
                        delete messageTemp.channel_id;
                        io.to(id).emit("newMessage", {message_token:change._id,type:ids.type,company_id:ids.company_id,team_id:ids.team_id,channel_id:id,data:messageTemp});
                        saveMessageEmits({message_token:change._id,type:ids.type,company_id:ids.company_id,team_id:ids.team_id,channel_id:id,data:messageTemp,emit_to:id,emit_name:"newMessage"});
                    }
                    break;
                case "update":
                    let messageUpdateCheck = change.updateDescription.updatedFields;
                    if(messageUpdateCheck.send_after===null){
                        io.to(messageTemp.channel_id).emit("sendAfterMessage", {message_token:change._id,type:ids.type,company_id:ids.company_id,team_id:ids.team_id,channel_id:messageTemp.channel_id,data:messageTemp});
                        saveMessageEmits({message_token:change._id,type:ids.type,company_id:ids.company_id,team_id:ids.team_id,channel_id:messageTemp.channel_id,data:messageTemp,emit_to:messageTemp.channel_id,emit_name:"sendAfterMessage"});
                    }
                    else if (messageUpdateCheck.deleted_at){
                        messageTemp.message = messageTemp.attachments = messageTemp.audio_video_file = null;
                        io.to(messageTemp.channel_id).emit("updateMessage", {message_token:change._id,type:ids.type,company_id:ids.company_id,team_id:ids.team_id,channel_id:messageTemp.channel_id,data:messageTemp});
                        saveMessageEmits({message_token:change._id,type:ids.type,company_id:ids.company_id,team_id:ids.team_id,channel_id:messageTemp.channel_id,data:messageTemp,emit_to:messageTemp.channel_id,emit_name:"updateMessage"});
                    } else if(messageUpdateCheck.is_read){
                        break;
                    }
                    else{ 
                        io.to(messageTemp.channel_id).emit("updateMessage", {message_token:change._id,type:ids.type,company_id:ids.company_id,team_id:ids.team_id,channel_id:messageTemp.channel_id,data:messageTemp});
                        saveMessageEmits({message_token:change._id,type:ids.type,company_id:ids.company_id,team_id:ids.team_id,channel_id:messageTemp.channel_id,data:messageTemp,emit_to:messageTemp.channel_id,emit_name:"updateMessage"});
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