@echo off
set PATH=C:\Program Files\nodejs;C:\Users\Administrator\AppData\Roaming\npm;%PATH%
cd /d C:\repotemp\web
"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next build 2>&1
echo BUILD_EXIT_CODE=%ERRORLEVEL%
