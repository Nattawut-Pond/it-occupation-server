// rateLimiter.js
const rateLimit = require('express-rate-limit');

// สร้างฟังก์ชัน rateLimit ที่สามารถปรับแต่งการตั้งค่าได้
function createRateLimiter(windowMs = 15 * 60 * 1000, maxRequests = 1000) {
  return rateLimit({
    windowMs, // กำหนดช่วงเวลาที่จำกัดจำนวนการทำคำขอ
    max: maxRequests, // กำหนดจำนวนคำขอสูงสุด
    message: 'คุณขอการเชื่อมต่อต่อเซิฟเวอร์มากเกินไป กรุณาลองใหม่ภายหลัง',
    headers: true, // แสดง headers ของ rate limit
  });
}

module.exports = { createRateLimiter };
