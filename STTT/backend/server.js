"use strict";

const PORT = 8080;
const FAVICON = __dirname + "/../frontend/assets/img/hashtag.png";
const FRONTEND = __dirname + "/../frontend";

var os = require("os");

var express = require("express");
var app = express();
var http = require('http').createServer(app);
var favicon = require("express-favicon");

var socket = require("socket.io");
var io = socket(http);


var super_ttt = require("./super_ttt.js");
var game = new super_ttt();
var players = {};


// Prevent MIME TYPE error by making html directory static and therefore usable
app.use(express.static(FRONTEND));

// set favicon
app.use(favicon(FAVICON));

// http request handling
app.get("/", handle_main);
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

function handle_default(req, res) {
    res.redirect("/");
}

function handle_connection(socket) {
    console.log("New connection: Player " + socket.id);

    // give X, O or spectator to new connection
    let numPlayers = Object.keys(players).length
    if(numPlayers === 0) {
        // get random symbol
        let sym = Math.random() >= 0.5 ? 'X' : 'O';
        players[socket.id] = sym;
    } else if(numPlayers === 1) {
        // get remaining symbol
        let otherId = Object.keys(players)[0];
        let sym = players[otherId] === 'X' ? 'O' : 'X';
        players[socket.id] = sym;
    } else {
        // console.log("Got spectator");
    }

    // inform client of its role
    socket.emit('setup', {
        'role': (socket.id in players ? players[socket.id] : 'spectator'),
        'board': game.get_board(),
        'next_player': game.get_next_player(),
        'valid_squares': game.get_valid_squares(),
    });

    // console.log(players);


    // handle socket events
    // need to make anonymous function to keep
    // a reference to the disconnected socket
    socket.on('disconnect', () => {
        console.log(socket.id + " disconnected");
        if(socket.id in players) {
            delete players[socket.id]
        }
    });

    socket.on('play', (msg) => {
        let player = players[socket.id];
        let position = msg.position;
        let errors = game.play(player, position);

        if(errors.length === 0) {
            // TODO: inform winner

            io.emit('new-play', {
                'player': player,
                'position': position,
                'valid_squares': game.get_valid_squares(),
            });
        } else {
            console.log("Sending error");
            socket.emit('invalid-play', errors);
        }
    });
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
    console.log("+===================================+");
    console.log(`|  Starting STTT by ${CYAN}Blet&Blet Lda.${RESET}  |`);
    console.log("+==+================================+");
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
