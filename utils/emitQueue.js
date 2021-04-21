const channel = require("./channel");
const { sendWebhookError } = require("../utils/webhook");

let channelEmits = [];
let companyEmits = [];
let messageEmits = [];
let teamEmits = [];
let userEmits = [];
let reminderEmits=[];
let permissionEmits=[];

const saveChannelEmits = async(emit) => {
    channelEmits.push(emit);
};

const saveCompanyEmits = async(emit) => {
    companyEmits.push(emit);
};

const saveMessageEmits = async(emit) => {
    messageEmits.push(emit);
};

const saveTeamEmits = async(emit) => {
    teamEmits.push(emit);
};

const saveUserEmits = async(emit) => {
    userEmits.push(emit);
};

const saveReminderEmits = async(emit) => {
    reminderEmits.push(emit);
};

const savePermissionEmits = async(emit) => {
    permissionEmits.push(emit);
};

const removeEmits = async() => {
    channelEmits=[];
    companyEmits=[];
    messageEmits=[];
    teamEmits=[];
    userEmits=[];
    reminderEmits=[];
    permissionEmits=[];
};

const getEmits=(data,io)=>{
    try{
        let user_id=data._id;
        let tempChannelEmits=channelEmits;
        let tempCompanyEmits=companyEmits;
        let tempMessageEmits=messageEmits;
        let tempTeamEmits=teamEmits;
        let tempUserEmits=userEmits;
        let tempReminderEmits=reminderEmits;
        let tempPermissionEmits = permissionEmits;
        let channels=teams=companies=[];
        data.companies.map((company)=>{
            companies.push(company._id);
            if(company.teams){
                company.teams.map((team)=>{
                    teams.push(team._id);
                    team.public.map((public)=>{
                        channels.push(public._id);
                    });
                    team.private.map((private)=>{
                        channels.push(private._id);
                    });
                    team.direct.map((direct)=>{
                        channels.push(direct._id);
                    });
                });
            }
            
        });
        getChannelEmits(tempChannelEmits,io,channels,user_id);
        getCompanyEmits(tempCompanyEmits,io,companies,user_id);
        getMessageEmits(tempMessageEmits,io,channels,user_id);
        getTeamEmits(tempTeamEmits,io,teams,user_id);
        getUserEmits(tempUserEmits,io,user_id,data);
        getReminderEmits(tempReminderEmits,io,user_id);
        getPermissionEmits(tempPermissionEmits,io,user_id);
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }

}

const getChannelEmits=(tempChannelEmits,io,channels,user_id)=>{
    try{
    tempChannelEmits.forEach(channelEmit => {
        if(!channels.includes(channelEmit.channel._id) || !channelEmit.emit_name=='channelUnArchived' || !channelEmit.emit_name=='newChannel' || !channelEmit.emit_name=='newPublicChannel' || !channelEmit.emit_name=='newDirectChannel')
            console.log("continue");
        else if(channelEmit.emit_name=='newChannel')
            if(channelEmit.channel.creator_id==user_id)
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else if(channelEmit.emit_name=='newPublicChannel')
            if(channelEmit.channel.creator_id!=user_id)
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else if(channelEmit.emit_name=='newDirectChannel')
            if(channelEmit.emit_to == user_id)
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else if(channelEmit.emit_name=='channelNameUpdate')
            if(channelEmit.channel.type=='direct' && channelEmit.emit_to==user_id)
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else if(channelEmit.emit_name=='channelNameUpdate')
            if(channelEmit.channel.type !='direct')
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else if(channelEmit.emit_name=='channelUnArchived')
            if(channelEmit.channel.users.includes(user_ids))
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else if(channelEmit.emit_name=='publicChannelUnArchived')
            if(!channelEmit.channel.users.includes(user_ids))
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else if(channelEmit.emit_name=='deleteChannel')
            if(!channelEmit.channel.users.includes(user_ids))
                io.to(user_id).emit(channelEmit.emit_name,channelEmit);
        else
            io.to(user_id).emit(channelEmit.emit_name,channelEmit);
    });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
}

const getCompanyEmits=(tempCompanyEmits,io,companies,user_id)=>{
    try{
        tempCompanyEmits.forEach(companyEmit => {
            if(!companies.includes(companyEmit.company_id) || !companyEmit.emit_name=='newCompany')
                console.log("continue");
            else if(companyEmit.emit_name=='newCompany')
                if(companyEmit.emit_to==user_id)
                    io.to(user_id).emit(companyEmit.emit_name,companyEmit);
            else
                io.to(user_id).emit(companyEmit.emit_name,companyEmit);
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
}

const getMessageEmits=(tempMessageEmits,io,channels,user_id)=>{
    try{
        tempMessageEmits.forEach(messageEmit => {
            if(!channels.includes(messageEmit.channel_id) || user_id==messageEmit.data.sender_id)
                console.log("continue");
            else if(messageEmit.emit_name='send_after'){
                console.log("in send after queue")
                if(messageEmit.emit_to==user_id){
                    console.log("sending emit to",user_id);
                    console.log("emit to ",messageEmit.emit_to);
                    io.to(user_id).emit('newMessage',messageEmit);
                }
            }
            else if(messageEmit.emit_name='reminded_to')
                if(messageEmit.emit_to==user_id)
                    io.to(user_id).emit('newMessage',messageEmit);
            else
                io.to(user_id).emit('newMessage',messageEmit);
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
}

const getTeamEmits=(tempTeamEmits,io,teams,user_id)=>{
    try{
        tempTeamEmits.forEach(teamEmit => {
            if(!teams.includes(teamEmit.team_id) || !teamEmit.emit_name=='newTeamCreated' || !teamEmit.emit_name=='teamUnArchived')
                console.log("continue");
            else if(teamEmit.emit_name=='newTeamCreated')
                if(teamEmit.emit_to==user_id)
                    io.to(user_id).emit(teamEmit.emit_name,teamEmit);
            else if(teamEmit.emit_name=='teamUnArchived')
                if(!teamEmit.team.users.includes(user_ids))
                    io.to(user_id).emit(teamEmit.emit_name,teamEmit);
            else
                io.to(user_id).emit(teamEmit.emit_name,teamEmit);
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
}

const getUserEmits=(tempUserEmits,io,user_id,data)=>{
    try{
        tempUserEmits.forEach(userEmit => {
            if(userEmit.emit_name=="userProfilePictureUpdate" || userEmit.emit_name=="userNameUpdate")
            {
                data.companies.map((company)=>{
                    if(company.users.filter((user)=> {return user._id==userEmit.user_id}))
                        io.to(user_id).emit(tempUserEmits.emit_name,tempUserEmits);
                })
            }
            else if(user_id==tempUserEmits.user_id){
                io.to(user_id).emit(tempUserEmits.emit_name,tempUserEmits);
            }
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
}

const getReminderEmits=(tempReminderEmits,io,user_id)=>{
    try{
        tempReminderEmits.forEach(reminderEmit => {
            if(reminderEmit.emit_to==user_id)
                io.to(user_id).emit(reminderEmit.emit_name,reminderEmit);
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
}

const getPermissionEmits=(tempPermissionEmits,io,user_id)=>{
    try{
        tempPermissionEmits.forEach(permissionEmit => {
            if(permissionEmit.emit_to==user_id)
                io.to(user_id).emit(permissionEmit.emit_name,permissionEmit);
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
}

module.exports = {
    saveChannelEmits,
    saveCompanyEmits,
    saveMessageEmits,
    saveTeamEmits,
    saveUserEmits,
    savePermissionEmits,
    removeEmits,
    getEmits,
    saveReminderEmits
};
