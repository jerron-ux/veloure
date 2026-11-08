@echo off
rem VELOURÉ site — local preview (fonts need http://, not file://). Close this window to stop.
cd /d "%~dp0"
start "" http://127.0.0.1:8789/
python -m http.server 8789 --bind 127.0.0.1
