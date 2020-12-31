"use strict";

// Server
var os = require("os");
var path = require("path");

var express = require("express");
var app = express();
var http = require('http').createServer(app);
var favicon = require("express-favicon");

var socket = require("socket.io");
var io = socket(http);

const shortid = require('shortid');

const X = 'X';
const O = 'O';
const SPEC = 'SPECTATOR';


// Database
// const firebase = require("firebase/app");
// require('firebase/database');
// var firebaseConfig = require("./firebase_config.js");
// firebase.initializeApp(firebaseConfig);
// var database = firebase.database();

// Game
var super_ttt = require("./super_ttt.js");

const PORT = 8080;
const FAVICON = __dirname + "/../frontend/assets/img/hashtag.png";
const FRONTEND = path.resolve(__dirname, "..", "frontend");


var players = {};
var rooms = {};
var waiting_room = false;
/*
players =  {
    sock_id: {
        socket: <socket_obj>,
        room: roomid // key of rooms
    }
}

rooms = {
    roomid: {
        roles: ['X', 'O'], // or vice versa
        players: [sock_id1, sock_id2], // keys of players
        spectators: [..., sock_id_x, ...],
        game: <game_obj>
    }
}
*/

function print_queue() {
    let res = [];
    for(let p of queue) {
        res.push(p.id);
    }
    console.log("[*] Queue:");
    console.log(res);
}

function create_room() {
    // find unique ID (make 100% sure)
    let id;
    let ids = Object.keys(rooms);
    do {
        id = shortid.generate();
        console.log(`Trying ${id}`);
    } while (ids.includes(id));

    rooms[id] = {
        'players': [],
        'spectators': []
    };
    return id;
}

function get_roomid(url) {
    return url.split('/').slice(-1)[0];
}

// Prevent MIME TYPE error by making html
// directory static and therefore usable
app.use(express.static(FRONTEND));

// use FRONTEND files when in route `/game`
app.use('/game', express.static(FRONTEND));

// Set favicon
app.use(favicon(FAVICON));

// log_dependencies();

// Run server
http.listen(PORT, log_running);


// ===========================================
//             HTTP handlers
// ===========================================
app.get("/", handle_main);
app.get("/play", handle_play);
app.get("/party", handle_party);
app.get("/game/:roomid", handle_join);
// app.get("/games", handle_games);
app.get("*", handle_default);

