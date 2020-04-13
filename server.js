const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const serverName = 'SERVER';

// Run when client connect 
io.on('connection', socket => {
    socket.emit('message', formatMessage(serverName, 'Welcome to The Game'));
    
    // Broadcast when user connect
    socket.broadcast.emit('message', formatMessage(serverName, 'The user joined The Game'));
    
    // Gdy użytkownik się odłącza - uwaga, może go wywalić z gry a będzie chciał powrócić!
    socket.on('disconnect', () => {
        io.emit('message', formatMessage(serverName,'User has left The Game (but we dont know if he will return)')); 
    });
    
    // Listen for chatMessages
    socket.on('chatMessage', (msg) => {
        io.emit('message', formatMessage('USER', msg));
    });
});

const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));