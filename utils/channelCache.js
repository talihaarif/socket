const { sendWebhookError } = require("../utils/webhook");
let ids = [];

const addIds = (data) => {
    try{
        ids.push(data);
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
};

const removeIds = (id) => {
    try{
        ids = ids.filter((el) => {
            return el.channel_id != id;
        });
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
};

const checkIds = (id) => {
    try{
        const channelDetails = ids.find((x) => x.channel_id == id);
        if (channelDetails) {
            return channelDetails;
        }
        return false;
    } catch (error) {
        console.log(error);
        sendWebhookError(error);
    }
};

module.exports = {
    addIds,
    removeIds,
    checkIds
};