module.exports = {
  apps: [
    {
      name: 'kerimbilgisayar',
      script: 'dist/server.cjs',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 5000,
      exp_backoff_restart_delay: 100,
      max_restarts: 50,
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
