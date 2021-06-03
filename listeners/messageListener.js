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

const messageListener = (socket,io) => {
   
    socket.on("messagesRead", (data) => {
        try{
        socket.to(data.user_id).emit("multipleMessagesSeen", data);
        io.to(data.channel_id).emit("multipleMessagesRead", data);
    } catch (error) {
        sendWebhookError(error, "messagesRead listener", data);
    }
    });
    socket.on("messageRead", (data) => {
        try{
        socket.to(data.user_id).emit("singleMessageSeen", data);
        io.to(data.channel_id).emit("singleMessageRead", data);
    } catch (error) {
        sendWebhookError(error, "messageRead listener", data);
    }
    });
    socket.on("markSeenAllReplies", (data) => {
        try{
        socket.to(data.user_id).emit("multipleReplySeen", data);
        socket.to(data.channel_id).emit("multipleReplyRead", data);
    } catch (error) {
        sendWebhookError(error, "markSeenAllReplies listener", data);
    }
    });

    socket.on("markSeenSingleReplies", (data) => {
        try{
        socket.to(data.user_id).emit("singleReplySeen", data);
        socket.to(data.channel_id).emit("singleReplyRead", data);
    } catch (error) {
        sendWebhookError(error, "markSeenAllReplies listener", data);
    }
    });

    socket.on("replyReadBy", (data) => {
        try {
            socket.to(data.channel_id).emit("addReplyReadBy", data);
        } catch (error) {
            sendWebhookError(error, "replyReadBy listener", data);
        }
    });
    
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

module.exports = messageListener;