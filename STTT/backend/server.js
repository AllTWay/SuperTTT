"use strict";

const colorModule = require("./console_colors.js");
const color = colorModule.name;

const WHITE = `${color["BGwhite"]}${color["black"]}`;
const RESET = `${color["reset"]}`;
const GREEN = `${color["green"]}`;
const YELLOW = `${color["yellow"]}`;
const CYAN = `${color["cyan"]}`;
const RED = `${color["red"]}`;

var logging = true;
var log_dependencies = true;

if (logging) {
    if (log_dependencies) {
        console.log(`${RED}Dependencies${RESET}`);
        console.log(`${RED}  --> ${YELLOW}Express${RESET}`);
        console.log(`${RED}  --> ${YELLOW}Express-Favicon${RESET}`);
    }
    console.log(".");
    console.log("+============================+");
    console.log(`|  Starting STTT by ${CYAN}AllTWay${RESET}  |`);
    console.log("+==+=========================+");
} else {
    console.log(`Starting STTT by ${CYAN}AllTWay${RESET}`);
}

// VARIABLES
var private_ipv4; // Server can be accessed through this ip if in the same network
const PORT = 8080;

var os = require("os");
var fs = require("fs");

var express = require("express");
var app = express();
var io = require("socket.io");
var favicon = require("express-favicon");

var super_ttt = require("./super_ttt.js");

// LOCAL IPV4 DETECTION
var ifaces = os.networkInterfaces();
Object.keys(ifaces).forEach(function(ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function(iface) {
        if ("IPv4" !== iface.family || iface.internal !== false) {
            // skips over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            return;
        }

        if (alias >= 1) {
            // this single interface has multiple ipv4 addresses
            // console.log(ifname + `:` + alias, iface.address);
        } else {
            // this interface has only one ipv4 address
            // console.log(ifname, iface.address);
            private_ipv4 = iface.address;
        }
        ++alias;
    });
});

// START HTML SERVER
// Prevents MIME TYPE error by making html directory static and therefore usable
app.use(express.static(__dirname + "/../frontend"));

// Favicon handler
app.use(favicon(__dirname + "/../frontend/assets/img/hashtag.png"));

// Root entry
app.get("/", function(req, res) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.sendFile("index.html", { root: __dirname });
    res.end();
});

// Redirect any incorrect path to main page
app.get("*", function(req, res) { res.redirect(`/`); });

// Run server
app.listen(PORT, () => {
    console.log("   |");
    console.log(`   +--=[${WHITE}Private IP${RESET}]=--> ${GREEN}${private_ipv4}:${YELLOW}${PORT}${RESET}`);
    console.log("   |");
    console.log("   ."); // End Spacer
})
.on("error", err => console.log(err));
