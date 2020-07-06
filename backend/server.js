"use strict";

const PORT = 8080;
const FAVICON = __dirname + "/../frontend/assets/img/hashtag.png";
const FRONTEND = __dirname + "/../frontend";


// Server
var os = require("os");

var express = require("express");
var app = express();
var http = require('http').createServer(app);
var favicon = require("express-favicon");

var socket = require("socket.io");
var io = socket(http);


// Database
const firebase = require("firebase/app");
require('firebase/database');
var firebaseConfig = require("./firebase_config.js");
firebase.initializeApp(firebaseConfig);
var database = firebase.database();


// Game
var super_ttt = require("./super_ttt.js");
// var game = new super_ttt(); // TODO: remove


// TODO: use server-generated cookie. the session may break and the same player may connect
// with a different socketId.
var players = {};
var queue = [];

function print_queue() {
    let res = [];
    for(let p of queue) {
        res.push(p.id);
    }
    console.log(`[*] Queue:`);
    console.log(res);
}

// Prevent MIME TYPE error by making html directory static and therefore usable
app.use(express.static(FRONTEND));

// Set favicon
app.use(favicon(FAVICON));

// HTTP request handling
app.get("/", handle_main);
app.get("/games", handle_games);
app.get("*", handle_default);

// Socket event handling
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
    res.send(JSON.stringify(hist, null, 4));
}

function handle_default(req, res) {
    res.redirect("/");
}

function handle_connection(socket) {
    handle_connect();

    // Set socket event handlers
    socket.on('disconnect', handle_disconnect);
    socket.on('play', handle_play);
    socket.on('new-game', handle_new_game);

    // Socket event handlers
    function handle_connect() {
        console.log(`[+] New connection: ${socket.id}`)

        if(queue.length == 0) {
            queue.push(socket);

        } else {
            let p1 = queue.shift();
            let p2 = socket;

            let game = new super_ttt();
            let room = `room_${p1.id}`;
            let roles = Math.random() >= 0.5 ? ['X', 'O'] : ['O', 'X'];

            register_player(p1, room, game, roles[0], p2.id);
            register_player(p2, room, game, roles[1], p1.id);

            p1.join(room);
            p2.join(room);

            console.log(`[+] Match found: ${p1.id} vs ${p2.id}`);
            console.log(players);
        }

        print_queue();
    }

    function register_player(psock, room, game, role, opponent) {
        players[psock.id] = {
            'room': room,
            'game': game,
            'role': role,
            'opponent': opponent
        };

        console.log(`registering ${psock.id}: ${players[psock.id].role}`);

        // inform client of its role and current game state
        psock.emit('setup', {
            'role': role,
            'board': game.get_board(),
            'next_player': game.get_next_player(),
            'valid_squares': game.get_valid_squares(),
        });
    }

    function handle_disconnect() {
        // TODO: ??? what happens when playing disconnects?

        // if(socket.id in players) {
            // delete players[socket.id]
        // }

        // remove from queue
        for(let i = 0; i < queue.length; i++) {
            if(queue[i].id === socket.id) {
                queue.splice(i, 1);
            }
        }

        console.log(`[-] ${socket.id} disconnected`);
        print_queue();
    }

    function handle_play(msg) {
        if(!(socket.id in players)) {
            // player is not playing!
            console.log("Non-player tried to play!");
            return;
        }

        let player = players[socket.id].role;
        let position = msg.position;
        let game = players[socket.id].game;
        let room = players[socket.id].room;

        let errors = game.play(player, position);
        // console.log(game.get_history());

        if(errors.length === 0) {
            io.to(room).emit('new-play', {
                'player': player,
                'position': position,
                'valid_squares': game.get_valid_squares(),
            });

            if(game.get_valid_squares().length === 0) {
                // game over
                console.log(`GG: ${game.get_winner() ? game.get_winner() + " wins": "Tie"}`);
                io.to(room).emit('gg', {
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

        persist_game(players[socket.id].game);

        console.log("Creating new game");

        let game = new super_ttt();
        let opponent = players[socket.id].opponent;
        players[socket.id].game = game;
        players[opponent].game = game;

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
