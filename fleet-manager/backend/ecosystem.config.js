// ============================================================
// PM2 ECOSYSTEM CONFIG - Fleet Manager
// Usage: pm2 start ecosystem.config.js
// ============================================================
module.exports = {
  apps: [{
    name        : 'fleet-manager',
    script      : 'server.js',
    cwd         : '/var/www/fleet-manager/backend',
    instances   : 1,
    autorestart : true,
    watch       : false,
    max_memory_restart: '300M',
    env_production: {
      NODE_ENV : 'production',
      PORT     : 3001,
    },
    error_file  : '/var/log/fleet-manager/error.log',
    out_file    : '/var/log/fleet-manager/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
