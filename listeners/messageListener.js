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
        console.log(error);
        sendWebhookError(error);
    }
    });
    socket.on("messageRead", (data) => {
        try{
        socket.to(data.user_id).emit("singleMessageSeen", data);
        io.to(data.channel_id).emit("singleMessageRead", data);
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
    });
    socket.on("typing", (data) => {
        try{
        socket.to(data.channel_id).emit("someoneIsTyping", data);
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
    });

    socket.on("stopTyping", (data) => {
        try{
        socket.to(data.channel_id).emit("someoneStopTyping", data);
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
    });
};

module.exports = messageListener;