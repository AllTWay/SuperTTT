var socket = io();

const SPECTATOR = 'spectator';
const X = 'X';
const O = 'O';

var role;

// HTML elements
const roleDiv = document.querySelector("#role");
const newGameDiv = document.querySelector("#new-game");
const nextPlayerDiv = document.querySelector("#nextPlayer");

// TODO: refactor gameCells (make array and build it with id corresponding to index)

const gameContainers = document.querySelectorAll('[id^=game-container]');
const titles = document.querySelectorAll('[id^=title]');
const roles = document.querySelectorAll('[id^=role]');
const gameGrids = document.querySelectorAll('[id^=game-grid]');
const superCells = document.querySelectorAll('[id^=super-cell]');
const smallGrids = document.querySelectorAll('[id^=small-grid]');
const gameCells = document.querySelectorAll('[id^=game-cell]');

// const gameCells = document.querySelectorAll(".game-cell");
// const smallGrids = document.querySelectorAll(".small-grid");

// socket handling
socket.on('setup', handle_setup);
socket.on('new-play', handle_move);
socket.on('invalid-play', handle_error);
socket.on('state', handle_state);
socket.on('gg', handle_gg);
socket.on('redirect', handle_redirect);
socket.on('user-left', handle_user_left);


assignColors();

// Default colors
function assignColors() {
    changeColorAll(gameContainers, 'bg-grey-300', 'bg');
    changeColorAll(titles, 'text-grey-700', 'text');
    changeColorAll(roles, 'text-grey-700', 'text');
    changeColorAll(gameGrids, 'bg-grey-700', 'bg');
    changeColorAll(superCells, 'bg-grey-300', 'bg');
    changeColorAll(smallGrids, 'bg-grey-700', 'bg');
    changeColorAll(gameCells, 'bg-grey-300', 'bg');
}

// Dom handling
for (const gameCell of gameCells) {
    gameCell.addEventListener('click', handle_play);
}

// Handlers
function handle_setup(msg) {
    if (msg.role === X) {
        role = X;
    } else if (msg.role === O) {
        role = O;
    } else {
        role = SPECTATOR;
    }

    if (role === SPECTATOR) {
        // TODO: remove cursor pointer from squares
        roleDiv.innerText = "Spectating";
    } else {
        newGameDiv.addEventListener('click', handle_new_game_click);
        newGameDiv.addEventListener('mouseover', handle_new_game_over);
        newGameDiv.addEventListener('mouseout', handle_new_game_out);
        roleDiv.innerText = "Playing as " + role;
    }

    set_turn(msg.next_player);
    set_valid(msg.valid_squares, msg.next_player);
    set_board(msg.board);
}

function handle_state(msg) {
    console.log("Got new game");
    set_turn(msg.next_player);
    set_valid(msg.valid_squares, msg.next_player);
    set_board(msg.board);
}

function set_turn(player) {
    if (role === SPECTATOR || player !== role) {
        nextPlayerDiv.innerText = `${player} turn`;
    } else {
        nextPlayerDiv.innerText = "Your turn";
    }
}

function set_board(board) {
    for (let i = 0; i < 81; i++) {
        document.querySelector(`#game-cell-${i}`).innerText = board[i];
    }
}

function set_valid(valid, player) {
    // TODO: have sorted array (by id) and access directly
    for (const small_grid of smallGrids) {
        let id = parseInt(small_grid.id.replace(/[^0-9]/g, ''));
        if (valid.includes(id) && (player === role || role === SPECTATOR)) {
            changeColor(small_grid, 'bg-blue-500', 'bg');
        } else {
            changeColor(small_grid, 'bg-grey-700', 'bg');
        }
    }
}

function handle_move(msg) {
    id = "#game-cell-" + msg.position

    // Write move
    document.querySelector(id).innerText = msg.player;

    let next_player = msg.player === X ? O : X;

    set_turn(next_player);
    set_valid(msg.valid_squares, next_player);
}

function handle_error(msg) {
    // TODO: Show message in the canvas
    alert(msg.toString());
}


function handle_play(e) {
    if (role !== SPECTATOR) {
        socket.emit('play', { 'position': parseInt(e.target.id.replace(/[^0-9]/g, '')) });
    }
}

function handle_gg(msg) {
    document.querySelector(`#role`).innerText = `${msg.winner} wins!`;
}

function handle_redirect(msg) {
    window.location.href = msg.destination;
}

function handle_user_left(msg) {
    // redirect to home page
    console.log("User left the game :(");
    window.location.href = "/";
}




function handle_new_game_click(e) {
    console.log("New Game!");
    socket.emit('new-game');
}

function handle_new_game_over(e) {
    newGameDiv.classList.add('text-pink-500');
}

function handle_new_game_out(e) {
    newGameDiv.classList.remove('text-pink-500');
}

function changeColorAll(selection, color, remove) {
    for (const obj of selection) {
        removeClassByPrefix(obj, remove);
        obj.classList.add(color);
    }
}

function changeColor(selection, color, remove) {
    removeClassByPrefix(selection, remove);
    selection.classList.add(color);
}

function removeClassByPrefix(node, prefix) {
    var regx = new RegExp('\\b' + prefix + '[^ ]*[ ]?\\b', 'g');
    node.className = node.className.replace(regx, '');
    return node;
}
