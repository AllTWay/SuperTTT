"use strict"

const Board = require("./board.js");

const x = 'X';
const o = 'O';

class SuperTTT {
    constructor() {
        this.board = new Board(1);

        this.reset();
    }


    reset() {
        this.board.reset();
        this.nextPlayer = x;
        // this.winner = ' '; // ? should it be set?

        this.valid_plays = this.board.all_valid_plays();
    }


    play(player, position) {
        if(player !== this.nextPlayer) {
            console.log("Not your turn!");
            return false;
        }
        if(!this.valid_plays.includes(position)) {
            console.log("Invalid play!");
            // do other stuff
            return false;
        }

        this.board.play(this.nextPlayer, position);

        this.nextPlayer = (this.nextPlayer === x ? o : x);
        this.valid_plays = this.board.calc_valid_plays(position);
        this.winner = this.board.get_winner();


        console.log("New board:");
        console.log(this.board.toArray());
        console.log("Valid moves:");
        console.log(this.valid_plays);
    }
}

module.exports = SuperTTT;
