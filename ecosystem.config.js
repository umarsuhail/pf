module.exports = {
  apps: [

    {
      name: "pf-portfolio-3007",
      script: "npm",
      args: "start",
      cwd: __dirname,
      interpreter: "cmd.exe",
      env: {
        NODE_ENV: "production",
        PORT: 3007,
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};
