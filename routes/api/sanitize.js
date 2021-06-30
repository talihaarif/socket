const expess = require("express");
const sanitizeHtml = require('sanitize-html');
const router = expess.Router();
const { sendWebhookError } = require("../../utils/webhook");



router.post("/sanitizeMessage", async (req, res) => {
    try{
        let html = req.body;
        printList(html);
        return res.json(html);
    } catch(err) {
        sendWebhookError(error, "/sanitizeMessage", req);
        return res.json({message: err});
    } 

});

function printList(items) {
    Object.keys(items).map(k => {
        if(items[k]==null)
            console.log(items[k]);
        else if(typeof items[k] == 'string' || typeof items[k] == 'integer' ){
            console.log(items[k].length);
            if(typeof items[k] == 'string' && items[k].length > 80000)
                items[k]=items[k].substring(0, 80000) + '...';
            console.log(items[k].length);
            items[k]=sanitizeHtml(items[k],{allowedAttributes: {
                'span': [ 'class','data-mention-id' ],
                'a':['href','target','rel']
            },});
        }
        else if (typeof items[k] === "object") {
            printList(items[k]);
            return;
        }
    });
    
}


module.exports = router;
