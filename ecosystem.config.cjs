module.exports = {
  apps: [
    {
      name: "ciadosilk-portal",
      script: "dist/server/index.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: "3333",
        SERVE_WEB: "true",
        USE_MOCK_DATA: "false"
      }
    }
  ]
};
