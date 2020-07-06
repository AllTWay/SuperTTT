module.exports = {
    apps: [{
        name: 'server',
        script: './backend/server.js',
        watch: '.',
        cwd: '/home/migmacthegamer/SuperTTT',
        env_hook: {
            command: 'sudo git pull && npm i && pm2 restart server'
        }
    }]
};