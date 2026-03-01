# 🚀 แผนการพัฒนา Datastore AI Prediction (Prophet)

เอกสารฉบับนี้ระบุรายละเอียดโครงสร้างและขั้นตอนการดำเนินงานเพื่อเพิ่มฟีเจอร์การพยากรณ์ข้อมูลด้วย AI สำหรับระบบบริหารจัดการ Datastore

---

## 1. บทนำ (Introduction)
โครงการนี้มีวัตถุประสงค์เพื่อพัฒนาฟีเจอร์ **"AI Prediction"** บนหน้า `DataStoreDetailPage` โดยใช้โมเดล **Facebook Prophet** ในการวิเคราะห์แนวโน้มการเติบโตของข้อมูล (Disk Growth) และคาดการณ์วันที่พื้นที่จัดเก็บจะเต็ม (Full Date) พร้อมวิเคราะห์ความเสี่ยงและพฤติกรรมของข้อมูลล่วงหน้า

---

## 2. การวิเคราะห์โครงสร้างปัจจุบัน (Current Architecture Analysis)
ระบบปัจจุบันมีโครงสร้างที่พร้อมต่อการต่อยอดดังนี้:

* **Backend:** FastAPI (Python) เชื่อมต่อกับ PostgreSQL/TimescaleDB
* **Database:** มีตาราง `metrics.datastore_metrics` เก็บข้อมูล Time-series ย้อนหลัง ซึ่งเพียงพอสำหรับการเทรน AI
* **Frontend:** React + TypeScript + MUI มีหน้า `DataStoreDetailPage.tsx` และระบบ Tab Analytics พื้นฐานอยู่แล้ว

---

## 3. แผนการเปลี่ยนแปลงระบบ (Proposed Changes)

### 3.1 ฐานข้อมูล (Database)
สร้างตารางใหม่ภายใต้ Schema `analytics` เพื่อเก็บผลพยากรณ์ ลดภาระการประมวลผลแบบ Real-time

**Table: `analytics.ai_forecasts`**
* `id` (PK)
* `datastore_id` (FK)
* `forecast_date`: วันที่ทำการพยากรณ์
* `ds`: Datestamp (วันที่ในอนาคต)
* `yhat`: ค่าพยากรณ์ Usage (MB)
* `yhat_lower`: ขอบเขตล่าง (Confidence Interval)
* `yhat_upper`: ขอบเขตบน (Confidence Interval)
* `trend`: แนวโน้มหลัก
* `seasonal`: ค่า Seasonality

**Table: `analytics.ai_summaries`**
* เก็บค่าสรุป: `predicted_full_date`, `risk_score`, `growth_rate_status`, `anomaly_count`

### 3.2 Backend (FastAPI)
* **Dependencies:** เพิ่ม `prophet`, `pandas`, `plotly` ใน `requirements.txt`
* **New Service:** `app/services/ai_prediction_service.py`
    * `train_and_predict(datastore_id)`: ดึงข้อมูล -> Preprocess -> Fit Prophet Model -> Predict ล่วงหน้า 90 วัน
    * `detect_anomalies()`: ตรวจสอบหาช่วงเวลาที่ข้อมูลกระโดดผิดปกติ
* **Scheduler:** ตั้ง Job (Sync V2) ให้รันโมเดลวันละ 1 ครั้ง เวลา 02:00 น.
* **API Endpoint:** `/datastores/{id}/ai-prediction`

### 3.3 Frontend (React)
ปรับปรุง `DataStoreDetailPage.tsx` เพิ่ม Tab: **"🤖 AI Prediction"**

**Components ใหม่ (อัพเดทแล้ว):**
1. **🥇 Capacity Planning Dashboard:** แผงวิเคราะห์การใช้งานแสดงสถานะปัจจุบัน, 30 วัน, 90 วัน และคำแนะนำ
2. **🥈 Risk Ranking Queue:** คิวการจัดอันดับความเสี่ยงของ Datastore ต่าง ๆ ในระบบ
3. **🥉 Capacity Exhaustion Timeline:** ไทม์ไลน์แสดงการเติบโตของพื้นที่จากปัจจุบันจนถึงวันที่เต็ม
4. **⭐ Growth Acceleration Insight:** วิเคราะห์อัตราการเติบโตรายวัน, สัปดาห์, เดือน
5. **⭐ Forecast Accuracy:** แสดงความแม่นยำของโมเดล AI (คะแนน 85-95% สำหรับ Prophet)
6. **Forecast Chart (Main):** ใช้ `Recharts` AreaChart แสดงเส้น Actual (สีน้ำเงิน), Forecast (เส้นประสีส้ม) และ Confidence Interval (พื้นที่สีจาง)
7. **Risk Ranking Dashboard:** Card แสดงสถานะความเสี่ยง (Critical, Warning, Safe)
8. **Insight Cards:**
   * **Predict Full Date:** แสดงวันที่และนาฬิกานับถอยหลัง
   * **Seasonality:** กราฟ Pattern รายสัปดาห์ (Weekly Usage)
   * **Growth Rate Analysis:** วิเคราะห์อัตราการเติบโต (MB/Day) เทียบกับเดือนก่อนหน้า

