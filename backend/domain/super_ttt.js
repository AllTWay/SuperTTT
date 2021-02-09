"use strict"

const X = "X";
const O = "O";

function check_winner(board) {
    // rows
    for(let i = 0; i <= 6; i+= 3) {
        if(board[i] !== false
        && board[i] === board[i+1]
        && board[i] === board[i+2]
        ) {
            return board[i];
        }
    }
    // columns
    for(let i = 0; i <= 2; i++) {
        if(board[i] !== false
        && board[i] === board[i+3]
        && board[i] === board[i+6]
        ) {
            return board[i];
        }
    }

    // diagonal \
    if(board[0] !== false
    && board[0] === board[4]
    && board[0] === board[8]
    ) {
        return board[4];
    }

    // diagonal /
    if(board[2] !== false
    && board[2] === board[4]
    && board[2] === board[6]
    ) {
        return board[4];
    }

    return false;
}

class SuperTTT {
    constructor() {
        // holds every game cell
        this.board = new Array(81);
        this.board.fill(false);

        // holds who wins in each board
        this.meta_board = new Array(9);
        this.meta_board.fill(false);

        // holds every playable cell
        this.valid_plays = Array(81).fill().map((_,i) => i);

        this.next_player = X;
        this.winner = false;
        this.history = [];
    }

    get_board() { return this.board; }
    get_valid_plays() { return this.valid_plays; }
    get_next_player() { return this.next_player; }
    get_winner() { return this.winner; }
    get_history() { return this.history; }

    get_valid_squares() {
        let res = [];
        for(const move of this.get_valid_plays()) {
            let square = Math.floor(move/9);
            if(!(res.includes(square))) {
                res.push(square)
            }
        }
        return res;
    }

    is_game_over() {
        return this.winner !== false || this.get_valid_plays().length === 0;
    }

    play(player, position) {
        let errors = []; 
        if(player !== this.next_player) {
            errors.push("You can only play in your turn!");
        }
        if(!this.valid_plays.includes(position)) {
            errors.push("You cannot play in that position!");
        }
        if(this.is_game_over()) {
            errors.push("Cannot play: Game over");
        }

        if(errors.length > 0) {
            return errors;
        }

        this.board[position] = player;

        // check if current small board got winner
        const base = position - (position % 9);
        const small_board = this.board.slice(base, base+9);
        const small_winner = check_winner(small_board);
        if(small_winner !== false) {
            const board_idx = base / 9;
            this.meta_board[board_idx] = small_winner;
            this.winner = check_winner(this.meta_board);
        }

        this.history.push(position);
        this.next_player = (this.next_player === X ? O : X);
        this.valid_plays = this.calculate_valid_plays(position);

        return [];
    }

    calculate_valid_plays(last_move) {
        if(this.is_game_over()) { return []; }

        const next_sb = last_move % 9; // next small board
        let result = []
        if(this.meta_board[next_sb] === false) {
            const base = next_sb * 9;
            for(let i = base; i < base + 9; i++) {
                if(this.board[i] === false) { result.push(i); }
            }
        } else {
            for(let sbi = 0; sbi < 9; sbi++) {
                if(this.meta_board[sbi] !== false) { continue; }
                const base = sbi*9;
                for(let i = base; i < base + 9; i++) {
                    if(this.board[i] === false) { result.push(i); }
                }
            }
        }
        return result
    }
}

module.exports = { X, O, SuperTTT }
