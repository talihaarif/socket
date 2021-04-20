const expess = require("express");
const sanitizeHtml = require('sanitize-html');
const router = expess.Router();


router.post("/sanitizeMessage", async (req, res) => {
    try{
        let html = req.body;
        // console.log(html)
        printList(html);
        // req.body.message = sanitizeHtml(req.body.message,{allowedAttributes: {
        //     'span': [ 'class','data-mention-id' ]
        // },});
        // req.body.abc = sanitizeHtml(req.body.abc,{allowedAttributes: {
        //     'span': [ 'class','data-mention-id' ]
        // },});
        // console.log(req.body.message);
        // console.log(req.body.abc);

        // return res.json(req.body);
        return res.json(html);
    } catch(err) {
        console.log(err);
        return res.json({message: err});
    } 

});

function printList(items) {
    //map keys of the object
    // console.log("Object",items);
    let a='';
    Object.keys(items).map(k => {
        if(items[k]==null)
            console.log(items[k]);
        else if(typeof items[k] == 'string' || typeof items[k] == 'integer' ){
            items[k]=sanitizeHtml(items[k],{allowedAttributes: {
                'span': [ 'class','data-mention-id' ]
            },});
            console.log("String",items[k]);
        }
        else if (typeof items[k] === "object") {
            printList(items[k]);
            return;
        }
    });
    
}


module.exports = router;
