"use strict";

/**
 * Represents a client session.
 * Each session is created when a client
 * connects to the server. It may be 
 * associated with a registered user
 */
class Session {
    constructor(id) {
        this.id = id;
    }

    get_id() { return this.id; }

}


module.exports = Session
