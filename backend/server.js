"use strict";

const PORT = 8080;
const FAVICON = __dirname + "/../frontend/assets/img/hashtag.png";
const FRONTEND = __dirname + "/../frontend";


// server
var os = require("os");

var express = require("express");
var app = express();
var http = require('http').createServer(app);
var favicon = require("express-favicon");

var socket = require("socket.io");
var io = socket(http);


// database
const firebase = require("firebase/app");
require('firebase/database');
var firebaseConfig = require("./firebase_config.js");
firebase.initializeApp(firebaseConfig);
var database = firebase.database();


// game
var super_ttt = require("./super_ttt.js");
var game = new super_ttt();


// TODO: use server-generated cookie. the session may break and the same player may connect
// with a different socketId.
var players = {};

// Prevent MIME TYPE error by making html directory static and therefore usable
app.use(express.static(FRONTEND));

// set favicon
app.use(favicon(FAVICON));

// http request handling
app.get("/", handle_main);
app.get("/games", handle_games);
app.get("*", handle_default);

// socket event handling
io.on('connection', handle_connection);



// Run server
// log_dependencies();
http.listen(PORT, log_running);


// ===========================================
//             Event handlers
// ===========================================

function handle_main(req, res) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.sendFile("index.html", { root: __dirname });
    res.end();
}

async function handle_games(req, res) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    let hist = await get_all_games();
    res.json(hist);
}

function handle_default(req, res) {
    res.redirect("/");
}

function get_role() {
    // returns 'X', 'O', or false
    let numPlayers = Object.keys(players).length;
    if(numPlayers === 0) {
        return Math.random() >= 0.5 ? 'X' : 'O';
    } else if(numPlayers === 1){
        return players[Object.keys(players)[0]] === 'X' ? 'O' : 'X';
    }
    // spectator
    return false;
}

function handle_connection(socket) {
    handle_connect();

    // set socket event handlers
    socket.on('disconnect', handle_disconnect);
    socket.on('play', handle_play);
    socket.on('new-game', handle_new_game);

    // socket event handlers
    function handle_connect() {
        let sym = get_role();
        if(sym) {
            players[socket.id] = sym;
        } else {
            // console.log("Got spectator");
        }

        console.log(`New player: ${socket.id} (${sym ? sym : "Spectator"})`);

        // inform client of its role and current game state
        socket.emit('setup', {
            'role': (socket.id in players ? players[socket.id] : 'spectator'),
            'board': game.get_board(),
            'next_player': game.get_next_player(),
            'valid_squares': game.get_valid_squares(),
        });
    }

    function handle_disconnect() {
        console.log(socket.id + " disconnected");
        if(socket.id in players) {
            delete players[socket.id]
        }
    }

    function handle_play(msg) {
        let player = players[socket.id];
        let position = msg.position;

        let errors = game.play(player, position);
        console.log(game.get_history());

        if(errors.length === 0) {
            io.emit('new-play', {
                'player': player,
                'position': position,
                'valid_squares': game.get_valid_squares(),
            });

            if(game.get_valid_squares().length === 0) {
                // game over
                console.log(`GG: ${game.get_winner() ? game.get_winner() + " wins": "Tie"}`);
                io.emit('gg', {
                    'winner': game.get_winner(),
                });
            }
        } else {
            console.log("Sending error");
            socket.emit('invalid-play', errors);
        }
    }

    function handle_new_game() {
        if(!(socket.id in players)) {
            console.log("Spectator asking for a new game");
            return;
        }

        persist_game(game);

        console.log("Creating new game");
        game = new super_ttt();
        io.emit('state', {
            'board': game.get_board(),
            'next_player': game.get_next_player(),
            'valid_squares': game.get_valid_squares(),
        });
    }
}

// ===========================================
//             Database stuff
// ===========================================

async function persist_game(game) {
    console.log("Saving game")
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
    let history = await database.ref('games').once('value');
    return history.val();
}


// ===========================================
//      Fancy console logging by Migmac
// ===========================================

const colorModule = require("./console_colors.js");
const color = colorModule.name;

const WHITE = `${color["BGwhite"]}${color["black"]}`;
const RESET = `${color["reset"]}`;
const GREEN = `${color["green"]}`;
const YELLOW = `${color["yellow"]}`;
const CYAN = `${color["cyan"]}`;
const RED = `${color["red"]}`;

function log_running() {
    console.log("+============================+");
    console.log(`|  Starting STTT by ${CYAN}AllTWay${RESET}  |`);
    console.log("+==+=========================+");
    console.log("   |");
    console.log(`   +--=[${WHITE}Private IP${RESET}]=--> ${GREEN}${get_ipv4()}:${YELLOW}${PORT}${RESET}`);
    console.log("   |");
    console.log("   ."); // End Spacer
}

function log_dependencies() {
    console.log(`${RED}Dependencies${RESET}`);
    console.log(`${RED}  --> ${YELLOW}Express${RESET}`);
    console.log(`${RED}  --> ${YELLOW}Express-Favicon${RESET}`);
    console.log(".");
}


function get_ipv4() {
    var ifaces = os.networkInterfaces();
    for(const iface in ifaces) {
        for(const ix in ifaces[iface]) {
            let addr = ifaces[iface][ix];
            if(!addr.internal && addr.family === "IPv4") {
                return addr.address;
            }
        }
    }
}
