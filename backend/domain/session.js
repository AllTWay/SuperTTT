"use strict";

/**
 * Represents a client session, identifiable by
 * its unique identifier (set in cookies).
 *
 * It manages a socket, if the session is currently
 * connected to the server
 */
class Session {
    constructor(id) {
        this.id = id;
        this.socket = false;
    }

    get_id() { return this.id; }

    connect(socket) {
        this.socket = socket;
    }

    disconnect() {
        this.socket = false;
    }

    has_socket() {
        return this.socket !== false;
    }

    send(msg, content) {
        if(!this.has_socket()) {
            // return;
            throw "Client has no established connection";
        }
        this.socket.emit(msg, content);
    }

    // join roon
    join_room(room_id) {
        if(!this.has_socket()) {
            // return;
            throw "Client has no established connection";
        }
        this.socket.join(room_id);
    }
}


module.exports = Session
