@echo off
setlocal
cd /d "%~dp0backend"

set "VENV_PY="
if exist ".venv\Scripts\python.exe" set "VENV_PY=.venv\Scripts\python.exe"
if not defined VENV_PY if exist "venv\Scripts\python.exe" set "VENV_PY=venv\Scripts\python.exe"

if not defined VENV_PY (
  echo Setting up Python virtual environment in backend\.venv...
  where py >nul 2>nul
  if %errorlevel%==0 (
    py -3 -m venv .venv
  ) else (
    python -m venv .venv
  )
  set "VENV_PY=.venv\Scripts\python.exe"
)

if not exist "%VENV_PY%" (
  echo Error: Python 3 not found. Install Python 3 or add it to PATH.
  exit /b 1
)

"%VENV_PY%" -c "import uvicorn" >nul 2>nul
if errorlevel 1 (
  echo Installing backend dependencies...
  "%VENV_PY%" -m pip install --upgrade pip
  "%VENV_PY%" -m pip install -r requirements.txt
)

if not exist ".env" if exist ".env.example" copy ".env.example" ".env" >nul

if not defined HOST set "HOST=0.0.0.0"
if not defined PORT set "PORT=8000"

echo Starting MDIP backend on http://%HOST%:%PORT%
"%VENV_PY%" -m uvicorn main:app --host %HOST% --port %PORT% --reload
