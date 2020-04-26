
const path = require('path');
const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);
const readDir = util.promisify(fs.readdir);

async function loadCardsListFromDirectory(imagesPath) {
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


module.exports = {loadCardsListFromDirectory, imagePathToBase64, shuffle};