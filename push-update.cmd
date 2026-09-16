@echo off
REM Double-clique ce fichier (ou tape push-update.cmd dans un terminal ouvert
REM a la racine du projet) pour envoyer une mise a jour OTA a l'app.
REM Voir TUTO-MISE-A-JOUR.md pour le detail de chaque etape.

cd /d "%~dp0"
node scripts\push-update.js

echo.
pause
