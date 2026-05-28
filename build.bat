@echo off
echo ============================================================
echo  Controle Financeiro - Build Nuitka (codigo nativo)
echo ============================================================

pip install nuitka --quiet --user

rmdir /s /q dist_nuitka 2>nul

python -m nuitka ^
  --onefile ^
  --windows-console-mode=disable ^
  --include-data-dir=templates=templates ^
  --include-data-dir=static=static ^
  --include-package=flask ^
  --include-package=werkzeug ^
  --include-package=jinja2 ^
  --include-package=click ^
  --include-package=itsdangerous ^
  --assume-yes-for-downloads ^
  --output-filename=ControleFinanceiro.exe ^
  --output-dir=dist_nuitka ^
  app.py

echo.
if exist "dist_nuitka\ControleFinanceiro.exe" (
    echo [OK] Executavel gerado: dist_nuitka\ControleFinanceiro.exe
    echo.
    echo Copie APENAS o .exe para qualquer pasta.
    echo O banco financas.db sera criado na mesma pasta do .exe.
    echo.
    explorer dist_nuitka
) else (
    echo [ERRO] Build falhou. Verifique o log acima.
)
pause
