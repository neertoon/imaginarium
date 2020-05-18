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
    alert(trnslt(message.text));
    window.location = '/';
});

socket.on('gameWarning', message => {
    alert(trnslt(message.text));
    
    if (message.hasOwnProperty('phase')) {
        if (message.phase === 'voting') {
            $('#btnVoteForCard').show();
        } else if (message.phase === 'selectCard') {
            $('#btnChooseCard').show();
        }
    }
});

socket.on('summary', summaryJson => {
    let summaryObject = JSON.parse(summaryJson);
    
    var winners = summaryObject.cardOwners.filter(player => player.points > 29);
    
    let storyTellerCard = $($('#player-cards').children()[summaryObject.storyTellerCardIndex]);
    storyTellerCard.addClass('correct-card');

    let cards = $($('#player-cards').children());
    let selectedCard = null;
    for(const cardOwner of summaryObject.cardOwners){
        let card = $(cards[cardOwner.cardIndex]);
        let curr = card.attr('alt');
        card.attr('alt', cardOwner.name);
        
        let votedCard = $(cards[cardOwner.cardVoted]);
        var lastVoters = votedCard.data('voters');
        lastVoters = lastVoters ? lastVoters : '';
        lastVoters += `<span>${cardOwner.name}</span><br>`;
        votedCard.data('voters', lastVoters);

        if(card.hasClass('selected')) {
            selectedCard = card;    
        }
    }

    setSpotlightCards(selectedCard);

    if (winners.length > 0) {
        alert('Winners: '+winners.map(function(elem){
            return elem.name;
        }).join(", "));

        Game.leave();
    }
});

socket.on('phase', message => {
    if (message == 'selectCard') {
        $('.game-item-showhide').hide();
        // $('#btnSetReady').hide();
        $('#btnChooseCard').show();
        //$('#game-area-info').html('Selecting cards');
        $('#spotlight-card-caption').hide();
        $('#spotlight-card-voters').hide();
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
        $('#game-area-info').html(trnslt('Voting'));
        // $('#btnChooseCard').hide();
        $('#btnVoteForCard').show();
    } else if (message == 'scoring') {
        $('.game-item-showhide').hide();
        // $('#btnSetReady').hide();
        $('#game-area-info').html(trnslt('Summary'));
        // $('#btnVoteForCard').hide();
        $('#btnSeenScoring').show();
        
        $('#spotlight-card-caption').show();
        $('#spotlight-card-voters').show();
    } else if (message == 'narrator') {
        $('#btnVoteForCard').hide();
        $('#game-area-info').html(trnslt('Tell your story to others and pick a card'));
    }else if (message.startsWith('someoneElseNarrator:')) {
        $('#game-area-info').html(trnslt('Listen to player ') + message.substr(20) + trnslt(', then pick a card'));
    }
});

socket.on('gameCardsPack', cardsPack => {
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

function summaryAlert(summaryObject) {
    let correctPlayers = summaryObject.votes.filter(vote => vote.voteIndex == 'votedOnStoryteller');
    let resultString = trnslt('Correct votes: ') + correctPlayers.map(el => el.name).join(', ');
    let incorrectPlayers = summaryObject.votes.filter(vote => vote.voteIndex != 'votedOnStoryteller');
    incorrectPlayers.sort((a, b) => (a.voteIndex > b.voteIndex) ? 1 : -1);
    let previousVoteTarget = null;
    for (const incorrectPlayer of incorrectPlayers) {
        if (previousVoteTarget != incorrectPlayer.voteName) {
            resultString += '\r\n\r\n';
            resultString += incorrectPlayer.voteName + trnslt(' got vote from: ');
        }
        resultString += incorrectPlayer.name + ', ';
        previousVoteTarget = incorrectPlayer.voteName;
    }
    alert(resultString);
}

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
    users = users.sort(function(a, b) {
        // a should come before b in the sorted order
        if(a.points < b.points){
            return -1;
            // a should come after b in the sorted order
        }else if(a.points > b.points){
            return 1;
            // a and b are the same
        }else{
            return 0;
        }
    });
    
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
    if(selectedCard.hasClass('correct-card'))
        $('#spotlight-selected-card').addClass('correct-card');
    else
        $('#spotlight-selected-card').removeClass('correct-card');
    let altText = selectedCard.attr('alt');
    altText = altText ? altText : '';
    let voters = selectedCard.data('voters');
    voters = voters ? voters : '';
    
    $('#spotlight-card-caption').html(altText);
    $('#spotlight-card-voters').html(voters);
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
    let gameuserleave = $('#game-user-leave');
    if (userArea.hasClass('showed')) {
        userArea.removeClass('showed');  
        gameuserleave.show(); 
    } else {
        userArea.addClass('showed');
        gameuserleave.hide();
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
        $('#spotlight-view-wrapper').css('maxWidth', (maxHeight * 0.72) + 'px');
    }, 0);
}


$(window).on('resize', function(){
    setHeightHack();
    preventTooHighSpotlight();
});

var observer = new MutationObserver(function(mutations) {
      if($('#btnSetReady').css('display') == 'none' && 
        $('#btnChooseCard').css('display') == 'none' && 
        $('#btnVoteForCard').css('display') == 'none' && 
        $('#btnSeenScoring').css('display') == 'none')
            $('#wait-label').show();
      else
            $('#wait-label').hide();
});
$( document ).ready(function() {
observer.observe(document.getElementById('btnSetReady'), { attributes : true, attributeFilter : ['style'] });
observer.observe(document.getElementById('btnChooseCard'), { attributes : true, attributeFilter : ['style'] });
observer.observe(document.getElementById('btnVoteForCard'), { attributes : true, attributeFilter : ['style'] });
observer.observe(document.getElementById('btnSeenScoring'), { attributes : true, attributeFilter : ['style'] });
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

// #region translations
$('#btnSetReady').html(trnslt('Set ready'));
$('#btnChooseCard').html(trnslt('Select card'));
$('#btnVoteForCard').html(trnslt('Vote'));
$('#btnSeenScoring').html(trnslt('Next round'));
$('#wait-label').html(trnslt('Wait for other players'));
$('#players-label').html(trnslt('Players'));

// #endregion translations 