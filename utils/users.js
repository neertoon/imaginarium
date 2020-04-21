const users = [];

function userJoin(id, username, room) {
    const roomUser = getRoomUsers(room);
    
    const user = {
        id, 
        username, 
        room,
        isReady : false,
        points: 0,
        isHost: roomUser.length === 0
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

function switchReadyForUser(id) {
    let index = users.findIndex(user => user.id === id);
    users[index].isReady = !(users[index].isReady);
}

module.exports = { userJoin, getCurrentUser, userLeave, getRoomUsers, switchReadyForUser };