let users = [];

/*
Save the data of the user which is connected to the socket
to keep track of online and offline user.
*/
const saveUser = async(socket_id, user_id, company_id) => {
    users.push({
        socket_id: socket_id,
        user_id: user_id,
        company_id: company_id,
        active: false,
    });
};

/*
This function search for user id and company id 
is user array so that if user is find in array that
means user is offline otherwise user is still online from 
some other device.
*/
const findUser = (socket_id, user_id, company_id) => {
    const a = users.find(
        (x) => x.company_id == company_id && x.user_id == user_id
    );
    if (a) {
        return true;
    }
    return false;
};
/*
This function remove object from user array based
on socket id when any socket is disconnected.
*/
const removeUser = (socket_id, user_id, company_id) => {
    users = users.filter((el) => {
        return el.socket_id != socket_id;
    });
    if (findUser(socket_id, user_id, company_id)) {
        return true;
    }
    return false;
};

const allOnlineUsers = (company_id, user_id) => {
    const onlineUsersArray = users.filter((el) => {
        return el.company_id == company_id && el.user_id != user_id;
    });
    return onlineUsersArray;
};

const getAllOfflineUsers = (channelUser) => {
    const offlineUsers = channelUser.filter((el) => {
        if (!users.find((user) => user.user_id == el && user.active == true))
            return el;
    });
    return offlineUsers;
};

const getAllInactiveUsers = (channelUser) => {
    const inactiveUsers = channelUser.filter((el) => {
        if (users.find((user) => user.user_id == el))
            return el;
    });
    return inactiveUsers;
};

const setActiveStatus = (active,id) => {
    let user = users.find((el) => el.socket_id == id);
    let index = users.indexOf(user);
    if(index !=-1 && active !== undefined && user !== undefined){
        users[index].active = active;
    }
};

const userOffline=(socket)=>{
    if (!removeUser(socket.id, socket.user_id, socket.company_id)) {
        socket.to(socket.company_id).emit("userOffline", {
            company_id: socket.company_id,
            user_id: socket.user_id,
        });
    }
}

const userOnline=(socket)=>{
    socket.to(socket.company_id).emit("userOnline", {
        company_id: socket.company_id,
        user_id: socket.user_id,
    });
}

const usersOnline=(io,socket)=>{
    io.to(socket.id).emit("usersOnline", {
        users: allOnlineUsers(socket.company_id, socket.user_id),
    });
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
