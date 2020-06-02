// class for recursive tic tac toe logic
"use strict"

var Cell = require("./cell.js");

class Board {
    constructor(level = 0) {
        if(level < 0) {
            throw "Invalid level for board!";
        }
        this.level = level; // set recursion level
        this.board = [];
        this.winner = ' ';

        this.reset();
    };

    reset() {
        this.board = []
        this.winner = ' ';

        if(this.level === 0) { // basic board
            for(let i = 0; i < 9; i++) {
                this.board.push(new Cell());
            }
        } else {
            for(let i = 0; i < 9; i++) {
                this.board.push(new Board(this.level-1));
            }
        }
    }

    get_winner() {
        return this.winner;
    }

    // places player's symbol in determined position
    play(player, position) {
        // ignores "next player". It is the game manager's responsibility
        if(this.winner !== ' ') {
            throw "Board already has a winner";
        }

        if(position >= Math.pow(9, this.level+1)) {
            console.log(Math.pow(9, this.level+1));
            throw "Position out of range";
        }

        let div = Math.pow(9, this.level);
        let cell_ix = Math.floor(position / div);
        let new_ix = position % div;

        // console.log(div);
        // console.log(cell_ix);
        // console.log(new_ix);

        // console.log("redirecting to board[" + cell_ix + "][" + new_ix + "]");
        this.board[cell_ix].play(player, new_ix);

        this.check_winner();
    }

    check_winner() {
        // rows
        for(let i = 0; i <= 6; i+= 3) {
            if(this.board[i].get_winner() !== ' '
            && this.board[i].get_winner() === this.board[i+1].get_winner()
            && this.board[i].get_winner() === this.board[i+2].get_winner()
            ) {
                this.winner = this.board[i].get_winner();
                return;
            }
        }
        // columns
        for(let i = 0; i <= 2; i++) {
            if(this.board[i].get_winner() !== ' '
            && this.board[i].get_winner() === this.board[i+3].get_winner()
            && this.board[i].get_winner() === this.board[i+6].get_winner()
            ) {
                this.winner = this.board[i].get_winner();
                return;
            }
        }

        // diagonals
        if(this.board[0].get_winner() !== ' '
        && this.board[0].get_winner() === this.board[4].get_winner()
        && this.board[0].get_winner() === this.board[8].get_winner()
        ) {
            this.winner = this.board[0].get_winner();
            return;
        }

        if(this.board[2].get_winner() !== ' '
        && this.board[2].get_winner() === this.board[4].get_winner()
        && this.board[2].get_winner() === this.board[6].get_winner()
        ) {
            this.winner = this.board[0].get_winner();
            return;
        }
    }

    calc_valid_plays(prev_play) {
        // assuming max level of 1;
        // assuming prev_play is valid

        // if game is over, there are no valid plays
        if(this.winner !== ' ') {
            return [];
        }

        let target_square = prev_play % 9;
        if(this.board[target_square].get_winner() === ' ') {
            // no winner for target
            return this.board[target_square].all_valid_plays().map(x => x+target_square*Math.pow(9, this.level));
        } else {
            // target is closed. player can choose where to play
            return this.all_valid_plays();
        }
    }

    all_valid_plays() {
        // if game is over, there are no valid plays
        if(this.winner !== ' ') {
            return [];
        }

        let res = [];
        if(this.level === 0) {
            // return all empty cells
            for(let i = 0; i < 9; i++) {
                if(this.board[i].get_winner() === ' ') {
                    res.push(i)
                }
            }
        } else {
            // return all open games empty cells
            for(let i = 0; i < 9; i++) {
                // the map() call is used to convert [0..8]
                // numbers into real indices
                res = res.concat(this.board[i].all_valid_plays().map(x => x+i*Math.pow(9, this.level)));
            }
        }

        return res;
    }

    toArray() {
        let res = [];
        this.board.forEach( cell => {
            res.push(cell.toArray())
        });
        return res;
    }

    toJSON() {
        let children = [];
        this.board.forEach( cell => {
            children.push(cell.toJSON())
        });

        return {
            'winner': this.winner,
            'board': children
        };
    }
};

module.exports = Board;
