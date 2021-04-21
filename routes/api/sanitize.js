const expess = require("express");
const sanitizeHtml = require('sanitize-html');
const router = expess.Router();


router.post("/sanitizeMessage", async (req, res) => {
    try{
        let html = req.body;
        printList(html);
        return res.json(html);
    } catch(err) {
        console.log(err);
        return res.json({message: err});
    } 

});

function printList(items) {
    Object.keys(items).map(k => {
        if(items[k]==null)
            console.log(items[k]);
        else if(typeof items[k] == 'string' || typeof items[k] == 'integer' ){
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
