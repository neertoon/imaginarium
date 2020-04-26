
const path = require('path');
const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);

function loadCardsListFromDirectory(imagesPath) {
    const result = [];
    fs.readdir(imagesPath, function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        } 
        files.forEach(function (file) {
            result.push(file); 
        });
    });
    return result;
}

async function imagePathToBase64(filePath){
   let result;
   let data = await readFile(filePath);
       
   let extensionName = path.extname(filePath);
   
   let base64Image = Buffer.from(data, 'binary').toString('base64');
   
   result = `data:image/${extensionName.slice(1)};base64,${base64Image}`;
   
   return result;
}


module.exports = {loadCardsListFromDirectory, imagePathToBase64};