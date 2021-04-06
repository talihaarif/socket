const { saveUser } = require("./user");
const { sendWebhookError } = require("../utils/webhook");

const joinCompanyRoom = (socket,companies,login=false,selected_company=null) => {
    try{
        companies.map((company, index) => {
            if (company.users) {
                socket.join(company._id);
                if (selected_company == company._id && login==true) {
                    socket.company_id = company._id;
                    console.log("selected company id",company._id);
                    console.log("selected company name",company.name);
                    if(!socket.check)
                        saveUser(socket.id, socket.user_id, company._id);
                }
                joinTeamRoom(socket,company.teams);
            }
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
};

const joinTeamRoom = (socket,teams) => {
    try{
        teams.map((team) => {
            socket.join(team._id);
            joinChannelRoom(socket,team.private);
            joinChannelRoom(socket,team.public);
            joinChannelRoom(socket,team.direct);
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
};

const joinChannelRoom = (socket,channels) => {
    try{
        channels.map((channel) => {
            socket.join(channel._id);
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
};

const leaveCompanyRoom = (socket,companies,logout=false) => {
    try{
        if(logout)
            socket.company_id = null;
        companies.map((company) => {
            socket.leave(company._id);
            leaveTeamRoom(socket,company.teams);
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
};

const leaveTeamRoom = (socket,teams) => {
    try{
        teams.map((team) => {
            socket.leave(team._id);
            leaveChannelRoom(socket,team.private);
            leaveChannelRoom(socket,team.public);
            leaveChannelRoom(socket,team.direct);
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
};

const leaveChannelRoom = (socket,channels) => {
    try{
        channels.map((channel) => {
            socket.leave(channel._id);
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
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