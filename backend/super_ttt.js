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
        this.winner = ' '; // needs to be like this (recursion)
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
            // console.log("Invalid play!");
            errors.push("You cannot play in that position!");
            return errors;
        }

        if(errors.length > 0) {
            return errors;
        }

        this.board.play(this.nextPlayer, position);
        // this.history.push([player, position]);
        this.history.push(position); // save only the position

        this.nextPlayer = (this.nextPlayer === x ? o : x);
        this.valid_plays = this.board.calc_valid_plays(position);
        this.winner = this.board.get_winner();


        // console.log("New board:");
        // console.log(this.board.toArray());
        // console.log("Winner? " + this.board.get_winner());
        // console.log("Valid moves:");
        // console.log(this.valid_plays);
        // console.log("Valid squares:");
        // console.log(this.get_valid_squares());

        return []; // no errors! :D
    }
}

module.exports = SuperTTT;
