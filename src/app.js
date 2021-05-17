const execa = require('execa')
const path = require('path')
const os = require('os')

const fs = require('fs')
const { https } = require('follow-redirects')
const extract = require('extract-zip')
const fetch = require('node-fetch')
const fsExtra = require('fs-extra')
const api = require('./win32')

let filePath = ''
let gamePath = ''
let moddedGamePath = api.getModdedGamePath()

if (!fs.existsSync(moddedGamePath)) {
  fs.mkdirSync(moddedGamePath)
}

async function getModLatestAsset() {
  const { assets } = await fetch(
    'https://api.github.com/repos/slushiegoose/Town-Of-Us/releases/latest'
  ).then(res => res.json())
  return assets[0]
}

async function downloadAndExtract(installTargetPath, stateChangeCallback) {
  console.log('Fetching last release...')
  const asset = await getModLatestAsset()
  const assetName = asset.name
  const assetSize = asset.size

  const assetFilePath = path.join(installTargetPath, assetName)
  const file = fs.createWriteStream(assetFilePath)

  return new Promise(resolve => {
    https.get(asset.browser_download_url, response => {
      let totalDownloaded = 0
      response.on('data', chunk => {
        totalDownloaded += chunk.length
        if (typeof stateChangeCallback === 'function') {
          stateChangeCallback({
            step: 'Downloading Mod file...',
            process: `${Math.round((100 * totalDownloaded) / assetSize)}%`
          })
        }
      })
      response.pipe(file).on('close', () => {
        if (typeof stateChangeCallback === 'function') {
          stateChangeCallback({
            step: 'Extracting Mod file...',
            process: ''
          })
        }

        // Extracting the archive
        extract(
          assetFilePath,
          {
            dir: path.resolve(installTargetPath),
            onEntry: entry => {
              if (typeof stateChangeCallback === 'function') {
                stateChangeCallback({
                  step: 'Extracting',
                  process: entry.fileName
                })
              }
            }
          },
          err => {
            if (err) console.error(err)
          }
        ).then(() => {
          fs.unlink(assetFilePath, err => {
            if (err) console.error(err)
          })
          resolve()
        })
      })
    })
  })
}

function openSteamLibrary() {
  return execa('cmd.exe', ['/c', 'start', 'steam://nav/games/details/945360'], {
    windowsHide: false
  })
}

function openGame() {
  return execa('cmd.exe', ['/c', 'start', 'steam://run/945360'], {
    windowsHide: false
  })
}

function validateGameFiles() {
  console.log('Checking file integrity... (check Steam window for status)')
  openSteamLibrary()
  return execa('cmd.exe', ['/c', 'start', 'steam://validate/945360'], {
    windowsHide: false
  })
}

async function copyOriginalGameFiles() {
  console.log('Creating copy from original game files...')
  if (fs.existsSync(moddedGamePath)) {
    await fsExtra.emptyDir(moddedGamePath)
  } else {
    fs.mkdirSync(moddedGamePath)
  }

  fsExtra.copy(gamePath, moddedGamePath)
}

async function installMods() {
  if ((await isLocalModUpToDate()) === false) {
    console.log('Mod version is outdated, updating...');

    await fetchGameFolder()

    if (await getGameVersion(moddedGamePath) !== await getGameVersion(gamePath)) {
      console.log('Game version is outdated, updating...');
      await copyOriginalGameFiles()
    }
    await downloadAndExtract(moddedGamePath, (data) => {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(`${data.step}:\t${data.process}`)
    })
    process.stdout.write('\n')
    const localModUploadDate = path.join(moddedGamePath, 'uploadedDate')
    await fsExtra.writeFile(localModUploadDate, (await getModLatestAsset()).updated_at)
  }
}

async function fetchGameFolder() {
  await openGame()
  let waitingTime = 30
  console.log('Locating Among Us game files...');
  const waitingInterval = setInterval(() => {
    console.log(`Waiting for Among Us to start... (${waitingTime--})`)
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
  }, 1000)
  try {
    await api.waitForProgram()
    filePath = await api.getProgramPath()
  } catch (error) {
    clearInterval(waitingInterval)
    process.stdout.write('\n');
    console.log('Please select the Among Us executable file')
    filePath = await api.askFolder()
  } finally {
    await api.killProgram()
  }
  clearInterval(waitingInterval)
  process.stdout.write('\n');
  gamePath = path.join(filePath, '../')
}

async function isLocalModUpToDate() {
  console.log('Checking for updates');
  const localModUploadDateFile = path.join(moddedGamePath, 'uploadedDate')
  if (!fs.existsSync(localModUploadDateFile)) {
    return false
  }
  const localModUploadDate = new Date(await fsExtra.readFile(localModUploadDateFile))
  const lastAssetUploadDate = new Date((await getModLatestAsset()).updated_at)
  return lastAssetUploadDate.getTime() === localModUploadDate.getTime()
}

async function getGameVersion(gameFolder) {
  return new Promise(resolve => {
    if (!fs.existsSync(path.join(gameFolder, '/Among Us_Data/globalgamemanagers'))) {
      resolve(null)
      return
    }
    fs.readFile(path.join(gameFolder, '/Among Us_Data/globalgamemanagers'), (err, data) => {
      if (err) {
        console.log(err)
        return
      }
      resolve(data.toString().match(/\d{4}\.\d{1,2}\.\d{1,2}/g).sort().pop())
    })
  })
}

module.exports.openGame = openGame
module.exports.installMods = installMods
module.exports.validateGameFiles = validateGameFiles