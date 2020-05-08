var games = [];
const imagesPath = 'utils/cardImages/';
 
const {loadCardsListFromDirectory, imagePathToBase64, shuffle} = require('./cards');

var GamesData = {
    games: [],
    phaseJoining: 1,
    phaseSettingReady: 2,
    phasePickingCard: 3,
    phaseVoting: 4,
    phaseScore: 5,
    
    createGame: async function(room) {
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
            cardsForVoting: [],
            lastSummaryObject:{},
        };
        let cards = await loadCardsListFromDirectory();
        shuffle(cards);
        game.cardsToUse = cards;

        games.push(game);
    
        return game;
    },
    
    addPlayer: function(room, user, io) {
        const index = games.findIndex(game => game.room === room);
        let game = games[index];
        if (game.players.length == 0) {
            game.hostId = user.id;    
        }

        game.players.push(user);
        if (user.isReady) {
            io.to(user.socketId).emit('phase', 'readyOn');
        } else {
            io.to(user.socketId).emit('phase', 'readyOff');
        }
    },
    
    handleReadiness: async function(user, io) {
        const room = user.room;
        
        const index = games.findIndex(game => game.room === room);
        let game = games[index];
        if (game.phase >= this.phasePickingCard) {
            return false;
        }

        user.isReady = !(user.isReady);

        if (user.isReady) {
            io.to(user.socketId).emit('phase', 'readyOn');
        } else {
            io.to(user.socketId).emit('phase', 'readyOff');
        }
        
        const userHost = game.players.filter(user => user.id === game.hostId)[0];
        
        if (userHost.isReady && game.phase == this.phaseJoining) {
            game.phase = this.phaseSettingReady;
        } else if (!userHost.isReady && game.phase == this.phaseSettingReady) {
            game.phase = this.phaseJoining;
        }
        
        const userThatAgreed = game.players.filter(user => user.isReady === true);

        if (game.players.length === userThatAgreed.length) {
            await this.goToPhasePickingCard(game, io);
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
    
    addCardForVoting: async function(user, cardIndex, io) {
        if (user.pickedCardIndex !== -1) {
            io.to(user.socketId).emit('gameWarning', {text: 'You already chose card for voting'});
            return false;
        }
        
        const room = user.room; 
        const game = games.find(game => game.room === room);
        
        const voteLength = game.cardsForVoting.push(user.cards[cardIndex]);

        user.cards.splice(cardIndex, 1)[0];
        
        user.selectedCard = true;
        user.pickedCardIndex = voteLength - 1;

        const userThatPickedCard = game.players.filter(user => user.selectedCard === true);

        if (game.players.length === userThatPickedCard.length && game.phase === this.phasePickingCard) {
            await this.shuffleCardsForVoting(game);
            
            io.to(room).emit('phase', 'voting');
            
            game.phase = this.phaseVoting;

            for (const playerIndex of game.players){
                if (playerIndex.isStoryteller) {
                    playerIndex.votedCardIndex = playerIndex.pickedCardIndex;
                    io.to(playerIndex.socketId).emit('phase', 'narrator');
                } else {
                    playerIndex.selectedCard = false;    
                }
            }

            io.to(room).emit('gameCardsPack', game.cardsForVoting);
        }

        return true;
    },
    
    getUsersForClient: function(room) {
        const game = games.find(game => game.room === room);

        var publicUsers = [];
        
        if (!game || game.players.length === 0) {
            return publicUsers;
        }
        
        for (const playerIndex of game.players){
            const userMadeMove = game.phase < this.phasePickingCard ? playerIndex.isReady : playerIndex.selectedCard;
            const publicUser = {
                username: playerIndex.username,
                madeMove: userMadeMove,
                points: playerIndex.points,
                isHost: playerIndex.isHost,
                isStoryteller: playerIndex.isStoryteller,
                isOnline: playerIndex.isOnline
            };
            
            publicUsers.push(publicUser);
        }
        
        return publicUsers;
    },
    
    userLeave: function(room, id) {
        const game = games.find(game => game.room === room);
        
        const index = game.players.findIndex(user => user.id === id);

        if (index !== -1) {
            game.players.splice(index, 1)[0];
        }

        if (game.players.length === 0) {
            const gameIndex = games.findIndex(game => game.room === room);
            games.splice(gameIndex, 1)[0];
        }
    },
    voteForCard(user, cardIndex, io) {
        cardIndex = parseInt(cardIndex);
        if (user.votedCardIndex !== -1) {
            io.to(user.socketId).emit('gameWarning', {text: 'You already chose card for voting', phase: 'voting'});
            return false;
        }

        if (user.pickedCardIndex === cardIndex) {
            io.to(user.socketId).emit('gameWarning', {text: 'You cannot vote for your card', phase: 'voting'});
            return false;
        }

        const room = user.room;
        const game = games.find(game => game.room === room);


        user.selectedCard = true;
        user.votedCardIndex = cardIndex;

        const usersThatVoted = game.players.filter(user => user.selectedCard === true);

        if (game.players.length === usersThatVoted.length && game.phase === this.phaseVoting) {
            let summaryObject = { 
                storyTellerCardIndex: -1,
                storyTellerName: '',
                allVotedOnStoryteller: false,
                noneVotedOnStoryteller: false,
                cardOwners:[],
                votes:[]
            };
            game.players.forEach(player=> {
                summaryObject.cardOwners.push({name:player.username, cardIndex:player.pickedCardIndex});
                if(player.isStoryteller){
                    summaryObject.storyTellerCardIndex = player.pickedCardIndex;
                    summaryObject.storyTellerName = player.username;
                }
            });

            const storyTeller = game.players.find(user => user.isStoryteller === true);
            const playersThatFoundStorytellerCard = game.players.filter(userki => userki.votedCardIndex === storyTeller.pickedCardIndex);
            const playersNotVotedForStoryteller = game.players.filter(userki => userki.votedCardIndex !== storyTeller.pickedCardIndex);

            if (playersThatFoundStorytellerCard.length === 1 || playersThatFoundStorytellerCard.length === game.players.length) {
                for (const player of game.players){
                    if (player.isStoryteller) {
                        continue;
                    }
                    player.points += 2;
                }
                if(playersThatFoundStorytellerCard.length === 1)
                    summaryObject.noneVotedOnStoryteller = true;
                else
                    summaryObject.allVotedOnStoryteller = true;
            } else {
                for (const player of playersThatFoundStorytellerCard){
                    player.points += 3;
                    if(!player.isStoryteller)
                        summaryObject.votes.push({name:player.username, voteIndex: 'votedOnStoryteller', voteName: storyTeller.username});
                }
                
                let playersWithExtaPoints = {};
                for (const player of playersNotVotedForStoryteller) {
                    let playerToGetAnotherPoints = game.players.find(user => user.pickedCardIndex === player.votedCardIndex);
                    summaryObject.votes.push({name:player.username, voteIndex: player.votedCardIndex, voteName: summaryObject.cardOwners.find(x=>x.cardIndex == player.votedCardIndex).name});
                    if (!playersWithExtaPoints.hasOwnProperty(playerToGetAnotherPoints.id)) {
                        playersWithExtaPoints[playerToGetAnotherPoints.id] = 0;
                    } else if (playersWithExtaPoints[playerToGetAnotherPoints.id] === 3) {
                        continue;
                    }
                    playerToGetAnotherPoints.points += 1;
                    playersWithExtaPoints[playerToGetAnotherPoints.id] += 1;
                }
            }
            
            var iter = 0;
            for (const player of summaryObject.cardOwners) {
                player.points = game.players[iter].points;
                iter++;
            }
            
            io.to(room).emit('phase', 'scoring');

            game.phase = this.phaseScore;

            for (const playerIndex of game.players){
                playerIndex.selectedCard = false;
            }
            

            io.to(room).emit('summary', JSON.stringify(summaryObject));
            game.lastSummaryObject = summaryObject;

            //TUTAJ TRZEBA WYSLAC KARTY Z INFORMACJA KTO NA KOGO GLOSOWAL I TRZEBA PUNKTY PODLICZYC
            //BRAKUJE INFO, KTO JEST W TYM ROZADNIU NARATOREM
            // io.to(room).emit('gameCardsPack', game.cardsForVoting);
        }

        return true;
    },
    
    async nextRound(user, io) {
        const room = user.room;
        const game = games.find(game => game.room === room);
        
        if (user.selectedCard === true && game.phase === this.phaseScore) {
            return false;
        }

        user.selectedCard = true;
        user.votedCardIndex = -1;

        const usersThatReady = game.players.filter(user => user.selectedCard === true);

        if (game.players.length === usersThatReady.length && game.phase === this.phaseScore) {
            await this.goToPhasePickingCard(game, io);
        }

        return true;
    },

    async goToPhasePickingCard(game, io) {
        io.to(game.room).emit('phase', 'selectCard');

        game.phase = this.phasePickingCard;

        const indexOfStoryTeller = game.players.findIndex(user => user.isStoryteller === true);
        var nextStoryTeller = 0;
        if (indexOfStoryTeller !== -1) {
            nextStoryTeller = indexOfStoryTeller + 1;
            nextStoryTeller = nextStoryTeller === game.players.length ? 0 : nextStoryTeller;
            game.players[indexOfStoryTeller].isStoryteller = false;
        }
        game.players[nextStoryTeller].isStoryteller = true;
        game.usedCards = game.usedCards.concat(game.cardsForVoting);
        game.cardsForVoting = [];

        for(let player of game.players)
        {
            player.selectedCard = false;
            player.pickedCardIndex = -1;
            player.votedCardIndex = -1;
            
            let cardsList = player.cards
            while(cardsList.length < 6)
            {

                const basedImage = await imagePathToBase64(imagesPath + game.cardsToUse[0]);
                cardsList.push(basedImage);
                game.cardsToUse.shift();
            }
        }

        for (const playerIndex of game.players) {
            io.to(playerIndex.socketId).emit('gameCardsPack', playerIndex.cards);
            
            if (playerIndex.isStoryteller) {
                io.to(playerIndex.socketId).emit('phase', 'narrator');
            }else{
                io.to(playerIndex.socketId).emit('phase', 'someoneElseNarrator:' + game.players.find((el)=>el.isStoryteller).username);
            }
        }
    },
    
    shuffleCardsForVoting(game) {
        let pickedCardIndexes = Array.from(Array(game.cardsForVoting.length).keys());
        let shufledPickedCardsIndexes = this.shuffleArray(pickedCardIndexes);

        let newPickedCard = [];

        for (const player of game.players) {
            const newCardIndex = shufledPickedCardsIndexes.findIndex(value => value === player.pickedCardIndex);
            player.pickedCardIndex = newCardIndex;
        }

        for (const newCardIndex of shufledPickedCardsIndexes) {
            newPickedCard.push(game.cardsForVoting[newCardIndex]);
        }

        game.cardsForVoting = newPickedCard;
    },

    shuffleArray(elements){
        var currentIndex = elements.length, temporaryValue, randomIndex;

        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = elements[currentIndex];
            elements[currentIndex] = elements[randomIndex];
            elements[randomIndex] = temporaryValue;
        }

        return elements;
    },
    async reconnect(user, io) {
        const room = user.room;
        const game = games.find(game => game.room === room);
        
        if (game.phase == this.phasePickingCard) {
            io.to(user.socketId).emit('phase', 'selectCard');
            io.to(user.socketId).emit('gameCardsPack', user.cards);
            io.to(user.socketId).emit('phase', user.isStoryteller ? 'narrator' : ('someoneElseNarrator:' + game.players.find(x=>x.isStoryteller).username));
        } else if (game.phase == this.phaseVoting) {
            io.to(user.socketId).emit('phase', 'voting');
            io.to(user.socketId).emit('gameCardsPack', game.cardsForVoting);
        } else if (game.phase == this.phaseScore) {
            io.to(user.socketId).emit('phase', 'scoring');
            await io.to(user.socketId).emit('gameCardsPack', game.cardsForVoting);
            io.to(user.socketId).emit('summary', JSON.stringify(game.lastSummaryObject));
        } else if (game.phase <= this.phaseSettingReady) {
            if (user.isReady) {
                io.to(user.socketId).emit('phase', 'readyOn');
            } else {
                io.to(user.socketId).emit('phase', 'readyOff');
            }
        }
    }
}


module.exports = GamesData;

/*
Do zorbiniea:
Kontroluj niewłaściwe wartości przychodzące
 */
 
