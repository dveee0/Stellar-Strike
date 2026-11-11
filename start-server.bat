@echo off
title Stellar Strike Multiplayer Server
echo =======================================================
echo   STELLAR STRIKE: CYBER TYPING INTERCEPTOR
echo   Node.js & WebSocket Multiplayer Server
echo =======================================================
echo.
set PATH=%~dp0.bin\node-v20.18.0-win-x64;%PATH%
start http://localhost:3001
node server.js
pause
