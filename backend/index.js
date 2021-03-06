"use strict";
const express       = require("express");
const favicon       = require("express-favicon");
const http          = require("http");
const socket        = require("socket.io");
const RateLimit     = require("express-rate-limit");
const cookieParser  = require('cookie-parser');
const crypto        = require('crypto');

const { router } = require('./router');
const { log, log_running } = require('./logging');
const client_registry = require('./services/client_registry');

const {
    PORT,
    FAVICON,
    FRONTEND,
} = require('./globals');


const app = express();
app.use(new RateLimit({
    windowMs: 1000, // 1 second
    max: 10,
    message: "Whoops, we detected high traffic from your computer... Try again later :)"
}));

app.use(cookieParser());
app.use(function (req, res, next) {
    let result = client_registry.check_request(req.cookies.sessionId);

    // WARNING: Do not replace with `if(result)` 
    // since it would evaluate to true
    if (result !== true) {
        const options = {
            httpOnly: true,
            // secure: true, // TODO: HTTPS
            // not using maxAge/expires to create session cookie
        }
        res.cookie('sessionId', result, options);
        res.redirect('/');
        return;
    } 

    next();
});

app.use(favicon(FAVICON));
app.use('/',     express.static(FRONTEND));
app.use('/game', express.static(FRONTEND));

const server = http.createServer(app);
const io = socket(server);

router(app, io);

const options = {
      host: 'localhost', // only accessible from own computer
      port: PORT,
};
server.listen(options, () => { log_running(PORT); });
