module.exports = function (api) {
  const isServer = api.caller((caller) => caller?.isServer)
  const isCallerDevelopment = api.caller((caller) => caller?.isDev)
 
   const presets = isCallerDevelopment
    ? [
        ['next/babel'],
        [
          '@babel/preset-react',
          {
            runtime: 'automatic',
            importSource: !isServer ? '@welldone-software/why-did-you-render' : 'react',
          },
        ],
      ]
    : ['next/babel']
 
   return { presets, plugins: ['macros'] }
}