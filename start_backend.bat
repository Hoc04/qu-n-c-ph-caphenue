@echo off
chcp 65001 > nul
title caPHEnue Backend Server
color 0A

echo.
echo  ====================================
echo  🌸  caPHEnue Backend Server
echo  ====================================
echo.
echo  Khoi dong server tai http://localhost:3000
echo  Nhan CTRL+C de dung server
echo.

cd /d "%~dp0backend"
node server.js

pause

