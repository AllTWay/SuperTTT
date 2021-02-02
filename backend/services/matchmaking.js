'use strict';

const shortid = require('shortid');
const { log, DEBUG, SUCCESS, ERROR, WARNING } = require('../logging');
const super_ttt = require("../super_ttt");
const {
    X, 
    O, 
    SPEC 
} = require('../globals');

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


function join_queue() {
    if(waiting_room) { // room available
        let chosen = waiting_room;
        log(`Joined MM room ${chosen}`, SUCCESS);
        waiting_room = false;
        return chosen;
    } else {
        waiting_room = create_room();
        log(`Created MM room ${waiting_room}`, SUCCESS);
        return waiting_room;
    }
}


function create_party() {
    let room_id = create_room();
    log(`Created Party room ${room_id}`, SUCCESS);
    return room_id;
}


function room_exists(room_id) {
    return room_id in rooms;
}


function send_game(psock, game, role) {
    // Inform client of its role and current game state
    psock.emit('setup', {
        'role': role,
        'board': game.get_board(),
        'next_player': game.get_next_player(),
        'valid_squares': game.get_valid_squares(),
    });
}

function join_game(room_id, player_id, client_socket) {

    if(!room_exists(room_id)) {
        log("Player connected to non-existing room. Redirecting...", WARNING);
        client_socket.emit('redirect', {destination: "/"});
        return;
    }

    log(`[${room_id}]: New player (${player_id})`, SUCCESS)

    // Join virtual room
    client_socket.join(room_id);

    // Register player
    players[player_id] = {
        'socket': client_socket,
        'room': room_id
    };

    let room = rooms[room_id];
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
            room[Math.random() >= 0.5 ? X : O] = player_id;
            break;
        case 1:
            // Check which role is empty and assign it to second player
            if(X in room) {
                room[O] = player_id;
            } else {
                room[X] = player_id;
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

            if(waiting_room === room_id) {
                waiting_room = false;
            }

            break;
        default:
            // Assign spectator
            log("\tGot Spectator");
            room['spectators'].push(player_id);
            game = room['game']
            send_game(client_socket, game, SPEC);
            break;
    }
}

function play(io, room_id, player_id, client_socket, position) {

    if(!room_exists(room_id)) {
        log("Player connected to non-existing room. Redirecting...", WARNING);
        client_socket.emit('redirect', {destination: "/"});
        return;
    }

    let room = rooms[room_id]

    let player = false;
    if(room[X] == player_id)        player = X;
    else if(room[O] == player_id)   player = O;

    if(!player) {
        // Player is not playing!
        log(`Non-player (${player_id}) tried to play in room ${room_id}`, WARNING);
        return;
    }

    let game = room['game'];
    log(`{${room_id}} ${player} played ${position}`, SUCCESS);

    let errors = game.play(player, position);
    // log(game.get_history());

    if(errors.length === 0) {
        io.to(room_id).emit('new-play', {
            'player': player,
            'position': position,
            'valid_squares': game.get_valid_squares(),
        });

        if(game.get_valid_squares().length === 0) {
            // Game over
            log(`GG: ${game.get_winner() ? game.get_winner() + " wins": "Tie"}`);
            io.to(room_id).emit('gg', {
                'winner': game.get_winner(),
            });
        }
    } else {
        log("\tSending errors:");
        for(const e of errors) {
            log(`\t\t${e}`);
        }

        client_socket.emit('invalid-play', errors);
    }
}


function disconnected(player_id) {
    if(!(player_id in players)) {
        return;
    }
    
    let room_id = players[player_id]['room'];

    // Delete from players
    delete players[player_id]

    if(!(room_id in rooms)) {
        // Disconnecting from non existing room
        // (When one player disconnects, every other disconnects from same room)
        return;
    }

    log(`${socket.id} disconnected from room ${room_id}`, WARNING);

    let room = rooms[room_id];
    

    if(room['spectators'].includes(player_id)) { // Spectator disconnected
        // Remove from spectators
        let idx = room['spectators'].indexOf(player_id);
        room['spectators'].splice(idx, 1);
        
    } else { // Player disconnected
        log(`Player ${socket.id} disconnected`, WARNING);

        io.to(room_id).emit('user-left');
        delete rooms[room_id];
    }
}

module.exports = {
    join_queue,
    create_party,
    room_exists,
    join_game,
    play,
    disconnected
}
