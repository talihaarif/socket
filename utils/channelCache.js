let ids = [];

const addIds = (data) => {
    ids.push(data);
    console.log("add",data);
};

const removeIds = (id) => {
    ids = ids.filter((el) => {
        return el.channel_id != id;
    });
};

const checkIds = (id) => {
    const channelDetails = ids.find((x) => x.channel_id == id);
    console.log("check",channelDetails);
    if (channelDetails) {
        return channelDetails;
    }
    return false;
};

module.exports = {
    addIds,
    removeIds,
    checkIds
};