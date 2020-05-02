const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const usersList = document.getElementById('users');
const userTable = $('#game-user-table');

// Get user and room from URL
const { username, room, password } = Qs.parse(location.search, {
    ignoreQueryPrefix: true
});

const socket = io();

// Join chatroom
socket.emit('joinRoom', {
    username,
    room,
    password
});

socket.on('roomUsers', ({ room, users }) => {
    outputRoomName(room);
    
    outputUsers(users);
});

socket.on('message', message => {
    outputMessage(message);

    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (!getCookie('iduserb') && message.text === 'Welcome to The Game') {
        setCookie('iduserb', socket.json.id, 1);
    }
});

socket.on('gameError', message => {
    console.log(message.text);
    setCookie('iduserb', '', -1);
    alert(message.text);
    window.location = '/';
});

socket.on('gameWarning', message => {
    alert(message.text);
    
    if (message.hasOwnProperty('phase')) {
        if (message.phase === 'voting') {
            $('#btnVoteForCard').show();
        } else if (message.phase === 'selectCard') {
            $('#btnChooseCard').show();
        }
    }
});

socket.on('phase', message => {
    if (message == 'selectCard') {
        $('.game-item-showhide').hide();
        // $('#btnSetReady').hide();
        $('#btnChooseCard').show();
        //$('#game-area-info').html('Selecting cards');
    } else if (message == 'readyOn') {
        $('.game-item-showhide').hide();
        $('#btnSetReady').css('background-color', '#5cb85c');
        $('#btnSetReady').show();
    } else if (message == 'readyOff') {
        $('.game-item-showhide').hide();
        $('#btnSetReady').css('background-color', 'darksalmon');
        $('#btnSetReady').show();
    } else if (message == 'voting') {
        $('.game-item-showhide').hide();
        // $('#btnSetReady').hide();
        $('#game-area-info').html('Voting');
        // $('#btnChooseCard').hide();
        $('#btnVoteForCard').show();
    } else if (message == 'scoring') {
        $('.game-item-showhide').hide();
        // $('#btnSetReady').hide();
        $('#game-area-info').html('Summary');
        // $('#btnVoteForCard').hide();
        $('#btnSeenScoring').show();
    } else if (message == 'narrator') {
        $('#btnVoteForCard').hide();
        $('#game-area-info').html('Tell your story to others and pick a card');
    }else if (message.startsWith('someoneElseNarrator:')) {
        $('#game-area-info').html('Listen to ' + message.substr(20) + ', then pick a card');
    }
});

