'use strict';

const Room = require('../domain/room');
const shortid = require('shortid');
const { log, DEBUG, SUCCESS, ERROR, WARNING } = require('../logging');

class RoomManagementService {

    constructor() {
        this.rooms = {};

        // False if no waiting room exists
        // else, room_id pointing to current waiting room
        this.waiting_room = false;
    }

    room_exists(room_id) {
        return room_id in this.rooms;
    }

    get_room(room_id) {
        if(!this.room_exists(room_id)) {
            throw "Room does not exist"
        }
        return this.rooms[room_id];
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
            return chosen;
        } else {
            this.waiting_room = this.create_room(io);
            return this.waiting_room;
        }
    }


    create_party(io) {
        let room_id = this.create_room(io);
        return room_id;
    }


    join_game(session, room_id) {
        try {
            let room = this.get_room(room_id);
            room.join(session);
        } catch (e) {
            throw `Failed to join game: ${e}`;
        }
    }

    play(room_id, session, msg) {
        try {
            let room = this.get_room(room_id);
            room.play(session, msg);
        } catch (e) {
            throw `Failed to play: ${e}`;
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
