const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    supportFile: "cypress/support/e2e.js", 
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
    },
    // ALTERADO: Agora apontamos para o arquivo onde você configurou o cy.mount
    supportFile: "cypress/support/component.js", 
    indexHtmlFile: 'cypress/support/component-index.html',
  },
});