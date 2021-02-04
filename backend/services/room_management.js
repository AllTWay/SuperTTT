'use strict';

const Room = require('../domain/room');
const shortid = require('shortid');
const { log, DEBUG, SUCCESS, ERROR, WARNING } = require('../logging');

class RoomManagementService {

    constructor() {
        this.players = {};
        this.rooms = {};

        // False if no waiting room exists
        // else, room_id pointing to current waiting room
        this.waiting_room = false;
    }


    create_room(io) {
        let ids = Object.keys(this.rooms);
        while(true) {
            let id = shortid.generate();
            if(!ids.includes(id)) {
                this.rooms[id] = new Room(id, io.to(id));
                return id;
            }
        }
    }


    join_queue(io) {
        if(this.waiting_room) {
            let chosen = this.waiting_room;
            this.waiting_room = false;
            // log(`Joined MM room ${chosen}`, SUCCESS);
            return chosen;
        } else {
            this.waiting_room = this.create_room(io);
            // log(`Created MM room ${this.waiting_room}`, SUCCESS);
            return this.waiting_room;
        }
    }


    create_party(io) {
        let room_id = this.create_room(io);
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

        // TODO: maybe use getter that throws exception
        if(!this.room_exists(room_id)) {
            log("Session connected to non-existing room. Redirecting...", WARNING);
            session.send('redirect', {destination: "/"});
            return;
        }

        let room = this.rooms[room_id];
        room.join(session);
    }

    play(io, room_id, session, msg) {
        // TODO: maybe use getter that throws exception
        if(!this.room_exists(room_id)) {
            log("Player connected to non-existing room. Redirecting...", WARNING);
            session.send('redirect', {destination: "/"});
            return;
        }

        let room = this.rooms[room_id]
        room.play(io, session, msg);
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
