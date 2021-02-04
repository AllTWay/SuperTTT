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

    get_socket() {
        if(!this.has_socket()) {
            // return;
            throw "Client has no established connection";
        }
        return this.socket
    }


    // Send message to connected socket
    send(msg, content) {
        this.get_socket().emit(msg, content);
    }

    // Subscribe to room messages
    subscribe(room_id) {
        this.get_socket().join(room_id);
    }
}


module.exports = Session
