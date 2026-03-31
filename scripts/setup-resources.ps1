$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ResourcesDir = Join-Path $ProjectRoot "resources"
$PythonDir = Join-Path $ResourcesDir "python"
$FfmpegDir = Join-Path $ResourcesDir "ffmpeg"

$PythonVersion = "3.11.9"
$PythonUrl = "https://www.python.org/ftp/python/$PythonVersion/python-$PythonVersion-embed-amd64.zip"

# Download a more stable Windows build of FFmpeg
$FfmpegUrl = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"

Write-Host "Setting up Electron resources in $ResourcesDir..."

# Clean up existing
if (Test-Path $ResourcesDir) {
    Remove-Item -Recurse -Force $ResourcesDir
}
New-Item -ItemType Directory -Force -Path $PythonDir | Out-Null
New-Item -ItemType Directory -Force -Path $FfmpegDir | Out-Null

# -------------------------------------------------------------
# 1. PYTHON EMBEDDABLE setup
# -------------------------------------------------------------
Write-Host "Downloading Python $PythonVersion..."
$PythonZip = Join-Path $ResourcesDir "python.zip"
Invoke-WebRequest -Uri $PythonUrl -OutFile $PythonZip

Write-Host "Extracting Python..."
Expand-Archive -Path $PythonZip -DestinationPath $PythonDir -Force
Remove-Item $PythonZip

# Fix python311._pth to enable "import site" and site-packages
$PthFile = Join-Path $PythonDir "python311._pth"
if (Test-Path $PthFile) {
    $Content = Get-Content $PthFile
    $Content = $Content -replace '#import site', 'import site'
    Set-Content -Path $PthFile -Value $Content
}

# Download get-pip.py
Write-Host "Installing pip..."
$GetPip = Join-Path $PythonDir "get-pip.py"
Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile $GetPip

# Install pip
$PythonExe = Join-Path $PythonDir "python.exe"
& $PythonExe $GetPip
Remove-Item $GetPip

# Install requirements
Write-Host "Installing Python requirements..."
$ReqPath = Join-Path (Join-Path $ProjectRoot "backend") "requirements.txt"
& $PythonExe -m pip install -r $ReqPath

# -------------------------------------------------------------
# 2. FFMPEG setup
# -------------------------------------------------------------
Write-Host "Downloading FFmpeg..."
$FfmpegZip = Join-Path $ResourcesDir "ffmpeg.zip"
Invoke-WebRequest -Uri $FfmpegUrl -OutFile $FfmpegZip

Write-Host "Extracting FFmpeg..."
# extract to a temp location because it has a master folder inside
$FfmpegTempDir = Join-Path $ResourcesDir "ffmpeg_temp"
Expand-Archive -Path $FfmpegZip -DestinationPath $FfmpegTempDir -Force

# Locate the bin folder containing ffmpeg.exe inside the extracted structure
$BinFolder = Get-ChildItem -Path $FfmpegTempDir -Directory -Recurse -Filter "bin" | Select-Object -First 1

if ($BinFolder) {
    Copy-Item -Path (Join-Path $BinFolder.FullName "ffmpeg.exe") -Destination $FfmpegDir -Force
    Copy-Item -Path (Join-Path $BinFolder.FullName "ffprobe.exe") -Destination $FfmpegDir -Force
} else {
    Write-Warning "Could not find 'bin' folder in FFmpeg zip. Manually place ffmpeg.exe inside resources/ffmpeg."
}

Remove-Item -Recurse -Force $FfmpegTempDir
Remove-Item $FfmpegZip

Write-Host "✅ Resources setup completed successfully!"