### 3.4 UI/UX Design
* **Dark Mode Support:** ออกแบบให้กลมกลืนกับระบบเดิม
* **Visual Style:** ใช้ Gradients และ Glassmorphism ในตัว Card
* **Language:** ใช้ภาษาไทยในส่วน Label/Tooltip และทับศัพท์ในส่วน Technical Terms

---

## 4. ขั้นตอนการดำเนินงาน (Execution Steps)

1.  **Environment Setup:** ติดตั้ง Library ที่จำเป็น (`pandas`, `numpy`, `prophet` (optional)) และเตรียม TimescaleDB สำหรับเก็บ metrics
2.  **Backend Development (✅ เสร็จแล้ว):**
    * เขียน Query ดึงข้อมูล `metrics.datastore_metrics` (ใช้ time_bucket)
    * พัฒนา `app/services/ai_prediction_service.py` ที่รองรับ **Prophet** (ถ้าใช้) และ **Linear Regression** เป็น fallback
    * เพิ่ม API Endpoint: `GET /sync/datastores/{datastore_id}/ai-prediction`
    * โค้ดถูกคัดลง container และรีสตาร์ท backend เพื่อให้บริการทันที
3.  **Frontend Development (✅ เสร็จแล้ว):**
    * เพิ่ม Tab **"🤖 AI Prediction"** ใน `DataStoreDetailPage.tsx`
    * สร้าง UI components: Risk Dashboard, Forecast Chart (Recharts), Seasonality BarChart, Anomalies Table, Insight Cards
    * เพิ่ม client API `datastoresApi.getAIPrediction()` และ `AIPredictionResponse` interface
4.  **Testing (บางส่วนเสร็จแล้ว):**
    * ทดสอบ API ด้วย curl (ต้องใช้ JWT token) — คืนข้อมูล `forecast`, `prediction`, `capacity`, `anomalies`, `seasonality` ตามที่ออกแบบ
    * ปรับ minimum historical days เป็น **3 วัน** ชั่วคราวเพื่อให้ทดสอบได้ใน environment ที่มีข้อมูลจำกัด
5.  **Documentation:** อัปเดตเอกสารฉบับนี้ (อัปเดตสรุปการทำงานและขั้นตอนการทดสอบ)

---

## 5. การทดสอบ (Verification Plan) ✅ (สิ่งที่ทำแล้ว/ยังขาด)

### 5.1 Automated Tests
* [ ] รัน `pytest` สำหรับฟังก์ชันการคำนวณวันที่จะเต็ม (ยังไม่ได้เขียน)
* [ ] สร้าง unit tests สำหรับ `ai_prediction_service` (ยังไม่ได้เขียน)

### 5.2 Manual Verification (ทำแล้ว)
* [✅] เรียก API: `GET /sync/datastores/{id}/ai-prediction` โดยใส่ `Authorization: Bearer <token>`
  - ตัวอย่างการทดสอบ: ใช้บัญชี `admin` เพื่อดึง token แล้วเรียก endpoint
* [✅] ทดสอบกับหลาย datastore แล้วได้รับผลลัพธ์ `success:false` เมื่อข้อมูลไม่เพียงพอ และ `success:true` เมื่อมีข้อมูลพอ
* [✅] Frontend: เปิด Tab "🤖 AI Prediction" เพื่อแสดงกราฟและการ์ดสรุป (หลัง build แล้ว)

---

