const info = require('../package.json')
const fetch = require('node-fetch')
const semver = require('semver')
const { replaceExecutable } = require('./win32')
const { https } = require('follow-redirects')
const fs = require('fs')

const version = info.version
const repoURL = new URL(info.repository.url)
const repoName = repoURL.pathname.replace(/^\/|\/$/g, '')

const lastReleaseURL = `https://api.github.com/repos/${repoName}/releases/latest`

module.exports.checkForUpdate = async () => {
  if (process.pkg === undefined) {
    console.log('Running in dev mode, autoupdate is cancelled.');
  }

  const result = await fetch(lastReleaseURL).then(res => res.json())

  if (!result || !result.tag_name) {
    return
  }

  if (semver.lte(result.tag_name, version)) {
    return
  }


  const assetToDownload = result.assets.find(asset => asset.name.includes('.exe'))
  const assetSize = assetToDownload.size

  if (!assetToDownload) {
    return
  }

  console.log('Found launcher update. The launcher will start again after updating');

  const urlToDownload = assetToDownload.browser_download_url

  return new Promise(resolve => {
    https.get(urlToDownload, response => {
      let totalDownloaded = 0
      response.on('data', chunk => {
        totalDownloaded += chunk.length
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(`Downloading launcher...:\t${Math.round((100 * totalDownloaded) / assetSize)}%`)
      })
      const file = fs.createWriteStream(`${process.execPath}.new`)
      response.pipe(file).on('close', () => {
        process.stdout.write('\n')
        replaceExecutable(urlToDownload).then(resolve)
      })
    })
  })


}