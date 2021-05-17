const { spawn } = require('child_process')
const path = require('path')

module.exports.hideSelf = () => {
  let psScript = `
Add-Type -Name Window -Namespace Console -MemberDefinition '
[DllImport("Kernel32.dll")]
public static extern IntPtr GetConsoleWindow();

[DllImport("user32.dll")]
public static extern bool ShowWindow(IntPtr hWnd, Int32 nCmdShow);
'

$consolePtr = [Console.Window]::GetConsoleWindow()
#0 hide
[Console.Window]::ShowWindow($consolePtr, 0)
`

  const child = spawn('powershell.exe', [psScript])

  let output = ''

  return new Promise(resolve => {
    child.stdout.on('data', (data) => {
      output += data.toString()
    })
    child.on('exit', () => {
      resolve(output.trim())
    })
    child.stdin.end()
  })
}

function openFolder() {
  let psScript = `
Function Select-FolderDialog
{
    param([string]$Description="Select File",[string]$RootFolder="Desktop")

 [System.Reflection.Assembly]::LoadWithPartialName("System.windows.forms") |
    Out-Null

    $dialog = New-Object -TypeName System.Windows.Forms.OpenFileDialog

    $dialog.AddExtension = $true
    $dialog.Filter = 'Executable Files|*.exe'
    $dialog.Multiselect = $false
    $dialog.FilterIndex = 0
    $dialog.InitialDirectory = "c:\\"
    $dialog.RestoreDirectory = $true
    $dialog.ReadOnlyChecked = $false
    $dialog.Title = 'Please select the Among Us.exe file'
    $Show = $dialog.ShowDialog()
    Return $dialog.FileName
}

$folder = Select-FolderDialog # the variable contains user folder selection
write-host $folder
`

  const child = spawn('powershell.exe', [psScript])

  let output = ''

  return new Promise(resolve => {
    child.stdout.on('data', (data) => {
      output += data.toString()
    })
    child.on('exit', () => {
      resolve(output.trim())
    })
    child.stdin.end()
  })
}

/**
 * Opens windows' file selector, and returns a promise (rejects if the user cancels)
 * @returns {Promise}
 */
module.exports.askFolder = async () => {
  return new Promise((resolve, reject) => {
    openFolder().then(result => {
      if (result.length > 0) {
        resolve(result)
      } else {
        reject(new Error('User cancelled the file location. Could not locate the game file.'))
      }
    })
  })
}

/**
 * Opens windows' file selector, and returns the path selected or null if the user canceled
 * @param {{programName: string, timeout: number}} options
 * @param {string?} options.programName The name of the program (default is "Among Us.exe")
 * @param {number?} options.timeout Timeout in milliseconds (default is 30e3)
 * @returns {Promise}
 */
module.exports.waitForProgram = async ({ programName = 'Among Us.exe', timeout = 30e3 } = {}) => {
  return new Promise((resolve, reject) => {
    const rejectTimeout = setTimeout(reject, timeout)
    const checkInterval = setInterval(() => {
      this.isProgramOpen(programName).then(isOpen => {
        if (isOpen) {
          clearTimeout(rejectTimeout)
          clearInterval(checkInterval)
          resolve()
        }
      })
    }, 0.5e3);
  })
}

/**
 * Opens windows' file selector, and returns the path selected or null if the user canceled
 * @param {string?} programName The name of the program (default is "Among Us.exe")
 * @returns {Promise<boolean>}
 */
module.exports.isProgramOpen = async (programName = 'Among Us.exe') => {
  const child = spawn('wmic', ['process', 'where', `name="${programName}"`])

  let output = ''

  return new Promise(resolve => {
    child.stdout.on('data', (data) => {
      output += data.toString()
    })
    child.on('exit', () => {
      resolve(output.includes(programName))
    })
    child.stdin.end()
  })
}

/**
 * Opens windows' file selector, and returns the path selected or null if the user canceled
 * @param {string?} programName The name of the program (default is "Among Us.exe")
 * @returns {Promise<boolean>}
 */
module.exports.getProgramPath = async (programName = 'Among Us.exe') => {
  if (await this.isProgramOpen(programName)) {
    const child = spawn('wmic', [
      'process',
      'where',
      `name='${programName}'`,
      'GET',
      'ExecutablePath'
    ])

    let output = ''

    return new Promise(resolve => {
      child.stdout.on('data', (data) => {
        output += data.toString()
      })
      child.on('exit', () => {
        resolve(output
          .trim()
          .split('\n')
          .pop()
          .trim())
      })
      child.stdin.end()
    })
  } else return Promise.reject(new Error('Program is not started'))
}

module.exports.getModdedGamePath = () => {
  return path.join(process.env.APPDATA, 'TownOfUs')
}

module.exports.launchTownOfUs = () => {
  return spawn(path.join(this.getModdedGamePath(), 'Among Us.exe'), { 'detached': true })
}

/**
 * Opens windows' file selector, and returns the path selected or null if the user canceled
 * @param {string?} programName The name of the program (default is "Among Us.exe")
 * @returns {Promise<boolean>}
 */
module.exports.killProgram = async (programName = 'Among Us.exe') => {
  const child = spawn('taskkill', ['/f', '/t', '/im', programName])

  let output = ''

  return new Promise(resolve => {
    child.stdout.on('data', (data) => {
      output += data.toString()
    })
    child.on('exit', () => {
      resolve(output)
    })
    child.stdin.end()
  })
}
