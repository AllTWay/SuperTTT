const shortid   = require('shortid');
const super_ttt = require("./super_ttt");

const {
    FRONTEND,

    X, O, SPEC
} = require('./globals');
const {
    log,
    DEBUG,
    SUCCESS,
    WARNING,
    ERROR,
} = require('./logging');

function router(app) {
    app.get("/", handle_main);
    app.get("/play", handle_play);
    app.get("/party", handle_party);
    app.get("/game/:roomid", handle_join);
    // app.get("/games", handle_games);
    app.get("*", handle_default);
}


var players = {};
var rooms = {};
var waiting_room = false;
function create_room() {
    // Find unique ID (make 100% sure)
    let id;
    let ids = Object.keys(rooms);
    do {
        id = shortid.generate();
        // log(`Trying ${id}`);
    } while (ids.includes(id));

    rooms[id] = {
        'id': id
    };
    return id;
}

function get_roomid(url) {
    return url.split('/').slice(-1)[0];
}

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
            log(err, ERROR)
            res.end();
        }
    });
}

function handle_play(req, res) {
    if(!waiting_room) { // No room available
        waiting_room = create_room();
        res.redirect(`game/${waiting_room}`);
        log(`Created MM room ${waiting_room}`, SUCCESS);
    } else {
        res.redirect(`game/${waiting_room}`);
        log(`Joined MM room ${waiting_room}`, SUCCESS);
        waiting_room = false;
    }
}


function handle_party(req, res) {
    let roomid = create_room();
    log(`Created Party room ${roomid}`, SUCCESS);

    res.redirect(`game/${roomid}`);
}

function handle_join(req, res) {
    let roomid = req.params.roomid;

    // Invalid room -> redirect to home page
    if(!Object.keys(rooms).includes(roomid)) {
        log(`User tried to join non-existing room #${roomid}`, WARNING);
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
            log(err, ERROR);
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
    log(`Got bad request (${req.path}). Redirecting...`, ERROR);
    res.redirect("/");
}


// ===========================================
//             Socket.io handlers
// ===========================================
function socket_handler(io) {
    io.on('connection', handle_connection);

    function handle_connection(socket) {
        handle_connect();

        // Set socket event handlers
        socket.on('play', handle_play);
        socket.on('new-game', handle_new_game);
        socket.on('disconnect', handle_disconnect);

        // Socket event handlers
        function handle_connect() {

            // Aux function used to send game status
            function send_game(psock, game, role) {
                // Inform client of its role and current game state
                psock.emit('setup', {
                    'role': role,
                    'board': game.get_board(),
                    'next_player': game.get_next_player(),
                    'valid_squares': game.get_valid_squares(),
                });
            }

            // Check if room exists
            let roomid = get_roomid(socket.request.headers.referer);
            if(!(roomid in rooms)) {
                log("Socket connected to invalid room. Redirecting...", WARNING);
                socket.emit('redirect', {destination: "/"});
                return;
            }

            log(`New conn: ${socket.id} in room ${roomid}`, SUCCESS)

            // Join virtual socket room
            socket.join(roomid);

            // Register player
            players[socket.id] = {
                'socket': socket,
                'room': roomid
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

                    log("\tGot full lobby");
                    game = new super_ttt();
                    room['game'] = game;

                    for(const role of [X, O]) {
                        log(`\t${role}: ${room[role]}`);
                        const psock = players[room[role]]['socket'];
                        send_game(psock, game, role);
                    }

                    if(waiting_room === roomid) {
                        waiting_room = false;
                    }

                    break;
                default:
                    // Assign spectator to anyone else (if X and O are already assigned)
                    log("\tGot Spectator");
                    room['spectators'].push(socket.id);
                    game = room['game']
                    send_game(socket, game, SPEC);
                    break;
            }
        }

        function handle_play(msg) {
            let roomid = get_roomid(socket.request.headers.referer);

            if(!(roomid in rooms)) return;

            let room = rooms[roomid]

            let player = false;
            if(room[X] == socket.id)        player = X;
            else if(room[O] == socket.id)   player = O;

            if(!player) {
                // Player is not playing!
                log(`Non-player (${socket.id}) tried to play in room ${roomid}`, WARNING);
                return;
            }

            
            let position = msg.position;
            let game = room['game'];
            log(`{${roomid}} ${player} played ${position}`, SUCCESS);

            let errors = game.play(player, position);
            // log(game.get_history());

            if(errors.length === 0) {
                io.to(roomid).emit('new-play', {
                    'player': player,
                    'position': position,
                    'valid_squares': game.get_valid_squares(),
                });

                if(game.get_valid_squares().length === 0) {
                    // Game over
                    log(`GG: ${game.get_winner() ? game.get_winner() + " wins": "Tie"}`);
                    io.to(roomid).emit('gg', {
                        'winner': game.get_winner(),
                    });
                }
            } else {
                log("\tSending errors:");
                for(const e of errors) {
                    log(`\t\t${e}`);
                }

                socket.emit('invalid-play', errors);
            }
        }

        function handle_new_game() {        
            // TODO: Confirm with both players before creating new game
            const roomid = players[socket.id]['room'];
            if(!(roomid in rooms)) {
                log("Room does not exist!", WARNING);
                return;
            }
            
            const room = rooms[roomid];
            
            // TODO: maybe shuffle roles
            
            // persist_game(players[socket.id].game);
            log("Creating new game", SUCCESS);
            let game = new super_ttt();
            room['game'] = game;

            io.emit('state', {
                'board': game.get_board(),
                'next_player': game.get_next_player(),
                'valid_squares': game.get_valid_squares(),
            });
        }

        function handle_disconnect() {
            if(!(socket.id in players)) {
                return;
            }
            
            let roomid = players[socket.id]['room'];

            // Delete from players
            delete players[socket.id]

            if(!(roomid in rooms)) {
                // Disconnecting from non existing room
                // (When one player disconnects, every other disconnects from same room)
                return;
            }

            log(`${socket.id} disconnected from room ${roomid}`, WARNING);

            let room = rooms[roomid];
            

            if(room['spectators'].includes(socket.id)) { // Spectator disconnected
                // Remove from spectators
                let idx = room['spectators'].indexOf(socket.id);
                room['spectators'].splice(idx, 1);
                
            } else { // Player disconnected
                log(`Player ${socket.id} disconnected`, WARNING);

                io.to(roomid).emit('user-left');
                delete rooms[roomid];
            }
        }
    }
}

module.exports = { router, socket_handler };
