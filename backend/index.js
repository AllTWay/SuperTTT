"use strict";
const express   = require("express");
const favicon   = require("express-favicon");
const http      = require("http");
const socket    = require("socket.io");
const RateLimit = require("express-rate-limit");

const { router, socket_handler } = require('./router');
const { log_running } = require('./logging');

const {
    PORT,
    FAVICON,
    FRONTEND,
} = require('./globals');


const app = express();
app.use(favicon(FAVICON));
app.use(new RateLimit({
    windowMs: 1000, // 1 second
    max: 10,
    message: "Whoops, we detected high traffic from your computer... Try again later :)"
}));

app.use('/',     express.static(FRONTEND));
app.use('/game', express.static(FRONTEND));

router(app);


// Run server
const server = http.createServer(app);
const io = socket(server);
socket_handler(io);
server.listen(PORT, () => { log_running(PORT); });
