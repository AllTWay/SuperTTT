// ===========================================
//      Fancy console logging by Migmac
// ===========================================

const os = require("os");

const color = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",

    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",

    BGblack: "\x1b[40m",
    BGred: "\x1b[41m",
    BGgreen: "\x1b[42m",
    BGyellow: "\x1b[43m",
    BGblue: "\x1b[44m",
    BGmagenta: "\x1b[45m",
    BGcyan: "\x1b[46m",
    BGwhite: "\x1b[47m"
}

const WHITE = `${color["BGwhite"]}${color["black"]}`;
const RESET = `${color["reset"]}`;
const GREEN = `${color["green"]}`;
const YELLOW = `${color["yellow"]}`;
const CYAN = `${color["cyan"]}`;
const RED = `${color["red"]}`;

function white(msg)     { return `${color["BGwhite"]}${color["black"]}${msg}${color["reset"]}`; }
function green(msg)     { return `${color["green"]}${msg}${color["reset"]}`; }
function yellow(msg)    { return `${color["yellow"]}${msg}${color["reset"]}`; }
function cyan(msg)      { return `${color["cyan"]}${msg}${color["reset"]}`; }
function red(msg)       { return `${color["red"]}${msg}${color["reset"]}`; }

function log_running(port) {
    log("+============================+");
    log(`|  Starting STTT by ${cyan("AllTWay")}  |`);
    log("+==+=========================+");
    log("   |");
    log(`   +--=[${white("private ip")}]=--> ${green(get_ipv4())}:${yellow(port)}`);
    log("   |");
    log("   ."); // End Spacer

    log_dependencies();
}


function log_dependencies() {
    log(`${red("Dependencies")}`);
    log(`${red("  --> ")}${yellow("Express")}`);
    log(`${red("  --> ")}${yellow("Express-Favicon")}`);
    log(`${red("  --> ")}${yellow("Express-Rate-Limit")}`);
    log(".");
}


function get_ipv4() {
    var ifaces = os.networkInterfaces();
    for(const iface in ifaces) {
        for(const ix in ifaces[iface]) {
            let addr = ifaces[iface][ix];
            if(!addr.internal && addr.family === "IPv4") {
                return addr.address;
            }
        }
    }
}

const DEBUG = '*';
const SUCCESS = '+';
const WARNING = '-';
const ERROR = 'x';
function log(msg, level = DEBUG) {
    console.log(`[${level}] ${msg}`);
}


module.exports = {
    log,
    log_running,
    DEBUG,
    SUCCESS,
    WARNING,
    ERROR,
}
