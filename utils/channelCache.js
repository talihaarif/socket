let ids = [];

const addIds = (data) => {
    ids.push(data);
};

const removeIds = (id) => {
    ids = ids.filter((el) => {
        return el.channel_id != id;
    });
};

const checkIds = (id) => {
    const channelDetails = ids.find((x) => x.channel_id == id);
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