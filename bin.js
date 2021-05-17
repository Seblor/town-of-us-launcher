const functions = require('./src/app') /* the current working directory so that means main.js because of package.json */
const { launchTownOfUs, hideSelf } = require('./src/win32')

async function installTownOfUs() {
  console.clear()
  try {
    await functions.installMods()
    console.log('Starting Town of Us... This may take a minute...');
    launchTownOfUs()
    console.log('Closing this window...');
    setTimeout(() => {
      hideSelf() // If the process is closed before a game starts, the game doesn't load the assets properly
    }, 5000);
  } catch (err) {
    console.log("\n" + err.message);
    console.log('An error occured, press any key to close this program.');
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('data', process.exit.bind(process, 0))
  }
}

installTownOfUs()
