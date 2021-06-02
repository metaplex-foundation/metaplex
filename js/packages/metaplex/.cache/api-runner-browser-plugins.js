module.exports = [{
      plugin: require('../../../node_modules/gatsby-plugin-image/gatsby-browser.js'),
      options: {"plugins":[]},
    },{
      plugin: require('../../../node_modules/gatsby-plugin-manifest/gatsby-browser.js'),
      options: {"plugins":[],"background_color":"#000000","icon":"src/images/icon.png","legacy":true,"theme_color_in_head":true,"cache_busting_mode":"query","crossOrigin":"anonymous","include_favicon":true,"cacheDigest":"7df75940c5c4611dd59c4b1856069d9e"},
    },{
      plugin: require('../gatsby-browser.js'),
      options: {"plugins":[]},
    }]
