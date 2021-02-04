"use strict";

const { log, DEBUG, SUCCESS, ERROR, WARNING } = require('../logging');
const { X, O, SuperTTT } = require("./super_ttt");

const SPEC = "Spectator";

/**
 * Represents a logical game room
 * These rooms have 2 players and n spectators
 *
 * A room manages the game played in it
 */
class Room {

    // constructor(id, io_handle) {
    constructor(id, io_handle) {
        this.id = id;
        this.io = io_handle;

        this.game = false;
        // this.game_history = [];

        this.X = false;
        this.O = false;
        this.spectators = [];
        this.nplayers = 0;
    }

    broadcast(e, msg) {
        this.io.emit(e, msg);
    }

    join(new_session) {

        // Make session listen for room events
        new_session.join_room(this.id);

        switch(this.nplayers) {
            case 0: // first player!!
                this.nplayers += 1;
                if(Math.random() >= 0.5) {
                    this.X = new_session;
                } else {
                    this.O = new_session;
                }
                break;

            case 1: // has already 1 waiting player
                this.nplayers += 1;
                if(this.X === false) {
                    this.X = new_session;
                } else if(this.O === false) {
                    this.O = new_session;
                } else {
                    throw "Room error: something went wrong while joining";
                }

                this.game = new SuperTTT();

                // TODO: make this beautiful
                this.X.send('setup', {
                    'role': X,
                    'board': this.game.get_board(),
                    'next_player': this.game.get_next_player(),
                    'valid_squares': this.game.get_valid_squares(),
                });
                this.O.send('setup', {
                    'role': O,
                    'board': this.game.get_board(),
                    'next_player': this.game.get_next_player(),
                    'valid_squares': this.game.get_valid_squares(),
                });

                break;

            default: // room is full: spectators only
                this.spectators.push(new_session);
                new_session.send('setup', {
                    'role': SPEC,
                    'board': this.game.get_board(),
                    'next_player': this.game.get_next_player(),
                    'valid_squares': this.game.get_valid_squares(),
                });
        }
    }

    play(player_session, msg) {
        let session_id = player_session.id;

        if(this.game === false || !this.X || !this.O) {
            log("Room is not ready to play");
            return;
        }

        let player = false;
        if      (this.X.get_id() == session_id) player = X;
        else if (this.O.get_id() == session_id) player = O;

        if (player === false) {
            log(`Non-player (${session_id}) tried to play in room ${this.id}`, WARNING);
            return;
        }

        if(!'position' in msg) {
            log("Ignoring invalid play message");
            return;
        }

        let position = msg['position'];

        let errors = this.game.play(player, position);
        if(errors.length > 0) {
            player_session.send('invalid-play', errors);
        } else {
            this.broadcast('new-play', {
                'player': player,
                'position': position,
                'valid_squares': this.game.get_valid_squares(),
            });

            log(`[${this.id}] ${player} played ${position}`, SUCCESS);
            if(this.game.get_valid_squares().length === 0) {
                // Game over
                log(`GG: ${this.game.get_winner() ? this.game.get_winner() + " wins": "Tie"}`);
                this.broadcast('gg', {
                    'winner': this.game.get_winner(),
                });
            }
        }
    }
}


module.exports = Room;
