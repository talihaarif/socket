const messageListener = (socket,io) => {
    /*
      front end will send us the emit to when someone
      reads the message and we will emit that message id 
      to particular channel.
      */
    socket.on("messagesRead", (data) => {
        socket.to(data.user_id).emit("multipleMessagesSeen", data);
        io.to(data.channel_id).emit("multipleMessagesRead", data);
    });
    socket.on("messageRead", (data) => {
        socket.to(data.user_id).emit("singleMessageSeen", data);
        io.to(data.channel_id).emit("singleMessageRead", data);

    });
    socket.on("typing", (data) => {
        socket.to(data.channel_id).emit("someoneIsTyping", data);
    });

    socket.on("stopTyping", (data) => {
        socket.to(data.channel_id).emit("someoneStopTyping", data);
    });

};

module.exports = messageListener;