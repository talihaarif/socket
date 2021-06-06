const { default: axios } = require("axios");
const {serializeError} = require('serialize-error');

// Declare configuration variable to store headers which will be send with axios requests.
const configuration = {
    headers: {
        "Content-Type": "application/json",
        "token": "MyNodeToken"
    },
};

  /*
  * This function is used to send a webhook message in case of server error in node sockets.
  * If server error has data then set error data in body because it is in the case of error from backend in node while calling any backend route.
  * Otherwise set error message in case of server error from node.
  * Call the backend webhook route using axios.
  */
  const sendWebhookError = async(error, route, function_data=null) => {
    try {
        let body = '';
        if (error && error.response && error.response.data)
            body = JSON.stringify({ "error": serializeError(error),"data": error.response.data, "function":route, "function_data":JSON.stringify(function_data)});
        else
            body = JSON.stringify({"error":serializeError(error), "function":route, "function_data":JSON.stringify(function_data)});      
        const result = await axios.post("https://newchat.pf.com.pk/hooks/516rb5jcwjy49gj6srauqtoi6a", body, configuration);
    } catch (err) {
        console.log(err);
    }
};

module.exports = {
    sendWebhookError
};