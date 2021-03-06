const { find } = require("../model/Token");
const Token = require("../model/Token");
const { sendWebhookError } = require("../utils/webhook");

let token = [];

/*
Get all the token from database and
and save them in token array to verify the
user before opening connection with sockets
*/
const getAllToken = async() => {
    try {
        token = await Token.find();
    } catch (error) {
        sendWebhookError(error, "getAllToken");
    }
};

/*
if any new token is added in token table then
that token is also saved token array.
*/
const addToken = (data) => {
    try{
        token.push(data);
    } catch (error) {
        sendWebhookError(error, "addToken", data);
    }
};
/*
if any new token is removed in token table then
that token is also removed in token array.
*/
const removeToken = (id) => {
    try{
        token = token.filter((el) => {
            return el._id != id;
        });
    } catch (error) {
        sendWebhookError(error, "removeToken", id);
    }
};

/*
This Function check if the token passed from 
user to make connection is valid or not.
*/
const checkToken = (data) => {
    try{
        const a = token.find((x) => x.token == data.token);
        if (a) {
            return true;
        }
        return false;
    } catch (error) {
        sendWebhookError(error, "checkToken", data);
    }
};

module.exports = {
    getAllToken,
    checkToken,
    addToken,
    removeToken,
};