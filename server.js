const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users');
const GamesData = require('./utils/games');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const serverName = 'SERVER';

// Run when client connect 
io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
        if (!GamesData.canJoin(room)) {
            socket.emit('gameError', formatMessage(serverName, 'CantJoinDude'));
            return;
        }
        
        const user = userJoin(socket.id, username, room);
        
        GamesData.createGame(room);
        GamesData.addPlayer(room, user); 
        
        socket.join(user.room);
        
        socket.emit('message', formatMessage(serverName, 'Welcome to The Game'));

        // Broadcast when user connect
        socket.broadcast.to(user.room).emit('message', formatMessage(serverName, `${user.username} joined The Game`));  
        
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });
    
    // Gdy użytkownik się odłącza - uwaga, może go wywalić z gry a będzie chciał powrócić!
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);
        
        if (user) {
            io.to(user.room).emit('message', formatMessage(serverName, `${user.username} has left The Game (but we dont know if he will return)`));

            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        } 
    });
    
    // Listen for chatMessages
    socket.on('chatMessage', (msg) => {
        const user = getCurrentUser(socket.id);
        
        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });
    
    // Listen for game join
    socket.on('gameUserReady', async (msg) => {
        const user = getCurrentUser(socket.id);
        if (await !GamesData.handleReadiness(user, io)) {
            socket.emit('gameError', formatMessage(serverName, 'Cannot change ready state during game'));
        }

        if (user.isReady) {
            socket.emit('phase', 'readyOn');
        } else {
            socket.emit('phase', 'readyOff');
        }
    });
    
    socket.on('gamePickCard', (cardIndex) => {
        if (!cardIndex && cardIndex !== 0) {
            socket.emit('gameError', formatMessage(serverName, "You didn't choose anything"));
        }
        const user = getCurrentUser(socket.id);
        GamesData.addCardForVoting(user, cardIndex, io);
    });
});

const PORT = 3000 || process.env.PORT;

//KŚ tu był

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