## 6. ข้อกำหนดและข้อสังเกต (Constraints & Notes)
* Prophets เป็น dependency **ไม่บังคับ** — โค้ดจะใช้ **Linear Regression** เป็น fallback หาก `prophet` ไม่ถูกติดตั้ง
* เพื่อความแม่นยำจริง ๆ ควรมีข้อมูลย้อนหลัง **7–14 วัน** แต่สำหรับการทดสอบระบบเราอนุญาตขั้นต่ำ **3 วัน** (สามารถปรับคืนได้)
* ยังไม่ได้สร้างตาราง `analytics.ai_forecasts` และ `analytics.ai_summaries` ตามแผน (แนะนำให้สร้างหากต้องการเก็บผลลัพธ์แบบ scheduled)
* Scheduler (Sync V2 job ให้รันโมเดลเป็นประจำ) ยังไม่ได้ตั้งค่า — ควรเพิ่ม Cron job ที่รันทุกวัน 02:00 น. ในอนาคต

---

## 7. Implementation Log / Changelog (สรุปสิ่งที่ทำแล้ว) 🛠️

- ✅ **Backend:** เพิ่ม `app/services/ai_prediction_service.py` (Prophet + Linear Regression fallback)
- ✅ **API:** เพิ่ม `GET /sync/datastores/{datastore_id}/ai-prediction` ใน `routers/sync.py`
- ✅ **Dependencies:** เพิ่ม `pandas`, `numpy`, `prophet` ใน `requirements.txt` (prophet เป็น optional dependency)
- ✅ **Frontend:** เพิ่ม Tab และ UI components ใน `DataStoreDetailPage.tsx` และ `datastoresApi.getAIPrediction()` (รวม Recharts charts)- ✅ **Enhanced UI Features (อัพเดทล่าสุด):**
  * ✅ **🥇 Capacity Planning Dashboard** - แผงวิเคราะห์การใช้งานใน 4 ช่วงเวลา
  * ✅ **🥈 Risk Ranking Queue** - คิวการจัดอันดับความเสี่ยงและระดับความเสี่ยง
  * ✅ **🥉 Capacity Exhaustion Timeline** - ไทม์ไลน์แสดงการเติบโตของพื้นที่
  * ✅ **⭐ Growth Acceleration Insight** - วิเคราะห์อัตราการเติบโตและสถานะ
  * ✅ **⭐ Forecast Accuracy** - แสดงความแม่นยำและคุณภาพข้อมูล- ✅ **Build & Deploy:** ทำการ build frontend และ restart containers; คัดลอกไฟล์ Python เข้า container แล้วรีสตาร์ท backend เพื่อให้ endpoint พร้อมใช้งาน
- ✅ **Testing:** เรียก API และยืนยันผลลัพธ์ (ทั้งกรณีข้อมูลไม่พอ และกรณีใช้งานได้)

### Pending / Recommended
- [ ] สร้างตารางใน schema `analytics` (`ai_forecasts`, `ai_summaries`) และ migration scripts
- [ ] ติดตั้ง `prophet` ใน production container หรือ image (rebuild image เพื่อใช้ Prophet full features)
- [ ] เขียน automated tests (pytest) สำหรับการคำนวณและกรณีขอบ
- [ ] เพิ่ม scheduler job (Sync V2) ให้รัน train & persist รายวัน

---

## 8. How to test locally / Quickstart 🧪

1. Build frontend:
   - cd `webapp/frontend` && `npm run build`
   - Restart frontend container (ถ้าใช้ Docker) หรือ serve the build locally
2. Ensure backend has Python modules (`pandas`, `numpy`) installed. To use Prophet, install `prophet` and rebuild image.
3. Get JWT token:
   - `curl -s http://<backend>/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | jq -r '.access_token'`
4. Call AI endpoint:
   - `curl -s "http://<backend>/sync/datastores/<datastore_id>/ai-prediction?historical_days=30&forecast_days=90" -H "Authorization: Bearer <token>" | jq '.'`
5. Frontend UI: ไปที่ Datastore detail page → เลือก Tab "🤖 AI Prediction" → ตรวจสอบกราฟ, risk card, anomalies

---

## 9. Final Notes / Recommendations 💡
* หากต้องการผลลัพธ์ที่แม่นยำใน production ให้ติดตั้ง `prophet` ใน image และสร้างตาราง `analytics` เพื่อเก็บผลที่คำนวณได้แบบ scheduled
* เขียน unit tests สำหรับ core logic เพื่อป้องกัน regression เมื่อเปลี่ยนโมเดลหรือ preprocessing
* พิจารณาเพิ่ม backtesting metrics (MAE, RMSE) ในผลลัพธ์ที่แสดงเพื่อช่วยวิเคราะห์คุณภาพของโมเดล

---

(บันทึกการอัปเดต: 2026-02-05 - เพิ่มฟีเจอร์ใหม่ 5 รายการ)