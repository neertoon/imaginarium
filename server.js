const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Run when client connect 
io.on('connection', socket => {
    socket.emit('message', 'Welcome to The Game');
    
    // Broadcast when user connect
    socket.broadcast.emit('message', 'The user joined The Game');
    
    // Gdy użytkownik się odłącza - uwaga, może go wywalić z gry a będzie chciał powrócić!
    socket.on('disconnect', () => {
        io.emit('message', 'User has left The Game (but we dont know if he will return)'); 
    });
});

const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));