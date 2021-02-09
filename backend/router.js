'use strict';
const cookie = require('cookie');
const room_management = require("./services/room_management");
const client_registry = require("./services/client_registry");

const { FRONTEND } = require('./globals');
const { log, DEBUG, SUCCESS, ERROR, WARNING } = require('./logging');

function room_id_from_url(url) {
    return url.split('/').slice(-1)[0];
}

function router(app, io) {
    app.get("/", handle_main);
    app.get("/play", handle_play);
    app.get("/party", handle_party);
    app.get("/game/:room_id", handle_join);
    // app.get("/games", handle_games);
    app.get("*", handle_default);


    io.on('connection', handle_connection);


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
                res.end();
            }
        });
    }

    function handle_play(req, res) {
        let session = client_registry.get_session(req.cookies.sessionId);
        let room = room_management.join_queue(io, session);
        res.redirect(`game/${room}`);
    }


    function handle_party(req, res) {
        let room = room_management.create_party(io);
        res.redirect(`game/${room}`);
    }

    function handle_join(req, res) {
        let room_id = req.params.room_id;

        // Invalid room -> redirect to home page
        if(!room_management.room_exists(room_id)) {
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
        res.redirect("/");
    }

    // ===========================================
    //             Socket.io handlers
    // ===========================================

    function handle_connection(socket) {
        handle_connect();

        // Set socket event handlers
        socket.on('play', handle_play);
        socket.on('new-game', handle_new_game);
        socket.on('disconnect', handle_disconnect);

        // Socket event handlers
        function handle_connect() {
            let socket_cookies = cookie.parse(
                socket.handshake.headers.cookie || socket.request.headers.cookie
            );

            let session_id = socket_cookies['sessionId'];
            let room_id = room_id_from_url(socket.request.headers.referer);
            
            // For now a socket is created only when joining a game
            // So we always join a room
            try {
                let connection = client_registry.connect(session_id, socket);
                room_management.join_room(room_id, connection);
            } catch(e) {
                log(`${e}. Redirecting to /`, ERROR);
                socket.emit('redirect', {destination: "/"});
                return;
            }
        }

        function handle_disconnect() {
            try {
                let connection = client_registry.disconnect(socket.id);
                room_management.leave_room(connection);
            } catch (e) {
                log(e, ERROR);
            }
        }

        function handle_play(msg) {
            try {
                let room_id = room_id_from_url(socket.request.headers.referer);
                let connection = client_registry.get_connection(socket.id);
                room_management.play(room_id, connection, msg);
            } catch (e) {
                log(`${e}. Redirecting to /`, ERROR);
                socket.emit('redirect', {destination: "/"});
                return;
            }
        }


        // TODO: Confirm with both players before creating new game
        function handle_new_game() {        
            return;
            /*
            const room_id = players[socket.id]['room'];
            if(!(room_id in rooms)) {
                return;
            }
            
            const room = rooms[room_id];
            
            // TODO: maybe shuffle roles
            
            // persist_game(players[socket.id].game);
            let game = new super_ttt();
            room['game'] = game;

            io.emit('state', {
                'board': game.get_board(),
                'next_player': game.get_next_player(),
                'valid_squares': game.get_valid_squares(),
            });
            */
        }
    }
}

module.exports = { router };
