"use strict";

const crypto = require('crypto');
const Session = require('../domain/session');
const Connection = require('../domain/connection');


class ClientRegistryService {
    constructor() {
        this.sessions = {};     // Established Sessions
        this.connections = {};  // Established Connections
    }

    session_exists(session_id) {
        return session_id in this.sessions;
    }

    connection_exists(connection_id) {
        return connection_id in this.connections;
    }

    get_session(session_id) {
        if (!this.session_exists(session_id)) {
            throw "Failed to get non existing session";
        }
        return this.sessions[session_id];
    }

    get_connection(connection_id) {
        if(!this.connection_exists(connection_id)) {
            throw "Failed to get non existing connection";
        }
        return this.connections[connection_id];
    }

    // Checks request cookie (validates if session exists)
    check_request(session_cookie) {
        if(session_cookie === undefined ||      // no cookie
        !(session_cookie in this.sessions)) {   // or non existing session
            let session_id = crypto.randomUUID();
            this.sessions[session_id] = new Session(session_id);
            return session_id;
        }
        return true;
    }

    // Associates a session to a socket
    connect(session_id, socket) {
        try {
            let session = this.get_session(session_id);
            let connection = new Connection(session, socket);
            let id = socket.id;
            this.connections[id] = connection;
            console.log(`${session_id} connected with ${socket.id}`);
            return connection;
        } catch (e) {
            throw `Failed to connect session\n\t${e}`;
        }
    }

    disconnect(socket_id) {
        try {
            let connection = this.get_connection(socket_id);

            // Just deletes from this.connections
            // The connection object still exists
            delete this.connections[socket_id];
            return connection;
        } catch (e) {
            throw `Failed to disconnect socket\n\t${e}`;
        }
    }
}

module.exports = new ClientRegistryService();
