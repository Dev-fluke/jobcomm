@echo off
title Push JobComm to GitHub
cd /d "%~dp0"
chcp 65001 >nul
echo ========================================================
echo   กำลังส่งโค้ด JobComm ขึ้น GitHub (Dev-fluke/jobcomm)
echo ========================================================
echo.
echo หากมีหน้าต่างเบราว์เซอร์เด้งขึ้นมา ให้กด "Sign in with your browser" เพื่อยืนยันตัวตน
echo.
git push -u origin main
echo.
echo ========================================================
if %errorlevel% equ 0 (
    echo [OK] ส่งโค้ดขึ้น GitHub เรียบร้อยแล้ว!
) else (
    echo [!] หากการยืนยันตัวตนล้มเหลว สามารถใช้ Personal Access Token ได้
)
echo ========================================================
pause
