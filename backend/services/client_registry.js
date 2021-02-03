"use strict";

const crypto = require('crypto');
const Session = require('../domain/session');


class ClientRegistryService {
    constructor() {
        this.sessions = {};                     // all established sessions
        this.connected_sessions = {};           // sessions by socket_id
    }

    session_exists(session_id) {
        return session_id in this.sessions;
    }

    get_session(session_id) {
        if (!this.session_exists(session_id)) {
            return false;
        } else {
            return this.sessions[session_id];
        }
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
    connect(session, socket) {
        let session_id = session.get_id();
        if(!this.session_exists(session_id)) {
            throw "Failed to connect non-existent session";
        }

        session.connect(socket);
        this.connected_sessions[socket.id] = session
    }

    get_socket_session(socket_id) { 
        if(!socket_id in this.connected_sessions) {
            throw "Socket not registered";
            return;
        }
        return this.connected_sessions[socket_id];
    }
}

module.exports = new ClientRegistryService();
