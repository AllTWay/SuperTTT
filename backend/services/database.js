// Database
// const firebase = require("firebase/app");
// require('firebase/database');
// var firebaseConfig = require("./firebase_config.js");
// firebase.initializeApp(firebaseConfig);
// var database = firebase.database();

async function save_game(game) {
    return;
    log("Saving game")
    let winner = game.get_winner();
    if(!winner) {
        winner = "Tie";
    }

    let data = {
        timestamp: Date.now(),
        winner: winner,
        moves: game.get_history()
    }

    database.ref('games').push(data);
}

async function get_all_games() {
    return;
    let history = await database.ref('games').once('value');
    return history.val();
}

