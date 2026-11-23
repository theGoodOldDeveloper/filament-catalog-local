@echo off
chcp 65001 >nul
setlocal
title Filament Catalog
cd /d "%~dp0"

if not exist "%~dp0runtime\node.exe" goto notextracted
if not exist "%~dp0app\server.js" goto notextracted

"%~dp0runtime\node.exe" --version >nul 2>&1
if errorlevel 1 goto blocked

"%~dp0runtime\node.exe" "%~dp0app\launcher.cjs"
if errorlevel 1 goto failed
goto end

:notextracted
echo.
echo   HIBA: a csomag fájljai nem találhatók az indító mellett.
echo   Előbb csomagold ki a teljes ZIP-et egy mappába (jobb gomb, Az összes kibontása),
echo   és a kicsomagolt mappából indítsd az indito.bat fájlt.
echo.
echo   ERROR: the package files were not found next to the launcher.
echo   Extract the whole ZIP into a folder first (right-click, Extract All),
echo   then run indito.bat from the extracted folder.
goto wait

:blocked
echo.
echo   HIBA: a mellékelt futtató (runtime\node.exe) nem indítható el.
echo   Valószínűleg a Windows vagy a víruskereső blokkolja. Engedélyezd a futtatását,
echo   vagy a ZIP kicsomagolása ELŐTT: jobb gomb a ZIP-en, Tulajdonságok, Tiltás feloldása.
echo   Részletek: OLVASSEL.txt
echo.
echo   ERROR: the bundled runtime (runtime\node.exe) cannot be started.
echo   Windows or your antivirus is probably blocking it. Allow it to run,
echo   or BEFORE extracting the ZIP: right-click the ZIP, Properties, Unblock.
echo   Details: OLVASSEL.txt
goto wait

:failed
echo.
echo   Az alkalmazás hibával állt le. A fenti üzenet segít; részletek: OLVASSEL.txt
echo   The app stopped with an error. See the message above; details: OLVASSEL.txt
goto wait

:wait
echo.
pause

:end
endlocal
