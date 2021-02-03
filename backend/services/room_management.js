'use strict';

const shortid = require('shortid');
const { log, DEBUG, SUCCESS, ERROR, WARNING } = require('../logging');
const super_ttt = require("./super_ttt");
const {
    X, 
    O, 
    SPEC 
} = require('../globals');

class RoomManagementService {

    constructor() {
        this.players = {};
        this.rooms = {};
        this.waiting_room = false;
    }


    create_room() {
        // Find unique ID (make 100% sure)
        let id;
        // TODO: use `in`
        let ids = Object.keys(this.rooms);
        do {
            id = shortid.generate();
            // log(`Trying ${id}`);
        } while (ids.includes(id));

        this.rooms[id] = {
            'id': id
        };
        return id;
    }


    join_queue() {
        // TODO: when having a class Room, maybe we won't want to return it
        if(this.waiting_room) { // room available
            let chosen = this.waiting_room;
            log(`Joined MM room ${chosen}`, SUCCESS);
            this.waiting_room = false;
            return chosen;
        } else {
            this.waiting_room = this.create_room();
            log(`Created MM room ${this.waiting_room}`, SUCCESS);
            return this.waiting_room;
        }
    }


    create_party() {
        let room_id = this.create_room();
        log(`Created Party room ${room_id}`, SUCCESS);
        return room_id;
    }


    room_exists(room_id) {
        return room_id in this.rooms;
    }


    send_game(session, game, role) {
        // Inform client of its role and current game state
        session.send('setup', {
            'role': role,
            'board': game.get_board(),
            'next_player': game.get_next_player(),
            'valid_squares': game.get_valid_squares(),
        });
    }

    join_game(session, room_id) {

        if(!this.room_exists(room_id)) {
            log("Session connected to non-existing room. Redirecting...", WARNING);
            session.send('redirect', {destination: "/"});
            return;
        }

        log(`[${room_id}]: New player (${session.get_id()})`, SUCCESS)

        // Join virtual room
        session.join_room(room_id);

        let room = this.rooms[room_id];
        let nplayers = 0;
        let game;
        
        for(const role of [X, O] ) {
            if(role in room) {
                nplayers++;
            }
        }

        // let player_id = session.get_id();
        switch(nplayers) {
            case 0:
                // Assign random role to first player
                room['spectators'] = [];
                room[Math.random() >= 0.5 ? X : O] = session;
                break;
            case 1:
                // Check which role is empty and assign it to second player
                if(X in room) {
                    room[O] = session;
                } else {
                    room[X] = session;
                }

                log("\tGot full lobby");
                game = new super_ttt();
                room['game'] = game;

                for(const role of [X, O]) {
                    log(`\t${role}: ${room[role]}`);
                    this.send_game(room[role], game, role);
                }

                // TODO: why is this here? explain
                if(this.waiting_room === room_id) {
                    this.waiting_room = false;
                }

                break;
            default:
                // Assign spectator
                log("\tGot Spectator");
                room['spectators'].push(session);
                game = room['game']
                this.send_game(session, game, SPEC);
                break;
        }
    }

    play(io, room_id, session, msg) {

        if(!this.room_exists(room_id)) {
            log("Player connected to non-existing room. Redirecting...", WARNING);
            session.send('redirect', {destination: "/"});
            return;
        }

        let room = this.rooms[room_id]

        let player_id = session.get_id();
        let player = false;
        if      (room[X].get_id() == player_id) player = X;
        else if (room[O].get_id() == player_id) player = O;

        if(!player) {
            // Player is not playing!
            log(`Non-player (${player_id}) tried to play in room ${room_id}`, WARNING);
            return;
        }

        let game = room['game'];

        if(!'position' in msg) {
            log("Ignoring invalid play message");
            return;
        }
        let position = msg['position'];
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

            session.send('invalid-play', errors);
        }
    }


    // TODO: refactor
    /* disconnected(io, socket_id) {
        if(!(socket_id in players)) {
            return;
        }
        
        let room_id = players[socket_id]['room'];

        // Delete from players
        delete players[socket_id]

        if(!(room_id in rooms)) {
            // Disconnecting from non existing room
            // (When one player disconnects, every other disconnects from same room)
            return;
        }

        log(`${socket_id} disconnected from room ${room_id}`, WARNING);

        let room = rooms[room_id];
        

        if(room['spectators'].includes(socket_id)) { // Spectator disconnected
            // Remove from spectators
            let idx = room['spectators'].indexOf(socket_id);
            room['spectators'].splice(idx, 1);
            
        } else { // Player disconnected
            log(`Player ${socket_id} disconnected`, WARNING);

            io.to(room_id).emit('user-left');
            delete rooms[room_id];
        }
    }*/
}

module.exports = new RoomManagementService();
