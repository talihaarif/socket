const { companyInsert, companyFileStatusUpdate, companyFileIpsUpdate } = require("../utils/company");
const { sendWebhookError } = require("../utils/webhook");
const { createHash } = require("../utils/hash");

const company = (conn, io) => {
    /*
    Connection with database for listening to changes
    */
    const company = conn
        .collection("companies")
        .watch({ fullDocument: "updateLookup" });

    console.log("Company change stream running");

    /*
    When any changes occurs in companies table then this change event function runs and return 
    an object which contain an object containing all the details of the document that is created,
    updated or deleted.
    1) If new document is created then change operation type is insert.
        a) In insert companyInsert Function is called.
    2) If any document is updated then change operation type is update.
        a) if company name is changed then an emit is send to the company room.
        b) if company deleteFileTimeChange then an emit is send to the company room.
        c) if company shareAbleLinkChange then an emit is send to the company room.
        d) if company companyTwoFaChange then an emit is send to the company room.
        e) if company ipStatusChange then an emit is send to the company room.
        f) if company ipsChange then an emit is send to the company room.
    After any emit is send then saveCompanyEmits function is called to store the event for one minute.
    */
    company.on("change", async (change) => {
        try{
        let companyTemp = change.fullDocument;
        let hash = createHash(companyTemp.created_at,change);
        switch (change.operationType) {
            case "insert":
                await companyInsert(companyTemp,io,change._id, hash);
                break;
            case "update":
                let companyUpdateCheck = change.updateDescription.updatedFields;
                if (companyUpdateCheck.name) {
                    io.to(companyTemp._id.toString()).emit(
                        "companyNameChange",{company_id:companyTemp._id,name:companyTemp.name,company_token:change._id,hash:hash}
                    );
                } else if(companyUpdateCheck.delete_file_after){
                    io.to(companyTemp._id.toString()).emit("deleteFileTimeChange",{company_id:companyTemp._id,delete_file_after:companyTemp.delete_file_after,company_token:change._id,hash:hash});
                } else if(companyUpdateCheck.shareable_link === true || companyUpdateCheck.shareable_link === false){
                    io.to(companyTemp._id.toString()).emit("shareAbleLinkChange",{company_id:companyTemp._id,shareable_link:companyTemp.shareable_link,company_token:change._id,hash:hash});
                } else if(companyUpdateCheck.two_fa || companyUpdateCheck.two_fa === false){
                    io.to(companyTemp._id.toString()).emit("companyTwoFaChange",{company_id:companyTemp._id,two_fa:companyTemp.two_fa,company_token:change._id,hash:hash});
                } else if(companyUpdateCheck.ip_status===true || companyUpdateCheck.ip_status===false){
                    io.to(companyTemp._id.toString()).emit("ipStatusChange",{company_id:companyTemp._id,ip_status:companyTemp.ip_status,company_token:change._id,hash:hash});
                } else if(companyUpdateCheck.ips){
                    io.to(companyTemp._id.toString()).emit("ipsChange",{company_id:companyTemp._id,ips:companyTemp.ips,company_token:change._id,hash:hash});
                } else if(companyUpdateCheck.file_status===true || companyUpdateCheck.file_status===false){
                    companyFileStatusUpdate(companyTemp,io,change._id, hash);
                } else if(companyUpdateCheck.file_ips){
                    companyFileIpsUpdate(companyTemp,io,change._id, hash);
                }
                break;
        }
    } catch (error) {
        sendWebhookError(error, "company change stream", change);
    }
    });
};

module.exports = company;