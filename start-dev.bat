@echo off
title Stellar Strike Next.js Dev Server
echo =======================================================
echo   STELLAR STRIKE: Next.js & Node.js Development
echo =======================================================
echo.
set PATH=%~dp0.bin\node-v20.18.0-win-x64;%PATH%
start http://localhost:3000
npm run dev
pause
