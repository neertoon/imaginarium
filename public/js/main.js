const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const usersList = document.getElementById('users');

// Get user and room from URL
const { username, room } = Qs.parse(location.search, {
    ignoreQueryPrefix: true
});

const socket = io();

// Join chatroom
socket.emit('joinRoom', {
    username,
    room
});

socket.on('roomUsers', ({ room, users }) => {
    outputRoomName(room);
    
    outputUsers(users);
});

socket.on('message', message => {
    outputMessage(message);

    chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('gameError', message => {
    console.log(message.text);
    alert(message.text);
    window.location = '/';
});

socket.on('phase', message => {
    if (message == 'selectCard') {
        $('#btnSetReady').hide();
        $('#btnChooseCard').show();
    } else if (message == 'readyOn') {
        $('#btnSetReady').css('background-color', '#5cb85c');
    } else if (message == 'readyOff') {
        $('#btnSetReady').css('background-color', 'darksalmon');
    } else if (message == 'voting') {
        $('#btnChooseCard').hide();
        $('#btnVoteForCard').show();
    } 
});

socket.on('gameCardsPack', cardsPack => {
    console.log(cardsPack);
    $('#player-cards').empty();
    cardsPack.forEach((card)=>{
        $('#player-cards').append(`<img src="${card.content}"/>`);
    });
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const msg = e.target.elements.msg.value;

    // Emit message to server
    socket.emit('chatMessage', msg);
    
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
});

function outputMessage(message) {
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `<p class="meta">${message.userName} <span>${message.time}</span></p>
<p class="text">
    ${message.text}
</p>`;
    document.querySelector('.chat-messages').appendChild(div);
}

function outputRoomName(room) {
    roomName.innerText = room;
}

function outputUsers(users) {
    usersList.innerHTML = `
        ${users.map(user => `<li>${user.username}</li>`).join('')}
    `;
}

const Game = {
    start : function(event) {
        event.preventDefault();
        socket.emit('gameUserReady', 'ok');
    },
    selectCard : function(event, cardNumber) {
        cardNumber = 0;
        event.preventDefault();
        socket.emit('gamePickCard', cardNumber);
        console.log('You selected card '+cardNumber);
        var element = $(event.target);
        element.hide();
    },
    voteForCard : function(event, cardNumber) {
        
    }
};