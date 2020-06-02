module.exports = {
  apps : [{
    name: 'server',
    script: './backend/server.js',
    watch: '.',
    cwd: '/home/migmacthegamer/SuperTTT',
    env_hook: {
	command: 'git pull && npm i && pm2 restart server'
    }
  }]
};
