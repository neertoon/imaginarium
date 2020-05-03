
function trnslt(key) {
    let result;
    if(window.navigator.languages.find((e)=> e =='pl' || e == 'pl-PL'))
        result = plKeys[key];
    else
        result = key;
    if(result)
        return result;
    else
        return "#"+key;
}


const plKeys = {
    "Set ready":'Ustaw gotowość',
    "Select card":'Wybierz kartę',
    "Vote":'Zagłosuj',
    "Next round":'Następna runda',
    "Wait for other players":'Poczekaj na innych graczy',
    "Players":'Gracze',
    "Voting":'Głosowanie',
    "Summary":'Podsumowanie',
    "Tell your story to others and pick a card":'Opowiedz innym swoją historię i wybierz kartę',
    "Listen to player ":'Posłuchaj gracza ',
    ", then pick a card":', a następnie wybierz kartę',
    "Your name":'Twoja nazwa',
    "Enter name...":'Podaj nazwę...',
    "Password":'Hasło',
    "Enter game password...":'Podaj hasło gry...',
    "Room":'Pokój',
    "Enter game":'Wejdź do gry',
    "You cannot join" : 'Nie możesz dołączyć',
    "User does not exists" : 'Użytkownik nie istnieje',
    "You didn't choose anything" : 'Nic nie wybrałeś',
    "You already chose card for voting" : 'Już wybrałes wcześniej kartę do głosowania',
    "You cannot vote for your card" : 'Nie możesz zagłosować na swoją kartę'
};

