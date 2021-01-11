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
                message: 'No file uploaded, Use "zippack" post form-data element'
            });
        } else {
            let zip = new admZip(req.files.zippack.data);
            if(!fs.existsSync(imagesPath)){
                fs.mkdirSync(imagesPath);
            }
            let existingCards = await loadCardsListFromDirectory();
            let duplicatesList = [];
            zip.getEntries().forEach(zipEntry => {
                const entryName = zipEntry.name;
                if(existingCards.includes(entryName))
                    duplicatesList.push(entryName);
                else
                    zip.extractEntryTo(entryName, imagesPath, false);
            });
            res.send({
                status: true,
                message: 'Plik załadowany. ' + ( duplicatesList.length > 0 ? ('Pominięte duplikaty: ' + duplicatesList.join(", ")) : '')
            });
        }
    } catch (err) {
        res.send({
            status: false,
            message: err.message
        });
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