var hash = require('object-hash');


const createHash=(created_at,change)=>{
    let date = Math.floor(new Date(created_at).getTime()/1000);
    let objHash=hash(change, { algorithm: 'md5', encoding: 'base64' });
    return date + '_' + objHash;
};

module.exports = {
    createHash
}