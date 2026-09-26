@echo off
cd /d "%~dp0"

echo Starting local server for Volleyball Rotation Visualizer...
start "Volleyball Visualizer Server (close this window to stop)" cmd /k npx --yes serve -l 5500

timeout /t 2 /nobreak >nul
start "" http://localhost:5500/index.html
