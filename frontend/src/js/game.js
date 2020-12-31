var socket = io();

const SPECTATOR = 'spectator';
const X = 'X';
const O = 'O';

var role;
var gameBoard;

// fixed HTML elements
const roleDiv = document.querySelector("#role");
const newGameDiv = document.querySelector("#new-game");
const nextPlayerDiv = document.querySelector("#nextPlayer");
const gameGrid = document.querySelector("#game-grid-0");
const gameContainers = document.querySelectorAll('[id^=game-container]');
const titles = document.querySelectorAll('[id^=title]');

const roles = document.querySelectorAll('[id^=role]'); // TODO: fix

window.onload = setup

// ====================================
//          socket handling
// ====================================
socket.on('setup', handle_setup);
socket.on('new-play', handle_move);
socket.on('invalid-play', handle_error);
socket.on('state', handle_state);
socket.on('gg', handle_gg);
socket.on('redirect', handle_redirect);
socket.on('user-left', handle_user_left);

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

    setup();
    set_turn(msg.next_player);
    set_valid(msg.valid_squares, msg.next_player);
    set_board(msg.board);
}

function handle_move(msg) {
    id = "#game-cell-" + msg.position

    // Write move
    document.querySelector(id).innerText = msg.player;

    let next_player = msg.player === X ? O : X;

    set_turn(next_player);
    set_valid(msg.valid_squares, next_player);

    gameBoard[msg.position] = msg.player;

    // check if finished small board
    // useless to check every small board
    let base = msg.position - msg.position%9; // first cell of small board
    let winner = check_winner(gameBoard.slice(base, base+9))
    if(winner) {
        close_board(base/9, winner);
    }
}

function handle_error(msg) {
    // TODO: Show message in the canvas
    alert(msg.toString());
}

function handle_state(msg) {
    setup();
    console.log("Got new game");
    set_turn(msg.next_player);
    set_valid(msg.valid_squares, msg.next_player);
    set_board(msg.board);
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
    alert("Player disconnected. Returning to home page...");
    window.location.href = "/";
}


// ====================================
//             DOM handling
// ====================================

function handle_play(e) {
    if (role !== SPECTATOR) {
        socket.emit('play', { 'position': parseInt(e.target.id.replace(/[^0-9]/g, '')) });
    }
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


// ====================================
//           Helper functions
// ====================================
function setup() {
    // build game board
    while (gameGrid.firstChild) {
        gameGrid.removeChild(gameGrid.firstChild);
    }

    for(let sc=0; sc < 9; sc++) {
        const superCell = document.createElement("div");
        superCell.className = "super-cell";
        superCell.id = `super-cell-${sc}`;

        const smallGrid = document.createElement("div");
        smallGrid.className = "small-grid";
        smallGrid.id = `small-grid-${sc}`;

        for(let gc = 0; gc < 9; gc++) {
            const gameCell = document.createElement("div");
            gameCell.classList.add("game-cell");
            gameCell.id = `game-cell-${sc*9 + gc}`;

            // handle click
            if(role !== SPECTATOR) {
                gameCell.addEventListener('click', handle_play);
                gameCell.classList.add("clickable");
            }

            smallGrid.appendChild(gameCell);
        }
        superCell.appendChild(smallGrid);
        gameGrid.appendChild(superCell);
    }

    assignColors();
}

function assignColors() {
    // these are dynamic divs
    let superCells = document.querySelectorAll('[id^=super-cell]');
    let smallGrids = document.querySelectorAll('[id^=small-grid]');
    let gameCells = document.querySelectorAll('[id^=game-cell]');

    changeColorAll(gameContainers, 'bg-grey-300', 'bg');
    changeColorAll(titles, 'text-grey-700', 'text');
    changeColorAll(roles, 'text-grey-700', 'text');
    changeColorAll([gameGrid], 'bg-grey-700', 'bg');
    changeColorAll(superCells, 'bg-grey-300', 'bg');
    changeColorAll(smallGrids, 'bg-grey-700', 'bg');
    changeColorAll(gameCells, 'bg-grey-300', 'bg');
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

    gameBoard = board;

    for(let i = 0; i < 9; i++) {
        let winner = check_winner(gameBoard.slice(i*9, (i+1)*9))
        if(winner) {
            close_board(i, winner);
        }
    }
}

function close_board(idx, winner) {
    function show_board(e) {
        const finished_div = e.target.querySelectorAll("[id^='finished']")[0];
        finished_div.hidden = true;
        const grid_div = e.target.querySelectorAll("[id^='small-grid']")[0];
        grid_div.hidden = false;
    }
    function hide_board(e) {
        const finished_div = e.target.querySelectorAll("[id^='finished']")[0];
        finished_div.hidden = false;
        const grid_div = e.target.querySelectorAll("[id^='small-grid']")[0];
        grid_div.hidden = true;
    }

    const superCell = document.querySelector(`#super-cell-${idx}`);
    const smallGrid = document.querySelector(`#small-grid-${idx}`);

    const div = document.createElement("div");
    div.style.height = "100%";
    div.id = `finished-${idx}`;

    const h1 = document.createElement("h1");
    h1.className = "text-blue-500 text-center mb-0";
    h1.style.fontSize = "130px";
    h1.innerText = winner;

    div.appendChild(h1);

    superCell.appendChild(div);

    smallGrid.hidden = true;

    superCell.addEventListener('mouseenter', show_board);
    superCell.addEventListener('mouseleave', hide_board);
}

function set_valid(valid, player) {
    // TODO: have sorted array (by id) and access directly

    let smallGrids = document.querySelectorAll('[id^=small-grid]');
    for (const small_grid of smallGrids) {
        let id = parseInt(small_grid.id.replace(/[^0-9]/g, ''));
        if (valid.includes(id) && (player === role || role === SPECTATOR)) {
            changeColor(small_grid, 'bg-blue-500', 'bg');

            if(role === SPECTATOR) continue;
            
            // Update clickable
            small_grid.childNodes.forEach(cell => {
                if(cell.innerText === "") cell.classList.add("clickable");
            });
        } else {
            changeColor(small_grid, 'bg-grey-700', 'bg');
            small_grid.childNodes.forEach(cell => {
                cell.classList.remove("clickable");
            });
        }
    }
}

function check_winner(smallBoard) {
    // check vertical
    for(let i = 0; i < 3; i++) {
        if(smallBoard[i] !== " " 
        && smallBoard[i] === smallBoard[i+3] 
        && smallBoard[i] === smallBoard[i+6]) {
            return smallBoard[i];
        }
    }

    // check horizontal
    for(let i = 0; i < 9; i+=3) {
        if( smallBoard[i] !== " "
        && smallBoard[i] === smallBoard[i+1]
        && smallBoard[i] === smallBoard[i+2]) {
            return smallBoard[i];
        }
    }

    // check diagonals
    if(smallBoard[4] !== " "
    && (smallBoard[0] === smallBoard[4] && smallBoard[4] === smallBoard[8]
     || smallBoard[2] === smallBoard[4] && smallBoard[4] === smallBoard[6])
    ) {
        return smallBoard[4];
    }

    return false;
}
