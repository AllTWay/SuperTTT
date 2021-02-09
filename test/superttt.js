"use strict";

const assert = require('assert');
const { X, O, SuperTTT } = require("../backend/domain/super_ttt");

function test_game(moves, is_over, winner) {
    let game = new SuperTTT();
    let isX = true;
    for(const m of moves) {
        game.play((isX ? X : O), m);
        isX = !isX;
    }

    assert(game.is_game_over() === is_over);
    assert(game.get_winner() === winner);
}


function test1() {
    const moves = [
        26, 72, 6, 54,
        7, 69, 55, 17,
        75, 34, 68, 46,
        13, 41, 51, 60,
        61, 66, 29, 25,
        71, 76, 40, 44,
        77, 47, 18, 8,
        74, 19, 10, 12,
        30, 32, 45, 4,
        37, 9, 0, 3,
        27, 5, 52, 65,
        23, 48, 33, 57,
        43, 70, 64, 11,
        20, 53, 80, 50,
        16, 63
    ]
    // should end with a Tie
    test_game(moves, true, false);
}

function test2() {
    const moves = [
        20, 21, 29, 24,
        56, 18, 3, 30,
        33, 61, 65, 32,
        51, 55, 9, 8,
        77, 52, 71, 80,
        72, 0, 4, 44,
        76, 43, 64, 13,
        41, 46, 10, 14,
        49, 40, 36, 5,
        47, 37, 11, 58,
    ]
    // should end with O winning
    test_game(moves, true, O);
}

function runall() {
    test1();
    test2();
}

module.exports = runall
