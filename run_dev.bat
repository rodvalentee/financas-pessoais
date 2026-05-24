@echo off
title Controle Financeiro — servidor
echo Iniciando Controle Financeiro...
pip install flask --quiet

:loop
python app.py
echo.
echo *** Servidor parou. Reiniciando em 3 segundos... (feche esta janela para parar) ***
timeout /t 3 /nobreak >nul
goto loop
