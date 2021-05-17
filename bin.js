const functions = require('./src/app') /* the current working directory so that means main.js because of package.json */
const { launchTownOfUs } = require('./src/win32')

async function installTownOfUs() {
  console.clear()
  try {
    await functions.installMods()
    console.log('Starting Town of Us... This may take a minute...');
    launchTownOfUs()
    console.log('Closing this window...');
    setTimeout(() => {
      process.exit()
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
