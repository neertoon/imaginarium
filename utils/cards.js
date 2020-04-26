const path = require('path');
const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);
const readDir = util.promisify(fs.readdir);
const rename = util.promisify(fs.rename);
const fileUpload = require('express-fileupload');
const unzip = require('unzip');
const { Readable } = require('stream');
const imagesPath = 'utils/cardImages/';

async function loadCardsListFromDirectory() {
    const result = [];
    files = await readDir(imagesPath);

    files.forEach(function (file) {
        result.push(file); 
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

function shuffle(cards){
    var currentIndex = cards.length, temporaryValue, randomIndex;

    while (0 !== currentIndex) {
    
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
    
        // And swap it with the current element.
        temporaryValue = cards[currentIndex];
        cards[currentIndex] = cards[randomIndex];
        cards[randomIndex] = temporaryValue;
    }
}


async function insertCardPackMethod(req, res){
    try {
        if(!req.files) {
            res.send({
                status: false,
                message: 'No file uploaded'
            });
        } else {
            //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
            let zippack = req.files.zippack;
            const readable = new Readable()
           // readable._read = () => {}; // _read is required but you can noop it
            readable.push(zippack.data);
            readable.push(null);

            const tempDir = 'utils/tempUpload/';
            if (fs.existsSync(tempDir)){
                fs.rmdirSync(tempDir, { recursive: true });
            }
            fs.mkdirSync(tempDir);
            
            readable.pipe(unzip.Extract({ path: tempDir }));

            let newFiles = await readDir(tempDir);
            const newFileNames = [];
            newFiles.forEach(function (file) {
                newFileNames.push(file); 
            });
            let existingCards = await loadCardsListFromDirectory();
            let duplicatesList = [];
            for(let i = 0; i < newFileNames.length; i++){
                if(existingCards.includes(newFileNames[i]))
                    duplicatesList.push(newFileNames[i]);
                else
                {
                    await rename('utils/tempUpload/' + newFileNames[i], imagesPath + newFileNames[i]);
                }
            }

            fs.rmdirSync(tempDir);
            
            //send response
            res.send({
                status: true,
                message: 'File is uploaded. Pomiete duplikaty: ' + duplicatesList.join(", ")
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
 }


module.exports = {loadCardsListFromDirectory, imagePathToBase64, shuffle, insertCardPackMethod};