@echo off
echo Starting HCX FHIR Viewer...
echo.
echo Starting development server on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
cd %~dp0\..\frontend
call npm install
call npm start
pause
