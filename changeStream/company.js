const { companyInsert } = require("../utils/company");
const { saveCompanyEmits } = require("../utils/emitQueue");
const company = (conn, io) => {
    /*
    Connection with database for listening to changes
    */
    const company = conn
        .collection("companies")
        .watch({ fullDocument: "updateLookup" });

    console.log("Company change stream running");

    /*
    ---Listening to company Table---
    Case update:
    one case is handel in update operation 
    of company table.
    1) If company name is changed then the emit is send
    to the company_id.
    */
    company.on("change", async (change) => {
        let companyTemp = change.fullDocument;
        switch (change.operationType) {
            case "insert":
                companyInsert(companyTemp,io,change._id);
                break;
            case "update":
                let companyUpdateCheck = change.updateDescription.updatedFields;
                if (companyUpdateCheck.name) {
                    io.to(companyTemp._id.toString()).emit(
                        "companyNameChange",{company_id:companyTemp._id,name:companyTemp.name,company_token:change._id}
                    );
                    saveCompanyEmits({company_id:companyTemp._id,name:companyTemp.name,company_token:change._id,emit_to:companyTemp._id.toString(),emit_name:"companyNameChange"});

                } else if(companyUpdateCheck.delete_file_after){
                    io.to(companyTemp._id.toString()).emit("deleteFileTimeChange",{company_id:companyTemp._id,delete_file_after:companyTemp.delete_file_after,company_token:change._id});
                    saveCompanyEmits({company_id:companyTemp._id,delete_file_after:companyTemp.delete_file_after,company_token:change._id,emit_to:companyTemp._id.toString(),emit_name:"deleteFileTimeChange"});
                } else if(companyUpdateCheck.shareable_link === true || companyUpdateCheck.shareable_link === false){
                    io.to(companyTemp._id.toString()).emit("shareAbleLinkChange",{company_id:companyTemp._id,shareable_link:companyTemp.shareable_link,company_token:change._id});
                    saveCompanyEmits({company_id:companyTemp._id,shareable_link:companyTemp.shareable_link,company_token:change._id,emit_to:companyTemp._id.toString(),emit_name:"shareAbleLinkChange"});
                } else if(companyUpdateCheck.two_fa){
                    io.to(companyTemp._id.toString()).emit("companyTwoFaChange",{company_id:companyTemp._id,two_fa:companyTemp.two_fa,company_token:change._id});
                    saveCompanyEmits({company_id:companyTemp._id,two_fa:companyTemp.two_fa,company_token:change._id,emit_to:companyTemp._id.toString(),emit_name:"companyTwoFaChange"});
                } else if(companyUpdateCheck.ip_status){
                    io.to(companyTemp._id.toString()).emit("ipStatusChange",{company_id:companyTemp._id,ip_status:companyTemp.ip_status,company_token:change._id});
                    saveCompanyEmits({company_id:companyTemp._id,ip_status:companyTemp.ip_status,company_token:change._id,emit_to:companyTemp._id.toString(),emit_name:"ipStatusChange"});
                } else if(companyUpdateCheck.ips){
                    io.to(companyTemp._id.toString()).emit("ipsChange",{company_id:companyTemp._id,ips:companyTemp.ips,company_token:change._id});
                    saveCompanyEmits({company_id:companyTemp._id,ips:companyTemp.ips,company_token:change._id,emit_to:companyTemp._id.toString(),emit_name:"ipsChange"});
                }

                break;
        }
    });
};

module.exports = company;