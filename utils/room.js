const { saveUser } = require("./user");
const { sendWebhookError } = require("../utils/webhook");

/*
* This function is used to join company room.
* For each company:
*   If company has users then:
*       Join the company room using socket instance.
*       if the company is selected and user is also logged in then:
*           Set the company_id in socket instance.
*           If socket is not check then call saveUser function.
*       Call joinTeamRoom function.
*       Call joinChannelRoom function for private channels.
*       Call joinChannelRoom function for public channels.
*       Call joinChannelRoom function for direct channels.
*/
const joinCompanyRoom = (socket,companies,login=false,selected_company=null) => {
    try{
        companies.map((company, index) => {
            // if (company.users) {
            socket.join(company._id);
            if (selected_company == company._id && login==true) {
                socket.company_id = company._id;
                console.log("selected company id",company._id);
                console.log("selected company name",company.name);
                if(!socket.check)  //?
                    saveUser(socket.id, socket.user_id, company._id, socket.status);
            }
            joinTeamRoom(socket,company.teams);
            joinChannelRoom(socket,company.private);
            joinChannelRoom(socket,company.public);
            joinChannelRoom(socket,company.direct);
            if(company.query)
                joinChannelRoom(socket,company.query);
            // }
        });
    } catch (error) {
        sendWebhookError(error, "joinCompanyRoom", companies);
    }
};

/*
* This function is used to join team room.
* For each team:
*      Join the team room using socket instance.
*/
const joinTeamRoom = (socket,teams) => {
    try{
        teams.map((team) => {
            socket.join(team._id);
        });
    } catch (error) {
        sendWebhookError(error, "joinTeamRoom", teams);
    }
};

/*
* This function is used to join channel room.
* For each channel:
*      Join the channel room using socket instance.
*/
const joinChannelRoom = (socket,channels) => {
    try{
        channels.map((channel) => {
            socket.join(channel._id);
        });
    } catch (error) {
        sendWebhookError(error, "joinChannelRoom", channels);
    }
};

/*
* This function is used to leave company room.
* If user is logged out:
*      Set company_id to null in socket instance.
* For each company:
*     Leave company room using socket instance.
*     Call leaveTeamRoom function.
*     Call leaveChannelRoom function for private channels.
*     Call leaveChannelRoom function for public channels.
*     Call leaveChannelRoom function for direct channels.
*/
const leaveCompanyRoom = (socket,companies,logout=false) => {
    try{
        if(logout)
            socket.company_id = null;
        companies.map((company) => {
            socket.leave(company._id);
            leaveTeamRoom(socket,company.teams);
            leaveChannelRoom(socket,company.private);
            leaveChannelRoom(socket,company.public);
            leaveChannelRoom(socket,company.direct);
        });
    } catch (error) {
        sendWebhookError(error, "leaveCompanyRoom", companies);
    }
};

/*
* This function is used to join team room.
* For each team:
*      Leave the team room using socket instance.
*/
const leaveTeamRoom = (socket,teams) => {
    try{
        teams.map((team) => {
            socket.leave(team._id);
        });
    } catch (error) {
        sendWebhookError(error, "leaveTeamRoom", teams);
    }
};

/*
* This function is used to join channel room.
* For each channel:
*      Leave the channel room using socket instance.
*/
const leaveChannelRoom = (socket,channels) => {
    try{
        channels.map((channel) => {
            socket.leave(channel._id);
        });
    } catch (error) {
        sendWebhookError(error, "leaveChannelRoom", channels);
    }
};

module.exports = {
    joinCompanyRoom,
    joinTeamRoom,
    joinChannelRoom,
    leaveCompanyRoom,
    leaveTeamRoom,
    leaveChannelRoom

};