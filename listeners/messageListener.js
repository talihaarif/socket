const { sendWebhookError } = require("../utils/webhook");

const messageListener = (socket,io) => {
    /*
      front end will send us the emit to when someone
      reads the message and we will emit that message id 
      to particular channel.
      */
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