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
            cardsForVoting: []
        };
        let cards = await loadCardsListFromDirectory(imagesPath);
        shuffle(cards);
        game.cardsToUse = cards;

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
    
    addCardForVoting: function(user, cardIndex, io) {
        if (user.pickedCardIndex !== -1) {
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
            io.to(room).emit('phase', 'voting');
            
            game.phase = this.phaseVoting;

            for (const playerIndex of game.players){
                playerIndex.selectedCard = false;
            }

            io.to(room).emit('gameCardsPack', game.cardsForVoting);
        }

        return true;
    },
    
    getUsersForClient: function(room) {
        const game = games.find(game => game.room === room);

        var publicUsers = [];
        for (const playerIndex of game.players){
            const userMadeMove = game.phase < this.phasePickingCard ? playerIndex.isReady : playerIndex.selectedCard;
            const publicUser = {
                username: playerIndex.username,
                madeMove: userMadeMove,
                points: playerIndex.points,
                isHost: playerIndex.isHost,
                isStoryteller: playerIndex.isStoryteller,
            };
            
            publicUsers.push(publicUser);
        }
        
        return publicUsers;
    },
    
    userLeave: function(room, id) {
        const game = games.find(game => game.room === room);
        
        const index = game.players.findIndex(user => user.id === id);

        if (index !== -1) {
            return game.players.splice(index, 1)[0];
        }
    },
    voteForCard(user, cardIndex, io) {
        if (user.votedCardIndex !== -1) {
            return false;
        }

        const room = user.room;
        const game = games.find(game => game.room === room);


        user.selectedCard = true;
        user.votedCardIndex = parseInt(cardIndex);

        const usersThatVoted = game.players.filter(user => user.selectedCard === true);
        console.log(user.username+' voted '+cardIndex);

        if (game.players.length === usersThatVoted.length && game.phase === this.phaseVoting) {
            console.log('ALL USERS voted ');
            
            const storyTeller = game.players.find(user => user.isStoryteller === true);
            console.log('storyTeller.pickedCardIndex ');
            console.log(storyTeller.pickedCardIndex);
            const playersThatFoundStorytellerCard = game.players.filter(userki => userki.votedCardIndex === storyTeller.pickedCardIndex);
            const playersNotVotedForStoryteller = game.players.filter(userki => userki.votedCardIndex !== storyTeller.pickedCardIndex);

            console.log('playersThatFoundStorytellerCard.length');
            console.log(playersThatFoundStorytellerCard.length);
            console.log(game.players.length);
            // Aha... trzeba jeszcze dorobić, żeby narrator otrzymał od strzzłu głos na swoją kartę. Wtedy 1 warunek musi być na 1 a nie 0
            // Nie może głosować na siebie
            if (playersThatFoundStorytellerCard.length === 0 || playersThatFoundStorytellerCard.length === game.players.length) {
                console.log('LICZYMY 2');
                for (const player of game.players){
                    console.log('player.votedCardIndex');
                    console.log(player.votedCardIndex);
                    if (player.isStoryteller) {
                        continue;
                    }
                    player.points += 2;
                }
            } else {
                console.log('LICZYMY INACZEJ');
                for (const player of playersThatFoundStorytellerCard){
                    player.points += 3;
                }
                
                let playersWithExtaPoints = {};
                for (const player of playersNotVotedForStoryteller) {
                    let playerToGetAnotherPoints = game.players.find(user => user.pickedCardIndex === player.votedCardIndex);
                    if (!playersWithExtaPoints.hasOwnProperty(playerToGetAnotherPoints.id)) {
                        playersWithExtaPoints[playerToGetAnotherPoints.id] = 0;
                    } else if (playersWithExtaPoints[playerToGetAnotherPoints.id] === 3) {
                        continue;
                    }
                    playerToGetAnotherPoints.points += 1;
                    playersWithExtaPoints[playerToGetAnotherPoints.id] += 1;
                }
            }
            io.to(room).emit('phase', 'scoring');

            game.phase = this.phaseScore;

            for (const playerIndex of game.players){
                playerIndex.selectedCard = false;
            }

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
            io.to(playerIndex.id).emit('gameCardsPack', playerIndex.cards);
        }
    }
}


module.exports = GamesData;

/*
Do zorbiniea:
Nie można wybrać karty, gdy już wybrano kartę albo inna faza gry
To samo z głosowaniem
Kontroluj niewłaściwe wartości przychodzące
 */
 
