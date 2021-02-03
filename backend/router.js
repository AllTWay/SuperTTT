'use strict';
const cookie = require('cookie');
const room_management = require("./services/room_management");
const client_registry = require("./services/client_registry");

const { FRONTEND } = require('./globals');

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
        let room = room_management.join_queue(io);
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
            // get session_id
            let socket_cookies = cookie.parse(
                socket.handshake.headers.cookie || 
                socket.request.headers.cookie);
            let session_id = socket_cookies['sessionId'];
            console.log(`Session ${session_id} connected (socket ${socket.id})!`);

            let session = client_registry.get_session(session_id);
            if(session === false) {
                socket.emit('redirect', {destination: "/"});
                return;
            }

            client_registry.connect(session, socket);

            let room_id = room_id_from_url(socket.request.headers.referer);
            room_management.join_game(session, room_id);
        }

        function handle_play(msg) {
            let room_id = room_id_from_url(socket.request.headers.referer);
            let session = client_registry.get_socket_session(socket.id);

            let position = msg.position;
            let errors = room_management.play(io, room_id, session, msg);
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

        function handle_disconnect() {
            return;
            // room_management.disconnected(io, socket.id);
        }
    }

}

module.exports = { router };
