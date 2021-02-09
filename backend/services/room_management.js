'use strict';

const Room = require('../domain/room');
const shortid = require('shortid');
const { log, DEBUG, SUCCESS, ERROR, WARNING } = require('../logging');

class RoomManagementService {

    constructor() {

        // Stores all existing rooms
        // rooms are stored by their unique id
        this.rooms = {};

        // False if no waiting room exists
        // else, room_id of current waiting room
        this.waiting_room = false;

        // stores the last room a session
        // disconnected from
        this.zombie_rooms = {};

        // association gets room that holds a 
        // specific connection
        this.connection_rooms = {};
    }

    room_exists(room_id) {
        return room_id in this.rooms;
    }

    has_connection(connection_id) {
        return connection_id in this.connection_rooms;
    }

    is_reconnecting(session_id) {
        return session_id in this.zombie_rooms;
    }

    get_room(room_id) {
        if(!this.room_exists(room_id)) {
            throw "Room does not exist"
        }
        return this.rooms[room_id];
    }

    get_connection_room(connection_id) {
        if(!this.has_connection(connection_id)) {
            throw "Connection does not exist"
        }
        return this.connection_rooms[connection_id];
    }

    create_room(io) {
        let ids = Object.keys(this.rooms);
        while(true) {
            let id = shortid.generate();
            if(!ids.includes(id)) {
                this.rooms[id] = new Room(id, io);
                return id;
            }
        }
    }

    join_queue(io, session) {
        if(this.waiting_room === false) {
            this.waiting_room = this.create_room(io);
        }
        return this.waiting_room;
    }

    create_party(io) {
        let room_id = this.create_room(io);
        return room_id;
    }

    join_room(room_id, connection) {
        try {
            let room = this.get_room(room_id);
            room.join(connection);

            // Remember which room this connection belongs to
            this.connection_rooms[connection.get_id()] = room;

            // check if waiting room is full
            if(room_id === this.waiting_room && room.is_full()) {
                this.waiting_room = false;
            }

            // check if reconnected (delete zombie session)
            let sid = connection.get_session_id();
            if(this.is_reconnecting(sid)) {
                delete this.zombie_rooms[sid];
            }
        } catch (e) {
            throw `Failed to join room: ${e}`;
        }
    }

    leave_room(connection) {
        let cid = connection.get_id();
        let room = this.get_connection_room(cid);
        delete this.connection_rooms[cid];

        let player_left = room.leave(connection);
        if(player_left) {
            let sid = connection.get_session_id();
            this.zombie_rooms[sid] = room;
        }
    }

    play(room_id, connection, msg) {
        try {
            let room = this.get_room(room_id);
            room.play(connection, msg);
        } catch (e) {
            throw `Failed to play: ${e}`;
        }
    }
}

module.exports = new RoomManagementService();
