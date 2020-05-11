'use strict'

const chalk = require('chalk')
const webpack = require('webpack')
process.env.NODE_ENV = 'production'

const mainConfig = require('./webpack.main.config')
const rendererConfig = require('./webpack.renderer.config')

function buildWP (config) {
  return new Promise((resolve, reject) => {
    config.mode = 'production'
    webpack(config, (err, stats) => {
      if (err) {
        reject(err.stack || err)
      } else if (stats.hasErrors()) {
        let err = ''

        stats.toString({
          chunks: false,
          colors: true
        })
          .split(/\r?\n/)
          .forEach(line => {
            err += `    ${line}\n`
          })

        reject(err)
      } else {
        resolve(stats.toString({
          chunks: false,
          colors: true
        }))
      }
    })
  })
}

function build () {
  buildWP(rendererConfig).then(() => {
    console.log('renderer ok')
  }).catch((err) => {
    console.error(err)
    process.exit(1)
  })

  buildWP(mainConfig).then(() => {
    console.log('main ok')
  }).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

build()
