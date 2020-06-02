var socket = io();

const SPECTATOR = 'spectator';
const X = 'X';
const O = 'O';

var role;

// HTML elements
const roleDiv = document.querySelector("#role");
const nextPlayerDiv = document.querySelector("#nextPlayer");

// TODO: refactor gameCells (make array and build it with id corresponding to index)
const gameCells = document.querySelectorAll(".game-cell");

const smallGrids = document.querySelectorAll(".small-grid");


// socket handling
socket.on('setup', handle_setup);
socket.on('new-play', handle_move);
socket.on('invalid-play', handle_error);


// dom handling
for(const gameCell of gameCells) {
    gameCell.addEventListener('click', handle_play);
}



// handlers
function handle_setup(msg) {
    console.log(msg);
    if(msg.role === 'X') {
        role = X;
    } else if(msg.role === 'O') {
        role = O;
    } else {
        role = SPECTATOR;
    }

    if(role === SPECTATOR) {
        roleDiv.innerText = "Spectating";
    } else {
        roleDiv.innerText = "Playing as " + role;
    }

    set_turn(msg.next_player);
    set_valid(msg.valid_squares, msg.next_player);
    set_board(msg.board);
}

function set_turn(player) {
    if(role === SPECTATOR || player !== role) {
        nextPlayerDiv.innerText = `${player} turn`;
    } else {
        nextPlayerDiv.innerText = "Your turn";
    }
}

function set_board(board) {
    for(let i = 0; i < 81; i++) {
        document.querySelector(`#game-cell-${i}`).innerText = board[i];
    }
}

function set_valid(valid, player) {
    for(const small_grid of smallGrids) {
        let id = parseInt(small_grid.id.replace(/[^0-9]/g, ''));
        if(valid.includes(id) && (player === role || role === SPECTATOR)) {
            small_grid.classList.add("valid");
        } else {
            small_grid.classList.remove("valid");
        }
    }
}

function handle_move(msg) {
    id = "#game-cell-" + msg.position

    // write move
    document.querySelector(id).innerText = msg.player;

    let next_player = msg.player === 'X' ? 'O' : 'X';

    set_turn(next_player);
    set_valid(msg.valid_squares, next_player);
}

function handle_error(msg) {
    // TODO: Show message in the canvas
    alert(msg.toString());
}


function handle_play(e) {
    socket.emit('play', { 'position': parseInt(e.target.id.replace(/[^0-9]/g, '')) });
}
