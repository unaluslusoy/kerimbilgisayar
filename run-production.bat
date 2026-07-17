@echo off
title Kerim Bilgisayar Sunucusu (Geri Kazanimli)
color 0a
echo =======================================================
echo  🚀 KERIM BILGISAYAR SUNUCUSU OTOMATIK YENIDEN BASLATICI
echo =======================================================
echo Bu pencere acik kaldigi surece, sunucu cokse bile otomatik
echo olarak yeniden baslatilacaktir.
echo.

:loop
echo [%date% %time%] Sunucu baslatiliyor...
npm run start
echo.
echo [%date% %time%] 💥 Sunucu kapandi veya coktu!
echo 5 saniye icinde otomatik olarak yeniden baslatiliyor...
echo.
timeout /t 5
goto loop
