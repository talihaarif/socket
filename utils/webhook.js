const { default: axios } = require("axios");
const configuration = {
    headers: {
        "Content-Type": "application/json",
        "token": "MyNodeToken"
    },
};

const sendWebhookError = async(error) => {
    try {
        let body = '';
        console.log('webhook');
        // console.log(error.response.data);
        if (error && error.response && error.response.data)
            body = JSON.stringify({ "error": error.response.data });
        else
            body = JSON.stringify(error.message);
        // console.log(body);        
        const result = await axios.post("https://schat.pf.com.pk/api/webhooks/60781aaf52876b510f1f772e", body, configuration);
    } catch (err) {
        console.log(err);
    }
};

module.exports = {
    sendWebhookError
};