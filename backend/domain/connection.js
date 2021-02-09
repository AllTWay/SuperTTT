"use strict";

/** 
 * Represents a user connection.
 * Each session may have several connections
 * (e.g. multiple tabs opened)
 * Each connection belongs to a single Session
 * Each connection may only participate in a single room
 */
class Connection {
    constructor(session, socket) {
        this.id = socket.id;
        this.session = session;
        this.socket = socket;
    }

    get_id() { return this.id; }
    get_session() { return this.session; }
    get_session_id() { return this.session.get_id(); }

    send(e, content) {
        this.socket.emit(e, content);
    }

    subscribe(room_id) {
        this.socket.join(room_id);
    }
}

module.exports = Connection;
