@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Podaj sciezke do pliku CSV / JSON / SQLite:
set /p INP=Plik: 
echo Nazwa zrodla (np. Baza czlonkow):
set /p SRC=Nazwa: 
echo Dla SQLite opcjonalnie podaj SELECT (lub pozostaw puste):
set /p SQL=SQL: 
if /I "%~xINP"==".db" goto DB
if /I "%~xINP"==".sqlite" goto DB
where py >nul 2>nul
if %errorlevel%==0 (py -3 pl\my_databases_importer.py "%INP%" --source-name "%SRC%" --output "%SRC%.graph.json") else (python pl\my_databases_importer.py "%INP%" --source-name "%SRC%" --output "%SRC%.graph.json")
goto END
:DB
where py >nul 2>nul
if %errorlevel%==0 (py -3 pl\my_databases_importer.py "%INP%" --sqlite-query "%SQL%" --source-name "%SRC%" --output "%SRC%.graph.json") else (python pl\my_databases_importer.py "%INP%" --sqlite-query "%SQL%" --source-name "%SRC%" --output "%SRC%.graph.json")
:END
pause
