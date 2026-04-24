@echo off
title FitPulse Website
echo.
echo  Starting FitPulse Website...
echo.
if not exist node_modules (
    echo  First run detected - installing dependencies...
    echo  This will take about 30 seconds...
    echo.
    call npm install
    echo.
)
echo  Opening browser at http://localhost:3000
echo.
start "" http://localhost:3000
node server.js
pause
