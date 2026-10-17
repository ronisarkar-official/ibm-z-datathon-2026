const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs")

const backendDir = path.resolve(__dirname, "../../backend")
const venvPythonWin = path.join(backendDir, ".venv", "Scripts", "python.exe")
const venvPythonPosix = path.join(backendDir, ".venv", "bin", "python")

let pythonCmd = "python"
if (fs.existsSync(venvPythonWin)) {
  pythonCmd = venvPythonWin
} else if (fs.existsSync(venvPythonPosix)) {
  pythonCmd = venvPythonPosix
}

let currentProcess = null
let isShuttingDown = false

function startUvicorn() {
  if (isShuttingDown) return

  currentProcess = spawn(
    pythonCmd,
    ["-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
    {
      cwd: backendDir,
      stdio: "inherit",
      shell: false,
    }
  )

  currentProcess.on("exit", (code) => {
    if (!isShuttingDown) {
      console.log(`[dev-backend] Process exited with code ${code}. Respawning in 1s...`)
      setTimeout(startUvicorn, 1000)
    }
  })
}

startUvicorn()

process.on("SIGINT", () => {
  isShuttingDown = true
  if (currentProcess) currentProcess.kill("SIGINT")
  process.exit(0)
})

process.on("SIGTERM", () => {
  isShuttingDown = true
  if (currentProcess) currentProcess.kill("SIGTERM")
  process.exit(0)
})
