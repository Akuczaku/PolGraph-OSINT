@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -m pip install -r requirements.txt -r requirements-build.txt
  if errorlevel 1 goto ERR
  py -3 build_app.py
) else (
  python -m pip install -r requirements.txt -r requirements-build.txt
  if errorlevel 1 goto ERR
  python build_app.py
)
if errorlevel 1 goto ERR
echo [OK] Gotowe. Sprawdz folder dist.
pause
exit /b 0
:ERR
echo [BLAD] Build nieudany.
pause
exit /b 1
