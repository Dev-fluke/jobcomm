@echo off
title JobComm RTAF - ระบบบันทึกภารกิจ แผนกสื่อสาร อย.
cd /d "%~dp0"
echo ========================================================
echo   ระบบบันทึกภารกิจ แผนกสื่อสาร หน่วยบัญชาการอากาศโยธิน
echo   (JobComm RTAF - Communications Department)
echo ========================================================
echo.
echo กำลังเปิดเซิร์ฟเวอร์ที่พอร์ต 5000...
echo สามารถเข้าใช้งานได้ที่: http://localhost:5000
echo.
npm start
pause
