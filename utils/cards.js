const path = require('path');
const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);
const readDir = util.promisify(fs.readdir);
const rename = util.promisify(fs.rename);
const unlink = util.promisify(fs.unlink);
const fileUpload = require('express-fileupload');
const admZip = require('adm-zip');
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
        if(!req.files.zippack.data) {
            res.send({
                status: false,
                message: 'No file uploaded, Use "zippack" post data element'
            });
        } else {
            const tempDir = 'utils/tempUpload/';
            if (fs.existsSync(tempDir)){
                fs.rmdirSync(tempDir, { recursive: true });
            }
            fs.mkdirSync(tempDir);
            let zip = new admZip(req.files.zippack.data);
            zip.extractAllTo(tempDir);

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
            fs.rmdirSync(tempDir, { recursive: true });
            
            //send response
            res.send({
                status: true,
                message: 'Pliki załądowany. Pominięte duplikaty: ' + duplicatesList.join(", ")
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
 }

 async function clearAllCardsMethod(req, res){
    try {
        let existingCards = await loadCardsListFromDirectory();
        for(const file of files){
            await unlink(imagesPath + file);
        }
        res.send({
            status: true,
            message: 'WYCZYSZCZONO!'
        });
        
    } catch (err) {
        res.status(500).send(err);
    }
 }


module.exports = {loadCardsListFromDirectory, imagePathToBase64, shuffle, insertCardPackMethod, clearAllCardsMethod};