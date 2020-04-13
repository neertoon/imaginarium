const chatForm = document.getElementById('chat-form');

const socket = io();

socket.on('message', message => {
    outputMessage(message);
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const msg = e.target.elements.msg.value;

    // Emit message to server
    socket.emit('chatMessage', msg);
});

function outputMessage(message) {
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = `<p class="meta">USER <span>9:12pm</span></p>
<p class="text">
    ${message}
</p>`;
    document.querySelector('.chat-messages').appendChild(div);
}