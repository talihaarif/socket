const { sendWebhookError } = require("../utils/webhook");

    /**
     * This is the code for Message Listener. This is called when emit is send from frontend on message operations.
     *
     * 1. On messagesRead emit from frontend:
     *      Send multipleMessagesSeen emit to the user who seens the message.
     *      Send multipleMessagesRead emit to channel room.
     * 2. On messageRead emit from frontend:
     *      Send singleMessageSeen emit to the user who seens the message.
     *      Send singleMessageRead emit to channel room.
     * 3. On typing emit from frontend:
     *      Send someoneIsTyping emit to channel room.
     * 4. On stopTyping emit from frontend.
     *      Send someoneStopTyping emit to channel room.
    */


   const messagesRead =(data,io)=>{
    try{
    io.to(data.user_id).emit("multipleMessagesSeen", data);
    if(data.type=="query")
        io.to(data.company_id).emit("multipleMessagesRead", data);
    else
        io.to(data.channel_id).emit("multipleMessagesRead", data);
    } catch (error) {
        sendWebhookError(error, "messagesRead listener", data);
    }
    }

    const messageRead =(data,io)=>{
        try{
        io.to(data.user_id).emit("singleMessageSeen", data);
        if(data.type=="query")
            io.to(data.company_id).emit("singleMessageRead", data);
        else
            io.to(data.channel_id).emit("singleMessageRead", data);
        } catch (error) {
            sendWebhookError(error, "messageRead listener", data);
        }
    }

    const markSeenAllReplies =(data,io)=>{
        try{
        io.to(data.user_id).emit("multipleReplySeen", data);
        if(data.type=="query")
            io.to(data.company_id).emit("multipleReplyRead", data);
        else
            io.to(data.channel_id).emit("multipleReplyRead", data);
        } catch (error) {
            sendWebhookError(error, "markSeenAllReplies listener", data);
        }
    }

    const markSeenSingleReplies =(data,io)=>{
        try{
        io.to(data.user_id).emit("singleReplySeen", data);
        if(data.type=="query")
            io.to(data.company_id).emit("singleReplyRead", data);
        else
            io.to(data.channel_id).emit("singleReplyRead", data);
        } catch (error) {
            sendWebhookError(error, "markSeenAllReplies listener", data);
        }
    }

    const replyReadBy =(data,io)=>{
        try {
            io.to(data.channel_id).emit("addReplyReadBy", data);
        } catch (error) {
            sendWebhookError(error, "replyReadBy listener", data);
        }
    }

const messageListener = (socket,io) => {
    
    socket.on("typing", (data) => {
        try{
        socket.to(data.channel_id).emit("someoneIsTyping", data);
    } catch (error) {
        sendWebhookError(error, "typing listener", data);
    }
    });

    socket.on("stopTyping", (data) => {
        try{
        socket.to(data.channel_id).emit("someoneStopTyping", data);
    } catch (error) {
        sendWebhookError(error, "stopTyping listener", data);
    }
    });
};

module.exports = {
    messageListener,
    messagesRead,
    messageRead,
    markSeenAllReplies,
    markSeenSingleReplies,
    replyReadBy
};