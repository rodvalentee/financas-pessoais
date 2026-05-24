@echo off
echo ============================================================
echo  Controle Financeiro - Build PyInstaller
echo ============================================================

:: Tenta encontrar o pyinstaller
set PYINST=%APPDATA%\Python\Python314\Scripts\pyinstaller.exe
where pyinstaller >nul 2>&1 && set PYINST=pyinstaller

pip install flask pyinstaller --quiet --user

:: Remove build anterior
rmdir /s /q dist 2>nul
rmdir /s /q build 2>nul
del ControleFinanceiro.spec 2>nul

:: Gera o executável portátil
"%PYINST%" ^
  --onefile ^
  --windowed ^
  --name "ControleFinanceiro" ^
  --add-data "templates;templates" ^
  --add-data "static;static" ^
  app.py

echo.
if exist "dist\ControleFinanceiro.exe" (
    echo [OK] Executavel gerado: dist\ControleFinanceiro.exe
    echo.
    echo Copie APENAS o .exe para qualquer pasta.
    echo O banco financas.db sera criado na mesma pasta do .exe.
    echo.
    explorer dist
) else (
    echo [ERRO] Build falhou. Verifique o log acima.
)
pause
