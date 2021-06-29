const { joinChannelRoom, leaveChannelRoom } = require("./room");
const { default: axios } = require("axios");
const { sendWebhookError } = require("../utils/webhook");

// Declare configuration variable to store headers which will be send with axios requests.
const configuration = {
    headers: {
        "Content-Type": "application/json",
        "token": "MyNodeToken"
    },
};
const url = process.env.URL;

/*
* This function creates the channel room
* If no clients found return true.
* Otherwise For each client:
* Get client socket id.
* Call joinChannelRoom function.
*/
const createChannelRoom = (io, data) => {
    try {
        let clients = io.sockets.adapter.rooms.get(data.user_id);
        if (!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            joinChannelRoom(clientSocket, [data.channel]);
        }
    } catch (error) {

        sendWebhookError(error, "createChannelRoom", data);
    }
};

/*
* This function deletes the channel room
* If no client found return true.
* Otherwise For each client:
* Get client socket id.
* Call leaveChannelRoom function.
*/
const deleteChannelRoom = (io, data) => {
    try {
        let clients = io.sockets.adapter.rooms.get(data.user_id);
        if (!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            leaveChannelRoom(clientSocket, [data.channel]);
        }
    } catch (error) {

        sendWebhookError(error, "deleteChannelRoom", data);
    }
};

/*
* This function creates the public and private channels room
* If no clients found return true.
* Otherwise For each client:
* Get client socket id.
* Call joinChannelRoom function.
*/
const createPublicPrivateChannelRoom = (io, data) => {
    try {
        let clients = io.sockets.adapter.rooms.get(data.user_id);
        if (!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            joinChannelRoom(clientSocket, data.public);
            joinChannelRoom(clientSocket, data.private);
        }
    } catch (error) {

        sendWebhookError(error, "createPublicPrivateChannelRoom", data);
    }
};

/*
* This function deletes the public and private channels room
* If no client found return true.
* Otherwise For each client:
* Get client socket id.
* Call leaveChannelRoom function.
*/
const deletePublicPrivateChannelRoom = (io, data) => {
    try {
        let clients = io.sockets.adapter.rooms.get(data.user_id);
        if (!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            leaveChannelRoom(clientSocket, data.public);
            leaveChannelRoom(clientSocket, data.private);
        }
    } catch (error) {

        sendWebhookError(error, "deletePublicPrivateChannelRoom", data);
    }
};


/*
* This function sends the emit on new channel insertion
* Call api/channelData backend route using axios and store the response in a variable.
* Call createChannelRoom function.
* Send newChannel emit to the user who created the channel.
* Call saveChannelEmits function to store the event for one minute.
* Call channelInserEmitInCaseOfPublicDirectChannels function.
*/
const channelInsert = async (channelTemp, io, resumeToken, hash) => {
    let channel_id = channelTemp._id.toString();
    let user_id = channelTemp.creator_id;
    let result;
    try {
        const body = JSON.stringify({ channel_id, user_id });
        result = await axios.post(url + "api/channelData", body, configuration);
        createChannelRoom(io, result.data);
        // if(channelTemp.type == 'query')    ???
        //     io.to(channelTemp.company_id).emit("newQueryChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken,hash:hash});
        // else
        io.to(user_id).emit("newChannel", { company_id: result.data.company_id, team_id: result.data.team_id, type: result.data.type, channel: result.data.channel, channel_token: resumeToken, hash: hash });
    } catch (err) {
        sendWebhookError(err, "channelInsert", channelTemp);
    }
    channelInserEmitInCaseOfPublicDirectChannels(result, channelTemp, io, resumeToken, hash);
}

