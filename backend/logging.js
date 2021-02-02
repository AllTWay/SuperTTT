// ===========================================
//      Fancy console logging by Migmac
// ===========================================

const os = require("os");
const colorModule = require("./console_colors.js");
const color = colorModule.name;
const { PORT } = require('./globals');


const WHITE = `${color["BGwhite"]}${color["black"]}`;
const RESET = `${color["reset"]}`;
const GREEN = `${color["green"]}`;
const YELLOW = `${color["yellow"]}`;
const CYAN = `${color["cyan"]}`;
const RED = `${color["red"]}`;

function log_running() {
    log("+============================+");
    log(`|  Starting STTT by ${CYAN}AllTWay${RESET}  |`);
    log("+==+=========================+");
    log("   |");
    log(`   +--=[${WHITE}Private IP${RESET}]=--> ${GREEN}${get_ipv4()}:${YELLOW}${PORT}${RESET}`);
    log("   |");
    log("   ."); // End Spacer

    log_dependencies();
}


function log_dependencies() {
    log(`${RED}Dependencies${RESET}`);
    log(`${RED}  --> ${YELLOW}Express${RESET}`);
    log(`${RED}  --> ${YELLOW}Express-Favicon${RESET}`);
    log(`${RED}  --> ${YELLOW}Express-Rate-Limit${RESET}`);
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
    
