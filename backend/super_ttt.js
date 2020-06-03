"use strict"

const Board = require("./board.js");

const x = 'X';
const o = 'O';

class SuperTTT {
    constructor() {
        this.board = new Board(1);

        this.reset();
    }

    // not allowed to reset anymore.
    // keeping this method just in case
    reset() {
        this.board.reset();
        this.nextPlayer = x;
        this.winner = ' ';
        this.history = [];

        this.valid_plays = this.board.all_valid_plays();
    }

    get_next_player() {
        return this.nextPlayer;
    }

    get_winner() {
        return this.winner !== ' ' ? this.winner : false;
    }

    get_history() {
        return this.history;
    }

    get_valid_squares() {
        let res = [];
        for(const move of this.valid_plays) {
            let square = Math.floor(move/9);
            if(!(res.includes(square))) {
                res.push(square)
            }
        }
        return res;
    }

    get_board() {
        // board.toArray() returns [ [...], ..., [...]]
        // converting to flat array
        let res = [];
        let board_array = this.board.toArray();

        for(const big_cell of board_array) {
            for(const small_cell of big_cell) {
                res.push(small_cell);
            }
        }
        return res;
    }

    play(player, position) {
        // error checking
        // leaving it as an array. we may want to send several errors
        let errors = []; 
        if(player !== this.nextPlayer) {
            console.log("Not your turn!");
            errors.push("You can only play in your turn!");
            return errors;
        }
        if(!this.valid_plays.includes(position)) {
            console.log("Invalid play!");
            errors.push("You cannot play in that position!");
            return errors;
        }

        if(errors.length > 0) {
            return errors;
        }

        this.board.play(this.nextPlayer, position);
        this.history.push([player, position]);

        this.nextPlayer = (this.nextPlayer === x ? o : x);
        this.valid_plays = this.board.calc_valid_plays(position);
        this.winner = this.board.get_winner();


        console.log("New board:");
        console.log(this.board.toArray());
        console.log("Winner? " + this.board.get_winner());
        console.log("Valid moves:");
        console.log(this.valid_plays);
        console.log("Valid squares:");
        console.log(this.get_valid_squares());

        return []; // no errors! :D
    }
}

module.exports = SuperTTT;
