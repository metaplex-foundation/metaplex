// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)
const plugin: Cypress.PluginConfig = (
  on: Cypress.PluginEvents,
  _config: Cypress.PluginConfigOptions
) => {
  on('before:browser:launch', (browser, launchOptions) => {
    // auto open devtools
    if (process.env.LAUNCH_DEVTOOLS != null) {
      if (browser.family === 'chromium' && browser.name !== 'electron') {
        launchOptions.args.push('--auto-open-devtools-for-tabs')
      }

      if (browser.family === 'firefox') {
        launchOptions.args.push('-devtools')
      }

      if (browser.name === 'electron') {
        launchOptions.preferences.devTools = true
      }
    }
    return launchOptions
  })
}
export default plugin
