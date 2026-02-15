const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    supportFile: false,
    defaultCommandTimeout: 10000,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    setupNodeEvents(on, config) {
      on("before:browser:launch", (browser = {}, launchOptions) => {
        if (browser.family === "chromium" && browser.name !== "electron") {
          launchOptions.args.push("--disable-gpu");
          launchOptions.args.push("--no-sandbox");
          launchOptions.args.push("--disable-dev-shm-usage");
        }
        return launchOptions;
      });
    },
  },

  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
      // Opcional: Se o seu vite.config.js estiver na raiz da pasta frontend, 
      // o Cypress o encontrará automaticamente. 
      // Caso contrário, você pode passar a configuração aqui.
    },
    // IMPORTANTE: Se você não tem um arquivo de suporte para componentes, 
    // defina como false para evitar erro de "file not found" no CI.
    supportFile: false, 
    indexHtmlFile: 'cypress/support/component-index.html', // Padrão do Cypress
  },
});