const { sendWebhookError } = require("../utils/webhook");
let ids = [];

/*
* This function is used to push data in ids array.
*/
const addIds = (data) => {
    try{
        ids.push(data);
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "addIds", data);
    }
};

/*
* This function updates the ids array.
*/
const removeIds = (id) => {
    try{
        ids = ids.filter((el) => {   
            return el.channel_id != id;
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "removeIds", id);
    }
};

/*
* This function checks id in ids array if it is found then return it.
*/
const checkIds = (id) => {
    try{
        const channelDetails = ids.find((x) => x.channel_id == id);
        if (channelDetails) {
            return channelDetails;
        }
        return false;
    } catch (error) {
        console.log(error);
        sendWebhookError(error, "checkIds", id);
    }
};

module.exports = {
    addIds,
    removeIds,
    checkIds
};