
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
    "Voting (two cards mode)":'Głosowanie (tryb dwóch kart)',
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
    "You cannot vote for your card" : 'Nie możesz zagłosować na swoją kartę',
    "FAIL! Everyone voted on storyteller card! +2 points for everyone except him!" : 'WTOPA! Wszyscy zagłosowali na kartę narratora! +2 punkty dla wszystkich oprócz niego!',
    "FAIL! Nobody voted on storyteller card! +2 points for everyone except him!" : 'WTOPA! Nikt nie zagłosował na kartę narratora! +2 punkty dla wszystkich oprócz niego!',
    "Correct votes: " : 'Dobrze zgadli: ',
    "Incorrect votes: " : 'Nietrafione: ',
    " got vote from: " : ' dostał głos od: ',
    "You have been kicked out" : 'Zostałeś wyrzucony z gry',
    "Are you sure? You won't be able to rejoin until game ends!" : "Jesteś pewien? Nie będziesz mógł dołączyć do gry dopóki się ona nie skończy",
    "Server didn't receive your action. Reloading!": "Serwer nie otrzymał twojej czynności. Odświeżam!",
    'Winner/s: ' : 'Zwycięzca/y: ',
    'Last round: ' : 'Ostatnia runda: ',
    'Results: ' : 'Tabela wyników: ',
    'Game over' : 'Koniec gry',
    'Stay' : 'Pozostań',
    'Give up your vote for another card' : 'Zrezygnuj z głosu na inną kartę',
    'Vote for first card' : 'Zagłosuj na pierwszą kartę',
    'Vote for another card' : 'Zagłosuj na inną kartę'
    
};

