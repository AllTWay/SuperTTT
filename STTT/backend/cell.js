"use strict"

class Cell {
    constructor() {
        this.winner = ' ';
    }

    get_winner() { return this.winner; }

    play(player, position) {
        if(this.winner !== ' ') {
            throw "Invalid play!";
        }

        this.winner = player;
    }

    toArray() {
        return this.winner;
    }

    toJSON() {
        return this.winner;
    }
}

module.exports = Cell;
