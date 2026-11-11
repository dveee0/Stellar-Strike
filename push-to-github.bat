@echo off
set "PATH=E:\VSCode\Git\cmd;%PATH%"
title Stellar Strike - Push to GitHub

echo ========================================================
echo   STELLAR STRIKE - PUSH KE GITHUB
echo ========================================================
echo.
echo Sedang mengunggah (push) kode ke:
echo https://github.com/dveee0/Stellar-Strike
echo.
echo CATATAN:
echo Jika muncul pop-up browser kecil "Git Credential Manager",
echo silakan klik "Sign in with your browser" dan izinkan akses.
echo.
echo Memulai push...
echo --------------------------------------------------------
git push -u origin main
echo --------------------------------------------------------
echo.
if %ERRORLEVEL% equ 0 (
  echo ========================================================
  echo [BERHASIL] Seluruh kode game sukses terunggah ke GitHub!
  echo Buka: https://github.com/dveee0/Stellar-Strike
  echo ========================================================
) else (
  echo ========================================================
  echo [GAGAL] Terjadi kesalahan saat push.
  echo Periksa apakah Anda sudah login ke akun GitHub di browser.
  echo ========================================================
)
echo.
pause
