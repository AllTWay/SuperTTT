"use strict";

const { log, DEBUG, SUCCESS, ERROR, WARNING } = require('../logging');
const { X, O, SuperTTT } = require("./super_ttt");
const RoomMember = require("./room_member");

const SPEC = "Spectator";

const RECONNECT_TIMEOUT = 5 * 60 * 1000 // 5 minutes in milliseconds

/**
 * Represents a logical game room
 * These rooms can have up to 2 players 
 * and n spectators.
 *
 * A room manages the game played in it
 */
class Room {

    constructor(id, io_handle) {
        this.id = id;
        this.io = io_handle;

        this.game = false;
        // this.game_history = [];


        this.players = {};
        this.spectators = [];

        // Stores disconnected members, waiting
        // for them to connect again
        this.disconnected = {}
        this.disconnect_time = false;
    }

    get_id() { return this.id; }

    broadcast(e, msg) {
        this.io.to(this.id).emit(e, msg);
    }

    send_game_setup(member) {
        member.send('setup', {
            'role': member.get_role(),
            'board': this.game.get_board(),
            'next_player': this.game.get_next_player(),
            'valid_squares': this.game.get_valid_squares(),
        });
    }

    choose_next_role() {
        if (this.is_full()) {
            throw "Failed to generate next role: Room is full";
        }
        if (Object.keys(this.players).length == 1) {
            // already got a player. Choose the other role
            const player = this.players[Object.keys(this.players)[0]];
            return player.get_role() === X ? O : X;
        } else {
            return Math.random() > 0.5 ? X : O;
        }
    }


    // Will be run to check if the room has activity
    // A room is inactive if both players have been
    // disconnected for longer than RECONNECT_TIMEOUT
    is_active() {
        for(const player in Object.values(this.players)) {
            if(!player.is_disconnected()) {
                return true;
            }
        }

        return Date.now() - this.disconnect_timestamp <= RECONNECT_TIMEOUT
    }

    // A room is full if it has two players
    is_full() {
        return Object.keys(this.players).length == 2;
    }

    join(new_connection) {
        new_connection.subscribe(this.id);

        if(!this.is_full()) {
            const cid = new_connection.get_id();

            if(cid in this.players) {
                throw "Connection connected twice to same room";
            }

            const player = new RoomMember(new_connection, this.choose_next_role());
            this.players[cid] = player;
            

            if(this.is_full()) {
                // New player filled the room. Starting game
                this.game = new SuperTTT();
                for(const member of Object.values(this.players)) {
                    this.send_game_setup(member);
                }
            }
        } else {
            const sid = new_connection.get_session_id();
            if(sid in this.disconnected) {
                // member is reconnecting
                const member = this.disconnected[sid];
                delete this.disconnected[sid];

                // remove old id
                const old_id = member.get_id();
                delete this.players[old_id];

                // insert new id
                member.reconnect(new_connection);
                this.players[member.get_id()] = member;

                this.send_game_setup(member);
            } else {
                // new spectator joining
                const spectator = new RoomMember(new_connection, SPEC);
                this.spectators.push(spectator);
                this.send_game_setup(spectator);
                this.broadcast('n-spectators', {'spectators': this.spectators.length});
            }
        }
    }

    // returns whether a Player disconnected
    // (false if spectator or if room is not full)
    leave(connection) {
        let cid = connection.get_id();

        if(cid in this.players) {
            if(this.is_full()) {
                // player left while room was complete
                const member = this.players[cid];
                let sid = member.disconnect();
                this.disconnected[sid] = member;
                this.disconnect_timestamp = Date.now();
                this.broadcast('player-disconnected', {});
                return true;
            } else {
                // player left while room was incomplete
                delete this.players[cid];
            }

        } else {
            this.spectators = this.spectators.filter(
                spec => spec.get_id() !== cid
            );
            this.broadcast('n-spectators', {'spectators': this.spectators.length});
        }
        return false;
    }


    play(player_connection, msg) {

        if(this.game === false || !this.is_full()) {
            throw "Room is not ready to play";
        }

        if (!(player_connection.get_id() in this.players)) {
            log(`Non-player (${player_connection.get_id( )})tried to play in room ${this.id}`, WARNING);
            return;
        }

        const player = this.players[player_connection.get_id()];

        if (!'position' in msg) {
            log("Ignoring invalid play message");
            return;
        }

        const role = player.get_role();

        const position = msg['position'];
        const errors = this.game.play(role, position);

        if(errors.length > 0) {
            player_connection.send('invalid-play', errors);
            return;
        }

        this.broadcast('new-play', {
            'player': role,
            'position': position,
            'valid_squares': this.game.get_valid_squares(),
        });

        log(`[${this.id}] ${role} played ${position}`, SUCCESS);
        if(this.game.is_game_over()) {
            // Game over
            log(`GG: ${this.game.get_winner() ? this.game.get_winner() + " wins": "Tie"}`);
            this.broadcast('gg', {
                'winner': this.game.get_winner(),
            });
        }
    }
}

module.exports = Room;
