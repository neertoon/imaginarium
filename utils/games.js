var games = [];

var GamesData = {
    games: [],
    phaseJoining: 1,
    phaseSettingReady: 2,
    phasePickingCard: 3,
    
    createGame: function(room) {
        const index = games.findIndex(game => game.room === room);
        
        if (index !== -1) {
            return games[index];
        }
        
        const game = {
            room,
            phase: this.phaseJoining,
            players: [],
            hostId: -1
        };

        games.push(game);
    
        return game;
    },
    
    addPlayer: function(room, user) {
        const index = games.findIndex(game => game.room === room);
        
        if (games[index].players.length == 0) {
            games[index].hostId = user.id;    
        }

        games[index].players.push(user);
    },
    
    handleReadiness: function(user, io) {
        const room = user.room;
        
        const index = games.findIndex(game => game.room === room);
        
        if (games[index].phase >= this.phasePickingCard) {
            return false;
        }

        user.isReady = !(user.isReady);
        
        const userHost = games[index].players.filter(user => user.id === games[index].hostId)[0];
        
        if (userHost.isReady && games[index].phase == this.phaseJoining) {
            games[index].phase = this.phaseSettingReady;
        } else if (!userHost.isReady && games[index].phase == this.phaseSettingReady) {
            games[index].phase = this.phaseJoining;
        }
        
        const userThatAgreed = games[index].players.filter(user => user.isReady === true);

        if (games[index].players.length === userThatAgreed.length) {
            io.to(room).emit('phase', 'selectCard');
            
            games[index].phase = this.phasePickingCard;
        }
        
        return true;
    },
    
    canJoin: function(room) {
        const index = games.findIndex(game => game.room === room);
        
        if (index === -1) {
            return true;
        }
        
        return games[index].phase == this.phaseJoining;
    }
}


module.exports = GamesData;