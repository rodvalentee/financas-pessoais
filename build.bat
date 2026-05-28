@echo off
echo ============================================================
echo  Controle Financeiro - Build PyInstaller
echo ============================================================

pip install pyinstaller --quiet --user

rmdir /s /q dist 2>nul
rmdir /s /q build 2>nul
del /q ControleFinanceiro.spec 2>nul

pyinstaller ^
  --onefile ^
  --windowed ^
  --name ControleFinanceiro ^
  --icon "static\icon.ico" ^
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
