@echo off
title VTeen Deploy Engine 🚀
mode con: cols=60 lines=15
color 0b

:loop
cls
echo ======================================================
echo           🏮 VTEEN DEPLOY ENGINE PRO MAX 🏮
echo ======================================================
echo [%time%] Dang theo doi thay doi code...

git add .
git commit -m "Auto-deploy: %date% %time% 🚀" >nul 2>&1

if %errorlevel% equ 0 (
    echo.
    echo [!] PHAT HIEN THAY DOI!
    echo [%time%] Dang day len GitHub...
    git push origin main
    echo [%time%] DA CAP NHAT THANH CONG!
    echo.
    echo [OK] Cho GitHub Actions xu ly OTA...
) else (
    echo [%time%] Khong co thay doi moi.
)

:: Cho 20 giay truoc khi kiem tra lai
timeout /t 20 >nul
goto loop
