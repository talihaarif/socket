const { default: axios } = require("axios");
const config = require("config");
const { sendWebhookError } = require("../utils/webhook");

const resumeAfter = (conn,io,data) => {
        console.log("messageResume running");

        const message = conn
        .collection("messages")
        .watch({
            fullDocument: "updateLookup",
            resumeAfter: {
                _data: data.message_token
            },
          });
        const configuration = {
            headers: {
              "Content-Type": "application/json",
              "token":"MyNodeToken"
            },
          };
        const url = config.get("url");


        message.on("change",async (change) => {
            try{
            let messageTemp = change.fullDocument;
            let channel_id=messageTemp.channel_id;
            let result;
            if(data.channels.includes(channel_id)){
                try {
                    let body = JSON.stringify({ channel_id });
                    result =await axios.post(url+"api/teamAndCompanyId", body, configuration);
                } catch (err) {
                    sendWebhookError(err);
                }
                // console.log("message resume",messageTemp);
                switch (change.operationType) {
                    case "insert":
                        if(messageTemp.is_forwarded){
                            let id=messageTemp.channel_id;
                            delete messageTemp.channel_id;
                            io.to(id).emit("forwardMessage", {resumeToken:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:id,data:messageTemp});
                        }
                        else{
                            let id=messageTemp.channel_id;
                            delete messageTemp.channel_id;
                            io.to(id).emit("newMessage", {resumeToken:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:id,data:messageTemp});
                        }
                        break;
                    case "update":
                        let messageUpdateCheck = change.updateDescription.updatedFields;
                        if(messageUpdateCheck.send_after===null)
                            io.to(messageTemp.channel_id).emit("sendAfterMessage", {resumeToken:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:messageTemp.channel_id,data:messageTemp});
                        else if (messageUpdateCheck.deleted_at){
                            messageTemp.message = messageTemp.attachments = messageTemp.audio_video_file = null;
                            io.to(messageTemp.channel_id).emit("updateMessage", {resumeToken:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:messageTemp.channel_id,data:messageTemp});
                        } else if(messageUpdateCheck.is_read){
                            break;
                        }
                        else 
                            io.to(messageTemp.channel_id).emit("updateMessage", {resumeToken:change._id,type:result.data.type,company_id:result.data.company_id,team_id:result.data.team_id,channel_id:messageTemp.channel_id,data:messageTemp});
                        break;
                }
            }
        } catch (error) {
            sendWebhookError(error, "resumeAfter listener", change);
        }
    });
    setTimeout(function(){ message.close(); }, 60000);
        
}
module.exports = resumeAfter;