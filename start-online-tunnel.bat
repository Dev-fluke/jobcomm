@echo off
title JobComm RTAF - ระบบออนไลน์ Cloudflare Tunnel
cd /d "%~dp0"
chcp 65001 >nul
echo ========================================================
echo   ระบบบันทึกภารกิจ แผนกสื่อสาร หน่วยบัญชาการอากาศโยธิน
echo   (JobComm RTAF - Cloudflare Tunnel Online)
echo ========================================================
echo.
echo [1/2] กำลังเปิดเซิร์ฟเวอร์ระบบหลัก (Node.js)...
start "JobComm Server" cmd /k "cd /d %~dp0 && npm start"

echo [2/2] กำลังเชื่อมต่อ Cloudflare Tunnel ส่งลิงก์ออกอินเทอร์เน็ต...
echo --------------------------------------------------------
echo  - เมื่อระบบต่อสำเร็จ จะมีลิงก์ https://xxxx.trycloudflare.com ปรากฏขึ้น
echo  - นำลิงก์ดังกล่าวไปเปิดใช้งานได้ทุกที่ (มือถือ 4G/5G, Smart TV, แท็บเล็ต)
echo  - ปลอดภัย 100% มี SSL (HTTPS) อัตโนมัติ โดยไม่ต้อง Forward Port
echo --------------------------------------------------------
echo.

cloudflared tunnel --url http://localhost:5000
pause