function handle_main(req, res) {
    var options = {
        root: FRONTEND,
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.sendFile("menu.html", options, (err) => {
        if(err) {
            console.log(err);
            res.end();
        }
    });
}

function handle_play(req, res) {
    if(!waiting_room) { // no room available
        console.log("creating new room");
        waiting_room = create_room();
        res.redirect(`game/${waiting_room}`);
        console.log(`[+] Created MM room ${waiting_room}`);
    } else {
        res.redirect(`game/${waiting_room}`);
        console.log(`[+] Joined MM room ${waiting_room}`);
        waiting_room = false;
    }
}


function handle_party(req, res) {
    let roomid = create_room();
    console.log(`[+] Created Party room ${roomid}`);

    res.redirect(`game/${roomid}`);
}

function handle_join(req, res) {
    let roomid = req.params.roomid;

    // invalid room -> redirect to home page
    if(!Object.keys(rooms).includes(roomid)) {
        console.log(`[-] User tried to join non-existing room #${roomid}`);
        res.redirect("/");
        return;
    }

        
    var options = {
        root: FRONTEND,
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.sendFile("gameboard.html", options, (err) => {
        if(err) {
            console.log(err);
            res.end();
        }
    });
}

// async function handle_games(req, res) {
//     res.statusCode = 200;
//     res.setHeader("Content-Type", "application/json");
//     let hist = await get_all_games();
//     res.send(JSON.stringify(hist, null, 4));
// }

function handle_default(req, res) {
    console.log(`[!] Got bad request (${req.path}). Redirecting...`);
    res.redirect("/");
}


// ===========================================
//             Socket.io handlers
// ===========================================
io.on('connection', handle_connection);

function handle_connection(socket) {
    console.log("Connected socket!");
    handle_connect();

    // Set socket event handlers
    socket.on('play', handle_play);
    socket.on('new-game', handle_new_game);
    socket.on('disconnect', handle_disconnect);

    // Socket event handlers
    function handle_connect() {

        // aux function used to send game status
        function send_game(psock, game, role) {
            // inform client of its role and current game state
            psock.emit('setup', {
                'role': role,
                'board': game.get_board(),
                'next_player': game.get_next_player(),
                'valid_squares': game.get_valid_squares(),
            });
        }

        // check if room exists
        let roomid = get_roomid(socket.request.headers.referer);
        if(!Object.keys(rooms).includes(roomid)) {
            console.log("[-] Socket connected to invalid room. Redirecting...");
            socket.emit('redirect', {destination: "/"});
            return;
        }

        console.log(`[+] New conn: ${socket.id} in room ${roomid}`)

        // join virtual socket room
        socket.join(roomid);

        // register player
        players[socket.id] = {
            socket: socket,
            room: roomid
        };

        let room = rooms[roomid];
        let nplayers = 0;
        let game;
        
        for(const role of [X, O] ) {
            if(role in room) {
                nplayers++;
            }
        }
        switch(nplayers) {
            case 0:
                // Assign random role to first player
                room[Math.random() >= 0.5 ? X : O] = socket.id;
                break;
            case 1:
                // Check which role is empty and assign it to second player
                if(X in room) {
                    room[O] = socket.id;
                } else {
                    room[X] = socket.id;
                }
                room['spectators'] = [];

            if(room['players'].length == 2) { // all players joined
                console.log("\tGot full lobby");
                let game = new super_ttt();
                room['roles'] = Math.random() >= 0.5 ? ['X', 'O'] : ['O', 'X'];
                room['game'] = game;
                
                for(let i = 0; i < 2; i++) {
                    let player_id = room['players'][i];
                    let psock = players[player_id]['socket'];
                    let role = room['roles'][i];

                    console.log(`\tP${i+1} (${player_id}): ${role}`);

                for(const role of [X, O]) {
                    log(`\t${role}: ${room[role]}`);
                    const psock = players[room[role]]['socket'];
                    send_game(psock, game, role);
                }

                // Use case:
                // User1: Play -> waiting_room created
                // User2: joins waiting_room via link
                // User3: Play -> joins waiting_room (Spectator!!)
                // FIXED: when full lobby, clear it
                if(waiting_room === roomid) {
                    waiting_room = false;
                }
            }

        } else { // new spectator
            console.log("\tGot Spectator");
            room['spectators'].push(socket.id);
            let game = room['game']
            send_game(socket, game, 'SPECTATOR');
        }
    }

    function handle_play(msg) {
        let roomid = get_roomid(socket.request.headers.referer);
        let room = rooms[roomid]
        let players = room['players'];

        let player = false;
        if(room[X] == socket.id)        player = X;
        else if(room[O] == socket.id)   player = O;

        if(!player) {
            // Player is not playing!
            log(`Non-player (${socket.id}) tried to play in room ${roomid}`, WARNING);
            return;
        }

        let player = room['roles'][idx];
        let position = msg.position;
        let game = room.game;
        console.log(`[+] {${roomid}} ${player} played ${position}`);

        let errors = game.play(player, position);
        // console.log(game.get_history());

        if(errors.length === 0) {
            io.to(roomid).emit('new-play', {
                'player': player,
                'position': position,
                'valid_squares': game.get_valid_squares(),
            });

            if(game.get_valid_squares().length === 0) {
                // game over
                console.log(`GG: ${game.get_winner() ? game.get_winner() + " wins": "Tie"}`);
                io.to(roomid).emit('gg', {
                    'winner': game.get_winner(),
                });
            }
        } else {
            console.log("\tSending errors:");
            for(const e of errors) {
                console.log(`\t\t${e}`);
            }

            socket.emit('invalid-play', errors);
        }
    }

    function handle_new_game() {
        if(!(socket.id in players)) {
            console.log("Non-player asking for a new game");
            return;
        }
        
        // TODO: confirm with both players before creating new game
        const roomid = players[socket.id]['room'];
        if(!(roomid in rooms)) {
            console.log("room does not exist!");
            return;
        }
        const game_players = rooms[roomid]['players']
        let opponent = rooms[roomid]['players'][socket.id == game_players[0] ? 1 : 0];
        console.log(`Opponent of ${socket.id}: ${opponent}`);
        
        
        // persist_game(players[socket.id].game);
        console.log("Creating new game");
        let game = new super_ttt();
        players[socket.id].game = game;
        players[opponent].game = game;

        io.emit('state', {
            'board': game.get_board(),
            'next_player': game.get_next_player(),
            'valid_squares': game.get_valid_squares(),
        });
    }

    function handle_disconnect() {
        let roomid = get_roomid(socket.request.headers.referer);

        // delete from players
        if(socket.id in players) {
            delete players[socket.id]
        }

        if(!Object.keys(rooms).includes(roomid)) {
            // disconnecting from non existing room
            return;
        }

        console.log(`[-] ${socket.id} disconnected from room ${roomid}`);

        let room = rooms[roomid];
        
        if(room['players'].includes(socket.id)) { // player disconnected
            console.log('player disconnected');

            io.to(roomid).emit('user-left');
            delete rooms[roomid];

        } else { // spectator disconnected
            // remove from spectators
            let idx = room['spectators'].indexOf(socket.id);
            room['spectators'].splice(idx, 1);
        }
    }
}

// ===========================================
//             Database stuff
// ===========================================


async function persist_game(game) {
    return;
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
    return;
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
