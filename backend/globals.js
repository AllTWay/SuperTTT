const path = require("path");

const X = 'X';
const O = 'O';
const SPEC = 'SPECTATOR';

const PORT = 8080;
const FAVICON = __dirname + "/../frontend/assets/img/hashtag.png";
const FRONTEND = path.resolve(__dirname, "..", "frontend");

module.exports = {
    PORT,
    FAVICON,
    FRONTEND,

    X, O, SPEC
}