/*
* This function sends the emit on new channel insertion
* Call api/channelData backend route using axios and store the response in a variable.
* Call createChannelRoom function.
* Send newChannel emit to the user who created the channel.
* Call saveChannelEmits function to store the event for one minute.
* Call channelInserEmitInCaseOfPublicDirectChannels function.
*/
const supportChannelInsert = async (channelTemp, io, resumeToken, hash) => {
    console.log("supportChannelInsert");
    let channel_id = channelTemp._id.toString();
    let user_id = channelTemp.creator_id;
    let result;
    try {
        const body = JSON.stringify({ channel_id,user_id });
        result =await axios.post(url+"api/supportChannelData", body, configuration);
        createChannelRoom(io,result.data);
        io.to(result.data.channel.creator_id).emit("newSupportChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken,hash:hash});
    } catch (err) {
        sendWebhookError(err, "channelInsert", channelTemp);
    }
    channelTemp.public_option == true && await supportChannelInsertEmitInCaseOfPublic(channelTemp, io, resumeToken, hash, "newSupportChannel");
}

const supportChannelInsertEmitInCaseOfPublic = async (channelTemp, io, resumeToken, hash, emit_name) => {
    console.log('supportChannelInsertEmitInCaseOfPublic');
    try {
        channel_id = channelTemp._id.toString();
        const body = JSON.stringify({});
        const result = await axios.post(url + "api/get_all_user_ids", body, configuration);
        for (let user_id of result.data.users) {
            if (user_id != channelTemp.creator_id) {
                const body = JSON.stringify({ channel_id, user_id });
                let result_data = await axios.post(url + "api/supportChannelData", body, configuration);
                io.to(user_id).emit(emit_name, { company_id: channelTemp.company_id, team_id: channelTemp.team_id, type: channelTemp.type, channel: result_data.data.channel, channel_token: resumeToken, hash: hash });
            }
        }
    } catch (err) {
        sendWebhookError(err, "supportChannelInsertEmitInCaseOfPublic", channelTemp);
    }
}

const supportChannelDataObjectUpdate= async(data, io, emit_name)=>{
    let channel_id = data.channel_id!=null ?  data.channel_id : data._id.toString() ;
    for (let channel_object of data.data){
        console.log("channel_object is: ",channel_object);
        if(channel_object.user_ids.length==0 && channel_object.team_ids.length==0){
            let company_id = channel_object.company_id;
            const body = JSON.stringify({ company_id });
            const result =await axios.post(url+"api/get_company_member_ids", body, configuration);
            console.log("company_members are: ", result.data.users);
            for(let user_id of result.data.users){
                if (user_id != data.creator_id && !data.user_ids.includes(user_id)) {
                    const body = JSON.stringify({ channel_id,user_id });
                    const result1 =await axios.post(url+"api/supportChannelData", body, configuration);
                    io.to(user_id).emit(emit_name, {company_id:data.company_id ,team_id:data.team_id,type:data.type,channel:result1.data.channel,hash:data.hash});
                }
            }
        }
        else if(channel_object.user_ids.length>0){
            for (let user_id of channel_object.user_ids){
                if (user_id != data.creator_id && !data.user_ids.includes(user_id)) {
                    const body = JSON.stringify({ channel_id,user_id });
                    const result1 =await axios.post(url+"api/supportChannelData", body, configuration);
                    io.to(user_id).emit(emit_name, {company_id:data.company_id ,team_id:data.team_id,type:data.type,channel:result1.data.channel,hash:data.hash});
                }
            }
        }
        else if(channel_object.team_ids.length>0){
            for (let team_id of channel_object.team_ids){
                const body = JSON.stringify({ team_id });
                const result =await axios.post(url+"api/get_team_member_ids", body, configuration);
                for(let user_id of result.data.users){
                    if (user_id != data.creator_id && !data.user_ids.includes(user_id)) {
                        const body = JSON.stringify({ channel_id,user_id });
                        const result1 =await axios.post(url+"api/supportChannelData", body, configuration);
                        io.to(user_id).emit(emit_name, {company_id:data.company_id ,team_id:data.team_id,type:data.type,channel:result1.data.channel,hash:data.hash});
                    }
                }
            }
        }
    }
}

const supportChannelUnarchived = async (channelTemp, io, resumeToken, hash) => {
    try {
        let channel_id = channelTemp._id.toString();
        let result;
        let creator_id = channelTemp.creator_id;
        if (channelTemp.public_option == false) {
            if (channelTemp.user_ids.length == 0) {
                let user_id = channelTemp.creator_id;
                const body = JSON.stringify({ user_id, channel_id });
                result = await axios.post(url + "api/supportChannelData", body, configuration);
                createChannelRoom(io, result.data);
                io.to(result.data.channel.creator_id).emit("supportChannelUnArchived", { company_id: result.data.company_id, team_id: result.data.team_id, type: result.data.type, channel: result.data.channel, channel_token: resumeToken, hash: hash });
            }
            else {
                channelTemp.user_ids.push(channelTemp.creator_id);
                for (let user_id of channelTemp.user_ids) {
                    const body = JSON.stringify({ channel_id, user_id });
                    result = await axios.post(url + "api/supportChannelData", body, configuration);
                    createChannelRoom(io, result.data);
                    io.to(user_id).emit("supportChannelUnArchived", { company_id: result.data.company_id, team_id: result.data.team_id, type: result.data.type, channel: result.data.channel, channel_token: resumeToken, hash: hash });
                };
            }
            channelTemp.hash = hash;
            await supportChannelDataObjectUpdate(channelTemp, io, "supportChannelUnArchived");
            (channelTemp.type == "support") && await channelUnArchiveEmitToSubAdminsForSupportChannels(channel_id, result, channelTemp, resumeToken, io, hash, creator_id);
        }
        else if (channelTemp.public_option == true)
            supportChannelInsertEmitInCaseOfPublic(channelTemp, io, resumeToken, hash, "supportChannelUnArchived");
    } catch (err) {
        sendWebhookError(err, "supportChannelUnarchived", channelTemp);
    }
}

// const channelUnarchiveEmitToDataObject= async(channelTemp,io,resumeToken, hash)=>{
//     let channel_id =data._id.toString();
//     for (let channel_object of channelTemp.data){
//         if(channel_object.user_ids==[] && channel_object.team_ids==[]){
//             let company_id = channel_object.company_id;
//             const body = JSON.stringify({ company_id });
//             const result =await axios.post(url+"api/get_company_member_ids", body, configuration);
//             for(let user_id of result.data.users){
//                 const body = JSON.stringify({ channel_id,user_id });
//                 const result1 =await axios.post(url+"api/supportChannelData", body, configuration);
//                 io.to(channel_object.user_id).emit("newSupportChannel", {company_id:channelTemp.company_id ,team_id:channelTemp.team_id,type:channelTemp.type,channel:result1.data.channel,channel_token:resumeToken,hash:hash});
//             }
//         }
//         else if(channel_object.user_ids!=[]){
//             for (let user_id of channel_object.user_ids){
//                 const body = JSON.stringify({ channel_id,user_id });
//                 const result1 =await axios.post(url+"api/supportChannelData", body, configuration);
//                 io.to(user_id).emit("newSupportChannel", {company_id:channelTemp.company_id ,team_id:channelTemp.team_id,type:channelTemp.type,channel:result1.data.channel,channel_token:resumeToken,hash:hash});
//             }
//         }
//         else if(channel_object.team_ids!=[]){
//             for (let team_id of channel_object.team_ids){
//                 const body = JSON.stringify({ team_id });
//                 const result =await axios.post(url+"api/get_team_member_ids", body, configuration);
//                 for(let user_id of result.data.users){
//                     const body = JSON.stringify({ channel_id,user_id });
//                     const result1 =await axios.post(url+"api/supportChannelData", body, configuration);
//                     io.to(channel_object.user_id).emit("newSupportChannel", {company_id:channelTemp.company_id ,team_id:channelTemp.team_id,type:channelTemp.type,channel:result1.data.channel,channel_token:resumeToken,hash:hash});
//                 }
//             }
//         }
//     }
// }

const supportChannelArchived = async (channelTemp, io, resumeToken, hash) => {
    let channel_id = channelTemp._id.toString();
    if (channelTemp.public_option == false) {
        io.to(channelTemp._id.toString()).emit("supportChannelArchived", { company_id: channelTemp.company_id, team_id: channelTemp.team_id, type: channelTemp.type, channel: { _id: channelTemp._id.toString(), name: channelTemp.name }, channel_token: resumeToken, hash: hash });
        await send_emit_to_users_who_access_this_channel(channelTemp, io, resumeToken, hash);
        for (let user_id of channelTemp.user_ids) {
            try {
                const body = JSON.stringify({ channel_id, user_id });
                const result = await axios.post(url + "api/supportChannelData", body, configuration);
                deleteChannelRoom(io, result.data);
            } catch (err) {
                sendWebhookError(err, "supportChannelArchived", channelTemp);
            }
        }
    }
    else if (channelTemp.public_option == true) {
        let body1 = JSON.stringify({ channel_id, attribute: "support_channel", operation: "update" });
        let result1 = await axios.post(url + "api/getSubAdmins", body1, configuration);
        result1.data.sub_admins.push(result1.data.admin);
        let body = JSON.stringify({});
        const result = await axios.post(url + "api/get_all_user_ids", body, configuration);
        for (let user_id of result.data.users) {
            if (!result1.data.sub_admins.includes(user_id)) {
                const body = JSON.stringify({ channel_id, user_id });
                const result = await axios.post(url + "api/supportChannelData", body, configuration);
                deleteChannelRoom(io, result.data);
                io.to(user_id).emit("supportChannelArchived", { company_id: channelTemp.company_id, team_id: channelTemp.team_id, type: channelTemp.type, channel: { _id: channelTemp._id.toString(), name: channelTemp.name }, channel_token: resumeToken, hash: hash });
            }
        }
    }
    await channelArchiveEmitToSubAdminsForSupportChannels(channel_id, channelTemp, resumeToken, io, hash);
}

const send_emit_to_users_who_access_this_channel = async (channelTemp, io, resumeToken, hash) => {
    let channel_id = channelTemp._id.toString();
    for (let channel_object of channelTemp.data) {
        if (channel_object.user_ids.length == 0 && channel_object.team_ids.length == 0) {
            let company_id = channelTemp.company_id;
            const body = JSON.stringify({ company_id });
            const result = await axios.post(url + "api/get_company_member_ids", body, configuration);
            console.log("send_emit_to_users_who_access_this_channel result is: ", result.data.users);
            for (let user_id of result.data.users) {
                if(!channelTemp.user_ids.includes(user_id)){
                    const body = JSON.stringify({ channel_id, user_id });
                    const result1 = await axios.post(url + "api/supportChannelData", body, configuration);
                    io.to(user_id).emit("supportChannelArchived", { company_id: channelTemp.company_id, team_id: channelTemp.team_id, type: channelTemp.type, channel: { _id: channelTemp._id.toString(), name: channelTemp.name }, channel_token: resumeToken, hash: hash });
                }
            }
        }
        else if (channel_object.user_ids.length > 0) {
            for (let user_id of channel_object.user_ids) {
                if(!channelTemp.user_ids.includes(user_id)){
                    const body = JSON.stringify({ channel_id, user_id });
                    const result1 = await axios.post(url + "api/supportChannelData", body, configuration);
                    io.to(user_id).emit("supportChannelArchived", { company_id: channelTemp.company_id, team_id: channelTemp.team_id, type: channelTemp.type, channel: { _id: channelTemp._id.toString(), name: channelTemp.name }, channel_token: resumeToken, hash: hash });
                }
            }
        }
        else if (channel_object.team_ids.length > 0) {
            for (let team_id of channel_object.team_ids) {
                const body = JSON.stringify({ team_id });
                const result = await axios.post(url + "api/get_team_member_ids", body, configuration);
                for (let user_id of result.data.users) {
                    if(!channelTemp.user_ids.includes(user_id)){
                        const body = JSON.stringify({ channel_id, user_id });
                        const result1 = await axios.post(url + "api/supportChannelData", body, configuration);
                        io.to(user_id).emit("supportChannelArchived", { company_id: channelTemp.company_id, team_id: channelTemp.team_id, type: channelTemp.type, channel: { _id: channelTemp._id.toString(), name: channelTemp.name }, channel_token: resumeToken, hash: hash });
                    }
                }
            }
        }
    }
}

/*
* This function sends the emit on channel name update.
* If channel type is direct then send channelNameUpdate emit to the user.
*   Call saveChannelEmits function to store the event for one minute.
* Otherwise send channelNameUpdate emit to channel room.
*   Call saveChannelEmits function to store the event for one minute.
*/
const channelNameUpdate = async (channelTemp, io, resumeToken, hash) => {
    try {
        if (channelTemp.type == "direct") {
            io.to(channelTemp.user_id).emit("channelNameUpdate", {
                channel: { name: channelTemp.name, _id: channelTemp._id },
                type: channelTemp.type,
                team_id: channelTemp.team_id,
                company_id: channelTemp.company_id,
                channel_token: resumeToken,
                hash: hash
            });

        }
        // else if(channelTemp.type == "support"){
        //     io.to(channelTemp._id.toString()).emit("channelNameUpdate", {
        //         channel:{name:channelTemp.name,_id: channelTemp._id},
        //         type:channelTemp.type,
        //         team_id:channelTemp.team_id,
        //         company_id:channelTemp.company_id,
        //         channel_token:resumeToken,
        //         hash:hash
        //     });
        // }
        else if (channelTemp.type == "public") {
            team_id = channelTemp.team_id;
            const body = JSON.stringify({ team_id });
            const result = await axios.post(url + "api/get_team_member_ids", body, configuration);
            for (let user_id of result.data.users) {
                io.to(user_id).emit("channelNameUpdate", {
                    channel: { name: channelTemp.name, _id: channelTemp._id },
                    type: channelTemp.type,
                    team_id: channelTemp.team_id,
                    company_id: channelTemp.company_id,
                    channel_token: resumeToken,
                    hash: hash
                });
            }
        }
        else {
            io.to(channelTemp._id.toString()).emit("channelNameUpdate", {
                channel: { name: channelTemp.name, _id: channelTemp._id },
                type: channelTemp.type,
                team_id: channelTemp.team_id,
                company_id: channelTemp.company_id,
                channel_token: resumeToken,
                hash: hash
            });
        }
    } catch (error) {

        sendWebhookError(error, "channelNameUpdate", channelTemp);
    }
}

/*
* This function sends the emit on channel archive.
* Send channelArchived emit to channel room.
* Call saveChannelEmits function to store the event for one minute.
* Call the api/channelData backend route using axios and store the response in a variable.
* Call deleteChannelRoom function.
*/
const channelArchived = async (channelTemp, io, resumeToken, hash) => {
    let channel_id = channelTemp._id.toString();
    // if(channelTemp.type=="query")
    //     io.to(channelTemp.company_id).emit("channelArchived", {company_id:channelTemp.company_id ,team_id:channelTemp.team_id,type:channelTemp.type,channel:{_id:channelTemp._id.toString(),name:channelTemp.name},channel_token:resumeToken,hash:hash});
    // else{
    if (channelTemp.type == "public") {
        team_id = channelTemp.team_id;
        const body = JSON.stringify({ team_id });
        const result = await axios.post(url + "api/get_team_member_ids", body, configuration);
        for (let user_id of result.data.users) {
            io.to(user_id).emit("channelArchived", { company_id: channelTemp.company_id, team_id: channelTemp.team_id, type: channelTemp.type, channel: { _id: channelTemp._id.toString(), name: channelTemp.name }, channel_token: resumeToken, hash: hash });
        }
        await channelArchiveEmitToSubAdminsForPublicChannel(channel_id, channelTemp, resumeToken, io, hash, result.data.users)
    }
    else {
        io.to(channelTemp._id.toString()).emit("channelArchived", { company_id: channelTemp.company_id, team_id: channelTemp.team_id, type: channelTemp.type, channel: { _id: channelTemp._id.toString(), name: channelTemp.name }, channel_token: resumeToken, hash: hash });
        for (let user_id of channelTemp.user_ids) {
            try {
                const body = JSON.stringify({ channel_id, user_id });
                const result = await axios.post(url + "api/channelData", body, configuration);
                deleteChannelRoom(io, result.data);
            } catch (err) {
                sendWebhookError(err, "channelArchived", channelTemp);
            }
        }
        channelTemp.type != "support" && await channelArchiveEmitToSubAdmins(channel_id, channelTemp, resumeToken, io, hash);
        // channelTemp.type=="support" && await channelArchiveEmitToSubAdminsForSupportChannels(channel_id, channelTemp, resumeToken, io, hash);
    }
    // }
}

/*
* This function sends the emit on channel un archive.
* If channel has no users then:
*   Call the api/channelData backend route using axios and store the response in a variable.
*   Call createChannelRoom function.
*   Send channelUnArchived emit to creator of the channel.
*   Call saveChannelEmits function to store the event for one minute.
* Otherwise for each user of channel:
*   Call the api/channelData backend route using axios and store the response in a variable.
*   Call createChannelRoom function.
*   Send channelUnArchived emit to creator of the channel.
*   Call saveChannelEmits function to store the event for one minute.
* Call channelUnarchiveEmitForPublicPrivateChannels function.
* Call channelUnArchiveEmitToSubAdmins function.
*/
const channelUnarchived = async (channelTemp, io, resumeToken, hash) => {
    try {
        let channel_id = channelTemp._id.toString();
        let result;
        let creator_id = null;
        if (channelTemp.user_ids.length == 0) {
            const body = JSON.stringify({ channel_id });
            result = await axios.post(url + "api/channelData", body, configuration);
            createChannelRoom(io, result.data);
            creator_id = result.data.channel.creator_id;
            if (channelTemp.type == "query")
                io.to(channelTemp.company_id).emit("channelUnArchived", { company_id: channelTemp.company_id, team_id: channelTemp.team_id, type: channelTemp.type, channel: result.data.channel, channel_token: resumeToken, hash: hash });
            else
                io.to(result.data.channel.creator_id).emit("channelUnArchived", { company_id: result.data.company_id, team_id: result.data.team_id, type: result.data.type, channel: result.data.channel, channel_token: resumeToken, hash: hash });
        }
        else {
            for (let user_id of channelTemp.user_ids) {
                const body = JSON.stringify({ channel_id, user_id });
                result = await axios.post(url + "api/channelData", body, configuration);
                createChannelRoom(io, result.data);
                // if(channelTemp.type!="query")
                io.to(user_id).emit("channelUnArchived", { company_id: result.data.company_id, team_id: result.data.team_id, type: result.data.type, channel: result.data.channel, channel_token: resumeToken, hash: hash });
            };
            // if(channelTemp.type=="query"){
            //     const body = JSON.stringify({ company_id:channelTemp.company_id });
            //     result =await axios.post(url+"api/get_company_member_ids", body, configuration);
            //     for (let user_id of result.data.users) {
            //         const body = JSON.stringify({ channel_id,user_id });
            //         result =await axios.post(url+"api/channelData", body, configuration);
            //         io.to(user_id).emit("channelUnArchived", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken,hash:hash});
            //     }
            // }
        }
        (channelTemp.type != "support") && await channelUnarchiveEmitForPublicPrivateChannels(channel_id, result, io, channelTemp, resumeToken, hash);
        (channelTemp.type != "support") && await channelUnArchiveEmitToSubAdmins(channel_id, result, channelTemp, resumeToken, io, hash, creator_id);
        // (channelTemp.type =="support") && await channelUnArchiveEmitToSubAdminsForSupportChannels(channel_id, result, channelTemp, resumeToken, io, hash, creator_id);
    } catch (err) {
        sendWebhookError(err, "channelUnarchived", channelTemp);
    }
}

/*
* This function sends the emit on directChannelJoin.
* If no clients found return true.
* Otherwise For each client:
* Get client socket id.
* Join the channel room.
*/
const directChannelJoin = (io, data) => {
    try {
        let clients = io.sockets.adapter.rooms.get(data.user_id);
        if (!clients)
            return true;
        for (const clientId of clients) {
            let clientSocket = io.sockets.sockets.get(clientId);
            clientSocket.join(data._id.toString());
        }
    } catch (error) {

        sendWebhookError(error, "directChannelJoin", data);
    }
}

const channelArchiveEmitToSubAdmins = async (channel_id, channelTemp, resumeToken, io, hash) => {
    let body1 = JSON.stringify({ channel_id, attribute: "channel", operation: "update" });
    let result1 = await axios.post(url + "api/getSubAdmins", body1, configuration);
    var result_data = null;
    result1.data.sub_admins.push(result1.data.admin);
    for (let user_id of result1.data.sub_admins) {
        try {
            if (!channelTemp.user_ids.includes(user_id) || channelTemp.public_option==true) {
                let body2 = JSON.stringify({ channel_id, user_id });
                result_data = await axios.post(url + "api/channelData", body2, configuration);
                io.to(user_id).emit("channelArchived", { company_id: channelTemp.company_id, team_id: channelTemp.team_id, type: channelTemp.type, channel: result_data.data.channel, channel_token: resumeToken, hash: hash });
            }
        } catch (err) {
            sendWebhookError(err, "channelArchiveEmitToSubAdmins", channelTemp);
        }
    }
}

const channelArchiveEmitToSubAdminsForSupportChannels = async (channel_id, channelTemp, resumeToken, io, hash) => {
    let body1 = JSON.stringify({ channel_id, attribute: "support_channel", operation: "update" });
    let result1 = await axios.post(url + "api/getSubAdmins", body1, configuration);
    var result_data = null;
    result1.data.sub_admins.push(result1.data.admin);
    for (let user_id of result1.data.sub_admins) {
        try {
            if (!channelTemp.user_ids.includes(user_id) || channelTemp.public_option==true) {
                let body2 = JSON.stringify({ channel_id, user_id });
                result_data = await axios.post(url + "api/supportChannelData", body2, configuration);
                io.to(user_id).emit("supportChannelArchived", { company_id: channelTemp.company_id, team_id: channelTemp.team_id, type: channelTemp.type, channel: result_data.data.channel, channel_token: resumeToken, hash: hash });
            }
        } catch (err) {
            sendWebhookError(err, "channelArchiveEmitToSubAdmins", channelTemp);
        }
    }
}

const channelArchiveEmitToSubAdminsForPublicChannel = async (channel_id, channelTemp, resumeToken, io, hash, team_users) => {
    let body1 = JSON.stringify({ channel_id, attribute: "channel", operation: "update" });
    let result1 = await axios.post(url + "api/getSubAdmins", body1, configuration);
    var result_data = null;
    result1.data.sub_admins.push(result1.data.admin);
    for (let user_id of result1.data.sub_admins) {
        try {
            if (!channelTemp.user_ids.includes(user_id) && !team_users.includes(user_id)) {
                let body2 = JSON.stringify({ channel_id, user_id });
                result_data = await axios.post(url + "api/channelData", body2, configuration);
                io.to(user_id).emit("channelArchived", { company_id: channelTemp.company_id, team_id: channelTemp.team_id, type: channelTemp.type, channel: result_data.data.channel, channel_token: resumeToken, hash: hash });
            }
        } catch (err) {
            sendWebhookError(err, "channelArchiveEmitToSubAdmins", channelTemp);
        }
    }
}

/*
* This function is used to send channel un archive emit to sub admins. 
* Call api/getSubAdmins backend route using axios to find the sub admins.
* Also push admin in sub_admins array.
* If sub_admin is a member of channel then do not send emit.
* Otherwise for each sub admin.
*   Call api/channelData backend route using axios.
*   Call createChannelRoom function.
*   Send channelUnArchived emit to sub admin.
*   Call saveChannelEmits function to store the event for one minute.
*/
const channelUnArchiveEmitToSubAdmins = async (channel_id, result, channelTemp, resumeToken, io, hash, creator_id) => {
    let body1 = JSON.stringify({ channel_id, attribute: "channel", operation: "update" });
    let result1 = await axios.post(url + "api/getSubAdmins", body1, configuration);
    let result_data = null;
    result1.data.sub_admins.push(result1.data.admin);
    for (let user_id of result1.data.sub_admins) {
        try {
            console.log("user_id is: ", user_id);
            console.log("creator_id is: ", creator_id);
            if (user_id != creator_id && (channelTemp.type != "public" && !channelTemp.user_ids.includes(user_id)) || (channelTemp.type == "public" && !channelTemp.user_ids.includes(user_id))) {
                body = JSON.stringify({ channel_id, user_id });
                result_data = await axios.post(url + "api/channelData", body, configuration);
                io.to(user_id).emit("channelUnArchived", { company_id: result.data.company_id, team_id: result.data.team_id, type: result.data.type, channel: result.data.channel, channel_token: resumeToken, hash: hash });
            }
        } catch (err) {
            sendWebhookError(err, "channelUnArchiveEmitToSubAdmins", channelTemp);
        }
    }
}

const channelUnArchiveEmitToSubAdminsForSupportChannels = async (channel_id, result, channelTemp, resumeToken, io, hash, creator_id) => {
    let body1 = JSON.stringify({ channel_id, attribute: "support_channel", operation: "update" });
    let result1 = await axios.post(url + "api/getSubAdmins", body1, configuration);
    let result_data = null;
    result1.data.sub_admins.push(result1.data.admin);
    for (let user_id of result1.data.sub_admins) {
        try {
            console.log("user_id is: ", user_id);
            console.log("creator_id is: ", creator_id);
            if (user_id != creator_id && !channelTemp.user_ids.includes(user_id)) {
                body = JSON.stringify({ channel_id, user_id });
                result_data = await axios.post(url + "api/supportChannelData", body, configuration);
                io.to(user_id).emit("supportChannelUnArchivedForNonMember", { company_id: result.data.company_id, team_id: result.data.team_id, type: result.data.type, channel: result.data.channel, channel_token: resumeToken, hash: hash });
            }
        } catch (err) {
            sendWebhookError(err, "channelUnArchiveEmitToSubAdmins", channelTemp);
        }
    }
}

/*
* This function is used to send channel un archive emit in case of public and private channels.
* Call the api/channelData backend route using axios and store the response in a variable.
* If channel type is public then : 
*   Set new_message_count to 0, joined to false, muted to false and pinned to false.
*   Send publicChannelUnArchived emit to team id of channel.
*   Call saveChannelEmits function to store the event for one minute.
*/
const channelUnarchiveEmitForPublicPrivateChannels = async (channel_id, result, io, channelTemp, resumeToken, hash) => {
    try {
        if (channelTemp.type == 'public') {
            let body = JSON.stringify({ channel_id, admin: true });
            result = await axios.post(url + "api/channelData", body, configuration);
            result.data.channel.new_message_count = 0;
            result.data.channel.joined = false;
            result.data.channel.muted = false;
            result.data.channel.pinned = false;
            result.data.channel.messages = [];
            result.data.channel.thread_child_messages = [];
            team_id = channelTemp.team_id;
            const body2 = JSON.stringify({ team_id });
            const result2 = await axios.post(url + "api/get_team_member_ids", body2, configuration);
            let body1 = JSON.stringify({ channel_id, attribute: "channel", operation: "update" });
            let result1 = await axios.post(url + "api/getSubAdmins", body1, configuration);
            result1.data.sub_admins.push(result1.data.admin);
            for (let user_id of result2.data.users) {
                if (!channelTemp.user_ids.includes(user_id) && !result1.data.sub_admins.includes(user_id)) {
                    io.to(user_id).emit("publicChannelUnArchived", { company_id: result.data.company_id, team_id: result.data.team_id, type: result.data.type, channel: result.data.channel, channel_token: resumeToken, hash: hash });
                }
            }
        }
        // else if(channelTemp.type=='private'){
        //     if(!channelTemp.user_ids.includes(result.admin_id)){
        //         io.to(channelTemp.creator_id).emit("deleteChannel", {company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken});
        //         saveChannelEmits({company_id:result.data.company_id,team_id:result.data.team_id,type:result.data.type,channel:result.data.channel,channel_token:resumeToken,emit_to:channelTemp.creator_id,emit_name:"deleteChannel"});
        //     }
        // }
    } catch (error) {

        sendWebhookError(error, "channelUnarchiveEmitForPublicPrivateChannels", channelTemp);
    }
}

/*
* This function is used to send emit on channel insertion in case of public and direct channels.
* If channel type is public then:
*   Set new_message_count to 0, joined to false, muted to false and pinned to false.
*   Send newPublicChannel emit to team id of channel.
*   Call saveChannelEmits function to store the event for one minute.
* Otherwise if channel type is direct and user is not the creator of the channel then:
*   Call directChannelJoin function.
*   Send newDirectChannel emit to user.
*   Set name of the channel to the other user name in case of direct channel so that the direct channel name shown to user the the name of the other user
*   Call saveChannelEmits function to store the event for one minute.
*/
const channelInserEmitInCaseOfPublicDirectChannels = (result, channelTemp, io, resumeToken, hash) => {
    try {
        let resultClone = JSON.parse(JSON.stringify(result.data));
        if (channelTemp.type == 'public') {
            resultClone.channel.new_message_count = 0;
            resultClone.channel.joined = false;
            resultClone.channel.muted = false;
            resultClone.channel.pinned = false;
            io.to(channelTemp.team_id).emit("newPublicChannel", { company_id: resultClone.company_id, team_id: resultClone.team_id, type: resultClone.type, channel: resultClone.channel, channel_token: resumeToken, hash: hash });
        }
        else if (channelTemp.type == 'direct' && channelTemp.user_id != channelTemp.creator_id) {
            directChannelJoin(io, channelTemp);
            resultClone.channel.name = channelTemp.name;
            io.to(channelTemp.user_id).emit("newDirectChannel", { company_id: resultClone.company_id, team_id: resultClone.team_id, type: resultClone.type, channel: resultClone.channel, channel_token: resumeToken, hash: hash });
        }
    } catch (error) {

        sendWebhookError(error, "channelInserEmitInCaseOfPublicDirectChannels", channelTemp);
    }
}
module.exports = {
    createChannelRoom,
    deleteChannelRoom,
    channelInsert,
    supportChannelInsert,
    channelNameUpdate,
    channelUnarchived,
    channelArchived,
    createPublicPrivateChannelRoom,
    deletePublicPrivateChannelRoom,
    channelArchiveEmitToSubAdminsForPublicChannel,
    channelArchiveEmitToSubAdminsForSupportChannels,
    channelUnArchiveEmitToSubAdminsForSupportChannels,
    supportChannelDataObjectUpdate,
    supportChannelUnarchived,
    supportChannelArchived,
};