socket.on('gameCardsPack', cardsPack => {
    console.log(cardsPack);
    $('#player-cards').empty();
    var i=0;
    cardsPack.forEach((card)=>{
        $('#player-cards').append(`<img data-index="${i}" onclick="Game.selectCard($(event.target), $('#selected-card-index'))" class="game-card" src="${card}"/>`);
        i++;
    });
    let firstItem = $($('#player-cards').children()[0]);
    Game.selectCard(firstItem, $('#selected-card-index'));
    setHeightHack();
    preventTooHighSpotlight();
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
    userTable.html(`
        ${users.map(user => `<tr>
            <td ${user.isHost ? 'style="color: red;"' : ''}>${user.isStoryteller ? 'N:' : ''}${user.username}</td>
            <td>${user.madeMove ? '<i class="fas fa-check-circle"></i>' : ''}${user.isOnline ? '' : '<i class="fas fa-wifi"></i>'}</td>
            <td>${user.points}</td>
        </tr>`).join('')}
    `);
}

function setSpotlightCards(selectedCard){
    $('#spotlight-selected-card').attr('src', selectedCard.attr('src'));
    $('#spotlight-left-card').attr('src', selectedCard.prev().length > 0 ? selectedCard.prev().attr('src') : selectedCard.siblings().last().attr('src'));
    $('#spotlight-right-card').attr('src', selectedCard.next().length > 0 ? selectedCard.next().attr('src') : selectedCard.siblings().first().attr('src'));
}

const Game = {
    start : function(event) {
        event.preventDefault();
        socket.emit('gameUserReady', 'ok');
    },
    selectCard: function(element, cardIndexHolder) {
        const value = element.data('index');
        cardIndexHolder.val(value);
        $('.game-card').removeClass('selected');
        element.addClass('selected');
        setSpotlightCards(element);
    },
    sendPickedCard : function(event, cardNumber) {
        event.preventDefault();
        socket.emit('gamePickCard', cardNumber);
        console.log('You selected card '+cardNumber);
        var element = $(event.target);
        element.hide();
    },
    voteForCard : function(event, cardNumber) {
        event.preventDefault();
        socket.emit('gameVote', cardNumber);
        console.log('You vote card '+cardNumber);
        var element = $(event.target);
        element.hide();
    },
    nextRound : function(event) {
        event.preventDefault();
        socket.emit('gameNextRound', 'NEXT');
        var element = $(event.target);
        element.hide();
    },
    leave :function() {
        setCookie('iduserb', '', -1);
        socket.emit('leaveRoom', 'ok');
        window.location = '/';
    }
};

function toggleUsers() {
    let userArea = $('#game-users-area');
    if (userArea.hasClass('showed')) {
        userArea.removeClass('showed');    
    } else {
        userArea.addClass('showed');
    }
    
}

function nextCard(cardIndexHolder){
    let cards = $('#player-cards').children();
    let nextCardIndex = parseInt(cardIndexHolder.val()) + 1;
    if(nextCardIndex == cards.length)
        Game.selectCard($(cards[0]), cardIndexHolder);
    else
        Game.selectCard($(cards[nextCardIndex]), cardIndexHolder);
}

function prevCard(cardIndexHolder){
    let cards = $('#player-cards').children();
    let prevCardIndex = parseInt(cardIndexHolder.val()) - 1;
    if(prevCardIndex == -1)
        Game.selectCard($(cards[cards.length - 1]), cardIndexHolder);
    else
        Game.selectCard($(cards[prevCardIndex]), cardIndexHolder);
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

// #region layout
function setHeightHack(){
    let cards = $('#player-cards').children();
    let containerWidth = $('#player-cards').width();
    let twoRowsMode = cards.length > 6;
    for(let i = 0; i < cards.length; i++){
        let card = cards[i];
        $(card).height(containerWidth / 6 * (twoRowsMode ? 0.7 : 1.4));
    }
}


function preventTooHighSpotlight(){
    setTimeout(function (){
        let gameAreaWidth = $('#game-play-area').width();
        let windowHeight = $(window).height();
        let maxHeight = windowHeight - $('.imaginarium-menu').height() - $('#player-cards').height() -$('.imaginarium-actions').height();
        $('#spotlight-view-wrapper').css('maxWidth', (maxHeight * 0.64) + 'px');
    }, 0);
}


$(window).on('resize', function(){
    setHeightHack();
    preventTooHighSpotlight();
});
// #endregion layout


// #region user input 
function executeAvailableAction(){
    if($('#btnChooseCard').css('display') != 'none')
        $('#btnChooseCard').trigger('click');
    else if($('#btnVoteForCard').css('display') != 'none')
        $('#btnVoteForCard').trigger('click');
    else if($('#btnSeenScoring').css('display') != 'none')
        $('#btnSeenScoring').trigger('click');
}



$.event.special.swipe.scrollSupressionThreshold = 30;
$(function(){
    $( "#spotlight-view-wrapper" ).on( "swipeleft", swipeLeftHandler );
    $( "#spotlight-view-wrapper" ).on( "swiperight", swipeRightHandler );
    function swipeLeftHandler( event ){
        nextCard($('#selected-card-index'));
    }
    function swipeRightHandler( event ){
        prevCard($('#selected-card-index'));
    }
  });

  $(document).keydown(function(e) {
    switch(e.which) {
        case 37: // left
        prevCard($('#selected-card-index'));
        break;
        case 39: // right
        nextCard($('#selected-card-index'));
        break;
        case 0://spacja
        case 32://spacja(firefox)
        case 13://enter
        executeAvailableAction();
        break;
        default: return; 
    }
    e.preventDefault(); 
});
// #endregion user input 