const { default: axios } = require("axios");
const { saveMessageEmits } = require("../utils/emitQueue");
const config = require("config");
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

    message.on("change",async (change) => {
        let messageTemp = change.fullDocument;
        let channel_id=messageTemp.channel_id;
        let result;
        try {
            let body = JSON.stringify({ channel_id });
            result =await axios.post(url+"api/teamAndCompanyId", body, configuration);
        } catch (err) {
            console.log(err);
        }
        switch (change.operationType) {
            case "insert":
                if(messageTemp.is_forwarded){
                    let id=messageTemp.channel_id;
                    delete messageTemp.channel_id;
                    io.to(id).emit("forwardMessage", {message_token:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:id,data:messageTemp});
                    saveMessageEmits({message_token:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:id,data:messageTemp,emit_to:id,emit_name:"forwardMessage"});
                }
                else if(messageTemp.send_after){
                    let id=messageTemp.channel_id;
                    delete messageTemp.channel_id;
                    io.to(messageTemp.sender_id).emit("newMessage", {message_token:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:id,data:messageTemp});
                    saveMessageEmits({message_token:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:id,data:messageTemp,emit_to:messageTemp.sender_id,emit_name:"newMessage"});
                }
                else{
                    let id=messageTemp.channel_id;
                    delete messageTemp.channel_id;
                    io.to(id).emit("newMessage", {message_token:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:id,data:messageTemp});
                    saveMessageEmits({message_token:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:id,data:messageTemp,emit_to:id,emit_name:"newMessage"});
                }
                break;
            case "update":
                let messageUpdateCheck = change.updateDescription.updatedFields;
                if(messageUpdateCheck.send_after===null){
                    io.to(messageTemp.channel_id).emit("sendAfterMessage", {message_token:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:messageTemp.channel_id,data:messageTemp});
                    saveMessageEmits({message_token:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:messageTemp.channel_id,data:messageTemp,emit_to:messageTemp.channel_id,emit_name:"sendAfterMessage"});
                }
                else if (messageUpdateCheck.deleted_at){
                    messageTemp.message = messageTemp.attachments = messageTemp.audio_video_file = null;
                    io.to(messageTemp.channel_id).emit("updateMessage", {message_token:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:messageTemp.channel_id,data:messageTemp});
                    saveMessageEmits({message_token:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:messageTemp.channel_id,data:messageTemp,emit_to:messageTemp.channel_id,emit_name:"updateMessage"});
                } else if(messageUpdateCheck.is_read){
                    break;
                }
                else{ 
                    io.to(messageTemp.channel_id).emit("updateMessage", {message_token:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:messageTemp.channel_id,data:messageTemp});
                    saveMessageEmits({message_token:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:messageTemp.channel_id,data:messageTemp,emit_to:messageTemp.channel_id,emit_name:"updateMessage"});
                }
                break;
        }
    });

};

module.exports = message;