const { sendWebhookError } = require("../utils/webhook");

let users = [];

/*
Save the data of the user which is connected to the socket
to keep track of online and offline user.
*/
const saveUser = async(socket_id, user_id, company_id, status) => {
    try{
        users.push({
            socket_id: socket_id,
            user_id: user_id,
            company_id: company_id,
            active: false,
            status:status,
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "saveUser", user_id);
    }
};

/*
This function search for user id and company id 
is user array so that if user is find in array that
means user is offline otherwise user is still online from 
some other device.
*/
const findUser = (socket_id, user_id, company_id) => {
    try{
        const a = users.find(
            (x) => x.company_id == company_id && x.user_id == user_id
        );
        if (a) {
            return true;
        }
        return false;
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "findUser", user_id);
    }
};
/*
This function remove object from user array based
on socket id when any socket is disconnected.
*/
const removeUser = (socket_id, user_id, company_id) => {
    try{
        users = users.filter((el) => {
            return el.socket_id != socket_id;
        });
        if (findUser(socket_id, user_id, company_id)) {
            return true;
        }
        return false;
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "removeUser", user_id);
    }
};

// This function finds all online users in a company.
const allOnlineUsers = (company_id, user_id) => {
    try{
        const onlineUsersArray = users.filter((el) => {
            return el.company_id == company_id && el.user_id != user_id;
        });
        return onlineUsersArray;
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "allOnlineUsers", user_id);
    }
};

// This function finds all offline users of a company.
const getAllOfflineUsers = (channelUser) => {
    try{
        const offlineUsers = channelUser.filter((el) => {
            if (!users.find((user) => user.user_id == el && user.active == true))
                return el;
        });
        return offlineUsers;
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "getAllOfflineUsers", channelUser);
    }
};

// This function finds those users if the user is active but the tab is not opened
const getAllInactiveUsers = (channelUser) => {
    try{
        const inactiveUsers = channelUser.filter((el) => {
            if (users.find((user) => user.user_id == el))
                return el;
        });
        return inactiveUsers;
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "getAllInactiveUsers", channelUser);
    }
};

// This function sets the active status of user.
const setActiveStatus = (active,id) => {
    try{
        let user = users.find((el) => el.socket_id == id);
        let index = users.indexOf(user);
        if(index !=-1 && active !== undefined && user !== undefined){
            users[index].active = active;
        }
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "setActiveStatus", id);
    }
};

//this function sets userOffline emit to company room if user gets offline.
const userOffline=(socket)=>{
    try{
        if (!removeUser(socket.id, socket.user_id, socket.company_id)) {
            socket.to(socket.company_id).emit("userOffline", {
                company_id: socket.company_id,
                user_id: socket.user_id,
                status: socket.status,
            });
        }
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "userOffline", socket);
    }
}

//this function sets userOnline emit to company room if user gets online.
const userOnline=(socket)=>{
    try{
        socket.to(socket.company_id).emit("userOnline", {
            company_id: socket.company_id,
            user_id: socket.user_id,
            status: socket.status,
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "userOnline", socket);
    }
}

// This function sends usersOnline emit to the user to give him all online users of a company.
const usersOnline=(io,socket)=>{
    try{
        io.to(socket.id).emit("usersOnline", {
            users: allOnlineUsers(socket.company_id, socket.user_id),
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "usersOnline", socket);
    }
}

module.exports = {
    saveUser,
    findUser,
    removeUser,
    allOnlineUsers,
    getAllOfflineUsers,
    setActiveStatus,
    getAllInactiveUsers,
    userOffline,
    userOnline,
    usersOnline
};
