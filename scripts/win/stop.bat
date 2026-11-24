@echo off
chcp 65001 >nul
setlocal
title Filament Catalog - stop
cd /d "%~dp0"
if not exist "%~dp0runtime\node.exe" goto missing
"%~dp0runtime\node.exe" "%~dp0app\launcher.cjs" --stop
goto end
:missing
echo.
echo   HIBA: a csomag fájljai nem találhatók az indító mellett.
echo   ERROR: the package files were not found next to this file.
pause
:end
endlocal
