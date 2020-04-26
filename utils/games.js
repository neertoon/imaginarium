var games = [];
const fs = require('fs');
const imagesPath = 'utils/cardImages/';

const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);


var GamesData = {
    games: [],
    phaseJoining: 1,
    phaseSettingReady: 2,
    phasePickingCard: 3,
    phaseVoting: 4,
    
    createGame: function(room) {
        const index = games.findIndex(game => game.room === room);
        
        if (index !== -1) {
            return games[index];
        }
        
        const game = {
            room,
            phase: this.phaseJoining,
            cardsToUse: [],
            usedCards: [],
            players: [],
            hostId: -1,
            cardsForVoting: []
        };

        game.cardsToUse = this.loadCardsListFromDirectory();

        games.push(game);
    
        return game;
    },
    
    addPlayer: function(room, user) {
        const index = games.findIndex(game => game.room === room);
        let game = games[index];
        if (game.players.length == 0) {
            game.hostId = user.id;    
        }

        game.players.push(user);
    },
    
    handleReadiness: async function(user, io) {
        const room = user.room;
        
        const index = games.findIndex(game => game.room === room);
        let game = games[index];
        if (game.phase >= this.phasePickingCard) {
            return false;
        }

        user.isReady = !(user.isReady);
        
        const userHost = game.players.filter(user => user.id === game.hostId)[0];
        
        if (userHost.isReady && game.phase == this.phaseJoining) {
            game.phase = this.phaseSettingReady;
        } else if (!userHost.isReady && game.phase == this.phaseSettingReady) {
            game.phase = this.phaseJoining;
        }
        
        const userThatAgreed = game.players.filter(user => user.isReady === true);

        if (game.players.length === userThatAgreed.length) {
            io.to(room).emit('phase', 'selectCard');
            
            game.phase = this.phasePickingCard;


            for(let player of game.players)
            {
                let cardsList = player.cards
                while(cardsList.length < 6)
                {
                    
                    const basedImage = await this.imagePathToBase64(imagesPath + game.cardsToUse[0]);
                    cardsList.push(basedImage);
                    game.cardsToUse.shift();
                }
            }

            for (const playerIndex of game.players)
                io.to(playerIndex.id).emit('gameCardsPack', playerIndex.cards);
            
        }
        
        return true;
    },
    
    canJoin: function(room) {
        const index = games.findIndex(game => game.room === room);
        
        if (index === -1) {
            return true;
        }
        
        return games[index].phase == this.phaseJoining;
    },
    
    addCardForVoting: function(user, cardIndex, io) {
        const room = user.room; 
        const game = games.find(game => game.room === room);
        
        const voteLength = game.cardsForVoting.push(user.cards[cardIndex]);
        
        user.selectedCard = true;
        user.pickedCardIndex = voteLength - 1;

        const userThatPickedCard = game.players.filter(user => user.selectedCard === true);

        if (game.players.length === userThatPickedCard.length && game.phase === this.phasePickingCard) {
            io.to(room).emit('phase', 'voting');
            
            game.phase = this.phaseVoting;

            for (const playerIndex of game.players){
                playerIndex.selectedCard = false;
                io.to(playerIndex.id).emit('gameCardsForVoting', game.cardsForVoting);
            }
        }
    },

    loadCardsListFromDirectory: function() {
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
    },

    imagePathToBase64: async function(filePath){
        let result;
        let data = await readFile(filePath);
           
       let extensionName = path.extname(filePath);
       
       let base64Image = Buffer.from(data, 'binary').toString('base64');
       
       result = `data:image/${extensionName.slice(1)};base64,${base64Image}`;
       
       return result;
    }
}


module.exports = GamesData;

/*
Do zorbiniea:
Nie można wybrać karty, gdy już wybrano kartę albo inna faza gry
To samo z głosowaniem
Kontroluj niewłaściwe wartości przychodzące
 */
 
