const users = [];

function userJoin(id, username, room) {
    const roomUser = getRoomUsers(room);
    
    const user = {
        id, 
        socketId: id,
        username, 
        room,
        isOnline: true,
        isReady : false,
        selectedCard: false,
        pickedCardIndex: -1,
        votedCardsArray: [],
        points: 0,
        isHost: roomUser.length === 0,
        isStoryteller: false,
        cards: []
    };
    
    users.push(user);
    
    return user;
}

function getCurrentUser(id) {
    return users.find(user => user.id === id);
}

function userLeave(id) {
    const index = users.findIndex(user => user.id === id);
    
    if (index !== -1) {
        return users.splice(index, 1)[0];
    }
}

function getRoomUsers(room) {
    return users.filter(user => user.room === room);
}

module.exports = { userJoin, getCurrentUser, userLeave, getRoomUsers };