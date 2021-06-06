var exec =  require('child_process').exec;


  /*
  * This function is used to send a webhook message in case of server error in node sockets.
  * If server error has data then set error data in body because it is in the case of error from backend in node while calling any backend route.
  * Otherwise set error message in case of server error from node.
  * Call the backend webhook route using axios.
  */
  const sendWebhookError = async(error, path=null, body_data=null) => {
    try {
        if (error && error.response && error.response.data)
            errorMessage =  error.response.data;
        else
            errorMessage = error;
        let data = {
            "attachments": [
                {
                    "fallback": "Node JS Server 2",
                    "color": "#ff0000",
                    "text": errorMessage,
                    "title": "Message",
                    "fields": [
                        {
                            "short": false,
                            "title": "path",
                            "value": path
                        },

                        {
                            "short": false,
                            "title": "Time Stamp",
                            "value": new Date()
                        },

                        {
                            "short": false,
                            "title": "Source",
                            "value": body_data
                        },

                        {
                            "short": false,
                            "title": "Stack",
                            "value": JSON.stringify(error.stack, Object.getOwnPropertyNames(error))
                        }
                    ]
                }
            ]
        }
        exec("curl -i -X POST -H 'Content-Type: application/json' -d" + `'${JSON.stringify(data)}'` + " " + `"https://newchat.pf.com.pk/hooks/516rb5jcwjy49gj6srauqtoi6a"`, (error, stdout, stderr) => {
            if (error) return
            if (stderr) return
            console.log(`stdout: ${stdout}`)
        })
        // let body = '';
        // if (error && error.response && error.response.data)
        //     body = JSON.stringify({ "error": serializeError(error),"data": error.response.data, "function":route, "function_data":JSON.stringify(function_data)});
        // else
        //     body = JSON.stringify({"error":serializeError(error), "function":route, "function_data":JSON.stringify(function_data)});      
        // const result = await axios.post("https://newchat.pf.com.pk/hooks/516rb5jcwjy49gj6srauqtoi6a", body, configuration);
    } catch (err) {
        console.log(err);
    }
};

module.exports = {
    sendWebhookError
};