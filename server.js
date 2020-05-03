const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users');
const {insertCardPackMethod, clearAllCardsMethod} = require('./utils/cards');
const GamesData = require('./utils/games');
const fileUpload = require('express-fileupload');//https://attacomsian.com/blog/uploading-files-nodejs-express#
var cookie = require('cookie');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

app.use(fileUpload({
    createParentPath: true
}));


const serverName = 'SERVER';
// process.env.IPASSWORD = ''; //ODPAL TO NA LOKALU

// Run when client connect 
io.on('connection', socket => {
    var cookies = socket.handshake.headers.cookie ? cookie.parse(socket.handshake.headers.cookie) : {};
    var actualUserId = socket.id;
    if (cookies.hasOwnProperty('iduserb')) {
        actualUserId = cookies.iduserb;
    }
    
    socket.on('joinRoom', async ({ username, room, password }) => {
        if (cookies.hasOwnProperty('iduserb')) {
            const user = getCurrentUser(actualUserId);
            
            if (!user) {
                socket.emit('gameError', formatMessage(serverName, 'User does not exists'));
                return;
            }
            
            //Gdy użytkownika nie ma, to skasuj mu cookie może i wywal błąd co? Tu się nie da cookie puszczać, ale można puścić error
            //I niech error zawsze kasuje cookie
            
            user.socketId = socket.id;
            user.isOnline = true;
            socket.join(user.room);
            GamesData.reconnect(user, io);
            sendUsers(user, io);
            return;
        }
        
        if (!GamesData.canJoin(room) || password !== process.env.IPASSWORD) {
            socket.emit('gameError', formatMessage(serverName, 'You cannot join'));
            return;
        }
        
        const user = userJoin(actualUserId, username, room);
        
        await GamesData.createGame(room);
        GamesData.addPlayer(room, user, io); 
        
        socket.join(user.room);
        
        socket.emit('message', formatMessage(serverName, 'Welcome to The Game'));

        // Broadcast when user connect
        socket.broadcast.to(user.room).emit('message', formatMessage(serverName, `${user.username} joined The Game`));

        sendUsers(user, io);
    });

    socket.on('leaveRoom', () => {
        const user = userLeave(actualUserId);

        if (user) {
            GamesData.userLeave(user.room, user.id);

            sendUsers(user, io);

            io.to(user.room).emit('message', formatMessage(serverName, `${user.username} has left The Game (but we dont know if he will return)`));
        }
    });

    
    
    // Gdy użytkownik się odłącza - uwaga, może go wywalić z gry a będzie chciał powrócić!
    socket.on('disconnect', () => {
        const user = getCurrentUser(actualUserId);
        
        if (user) {
            //Jeszcze może by się przydała informacja dla innych że gracz się odłączył?
            user.isOnline = false;
            
            sendUsers(user, io);
        } 
    });
    
    // Listen for chatMessages
    socket.on('chatMessage', (msg) => {
        const user = getCurrentUser(actualUserId);
        
        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });
    
    // Listen for game join
    socket.on('gameUserReady', async (msg) => {
        const user = getCurrentUser(actualUserId);
        if (await !GamesData.handleReadiness(user, io)) {
            socket.emit('gameError', formatMessage(serverName, 'Cannot change ready state during game'));
        }

        sendUsers(user, io);
    });
    
    socket.on('gamePickCard', async (cardIndex) => {
        if (!cardIndex && cardIndex !== 0) {
            let message = formatMessage(serverName, "You didn't choose anything");
            message['phase'] = 'selectCard';
            socket.emit('gameWarning', message);
            return;
        }
        const user = getCurrentUser(actualUserId);
        await GamesData.addCardForVoting(user, cardIndex, io);

        sendUsers(user, io);
    });

    socket.on('gameVote', (cardIndex) => {
        if (!cardIndex && cardIndex !== 0) {
            socket.emit('gameWarning', formatMessage(serverName, "You didn't choose anything"));
        }
        const user = getCurrentUser(actualUserId);
        GamesData.voteForCard(user, cardIndex, io);

        sendUsers(user, io);
    });

    socket.on('gameNextRound', async (msg) => {
        const user = getCurrentUser(actualUserId);
        if (!await GamesData.nextRound(user, io)) {
            socket.emit('gameWarning', formatMessage(serverName, 'You already chose card for voting'));
        }

        sendUsers(user, io);
    });
});

app.post('/insertCardPack', async (req, res) => {
    await insertCardPackMethod(req, res);
});

app.post('/clearAllCards', async (req, res) => {
    await clearAllCardsMethod(req, res);
});


const PORT = process.env.PORT || 3000;

//KŚ tu był

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

function sendUsers(user, io) {
    var usersy = GamesData.getUsersForClient(user.room);
    
    io.to(user.room).emit('roomUsers', {
        room: user.room,
        users:usersy 
    });
}

//Taki test