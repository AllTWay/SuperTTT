"use strict";

class RoomMember {
    constructor(connection, role) {
        // id changes when player reconnects!
        // Stored in separate variable to keep id
        // when player is disconnected
        this.id = connection.get_id();
        this.session_id = connection.get_session_id();
        this.connection = connection;
        this.role = role;
    }

    get_id() { return this.id; }
    get_role() { return this.role; }
    get_session_id() { return this.session_id; }

    is_disconnected() { return this.connection === false; }

    send(e, content) {
        if(this.is_disconnected()) {
            throw "Could not send message to player: Player disconnected";
        }
        this.connection.send(e, content);
    }

    disconnect() {
        this.connection = false;
        return this.get_session_id();
    }
    reconnect(connection) { 
        this.connection = connection;
        this.id = this.connection.get_id();
    }
}

module.exports = RoomMember;
