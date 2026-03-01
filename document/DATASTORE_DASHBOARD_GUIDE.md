# 📊 คู่มือการใช้งาน Data Store Dashboard

## ภาพรวม

Data Store Dashboard เป็นฟีเจอร์ใหม่ที่ออกแบบมาเพื่อการนำเสนอและติดตามการใช้งาน Data Store ในระบบ Sangfor SCP อย่างมืออาชีพ มี ความสามารถในการแสดงผลแบบ Real-time พร้อมกราฟและชาร์ตที่สวยงาม และสามารถ Export เป็น PNG ความละเอียดสูงสำหรับการนำเสนอได้

## 🎯 ฟีเจอร์หลัก

### 1. การแสดงผลแบบ Modern Professional
- ✨ การออกแบบ UI/UX แบบ Modern Enterprise
- 📈 กราฟและชาร์ตที่สวยงาม ใช้เทคโนโลยี Recharts
- 🎨 สีสันและเอฟเฟคที่โดดเด่น
- 🌓 รองรับ Dark Mode และ Light Mode

### 2. ข้อมูลที่แสดงผล
Dashboard แสดงข้อมูลที่สำคัญของแต่ละ Data Store:
- **AZ (Availability Zone)**: DC หรือ DR
- **ชื่อ Data Store**: ชื่อที่ตั้งไว้ในระบบ
- **พื้นที่ทั้งหมด**: ความจุรวมของ Data Store
- **พื้นที่ที่ใช้**: พื้นที่ที่ใช้ไปแล้ว
- **พื้นที่คงเหลือ**: พื้นที่ที่เหลืออยู่
- **% การใช้งาน**: เปอร์เซ็นต์การใช้งาน
- **เปรียบเทียบกับเมื่อวาน**: การเปลี่ยนแปลง +/- จากวันก่อน
- **เปรียบเทียบกับ 7 วันก่อน**: การเปลี่ยนแปลง +/- จาก 7 วันก่อน

### 3. การส่งออกข้อมูล
- 📸 Export เป็น PNG ความละเอียดสูง (Scale 2x)
- 🌏 รองรับภาษาไทยเต็มรูปแบบ
- 🖼️ เหมาะสำหรับการนำเสนอหรือรายงาน

## 📋 วิธีการใช้งาน

### ขั้นตอนที่ 1: ตั้งค่า Data Store ที่ต้องการแสดง

1. เข้าสู่ระบบด้วยบัญชี **Admin**
2. ไปที่เมนู **Settings** → **Admin Settings**
3. คลิกที่แท็บ **Data Store Dashboard**
4. เลือก Data Store ที่ต้องการแสดงใน Dashboard โดยคลิกที่ Checkbox หน้าชื่อ
5. คลิกปุ่ม **บันทึกการตั้งค่า**

![Settings Screenshot](https://via.placeholder.com/800x400.png?text=Admin+Settings+Screenshot)

### ขั้นตอนที่ 2: ดู Dashboard

1. ไปที่หน้า **Dashboard** (หน้าแรกของระบบ)
2. คลิกที่แท็บ **Data Store Dashboard**
3. Dashboard จะแสดงข้อมูลของ Data Store ที่เลือกไว้

![Dashboard Screenshot](https://via.placeholder.com/800x600.png?text=Data+Store+Dashboard)

### ขั้นตอนที่ 3: Export เป็น PNG

1. อยู่ในหน้า Data Store Dashboard
2. คลิกปุ่ม **Download** (ไอคอนลูกศรลง) ที่มุมบนขวา
3. ภาพจะถูก Export และดาวน์โหลดอัตโนมัติ
4. ไฟล์จะมีชื่อในรูปแบบ `datastore-dashboard-YYYY-MM-DD.png`

## 📊 องค์ประกอบของ Dashboard

### 1. สรุปภาพรวม (Summary)
แสดงข้อมูลสรุปของ Data Store ทั้งหมด:
- จำนวน Data Store ทั้งหมด
- ความจุรวม
- พื้นที่ใช้ไปแล้ว
- พื้นที่คงเหลือ

### 2. สถานะการใช้งาน (Status Distribution)
แบ่งตามระดับความเสี่ยง:
- **สีเขียว (สถานะปกติ)**: การใช้งานต่ำกว่า 75%
- **สีเหลือง (ใกล้เต็ม)**: การใช้งาน 75-90%
- **สีแดง (วิกฤต)**: การใช้งานเกิน 90%

### 3. กราฟแสดงข้อมูล

#### Pie Chart (วงกลม)
- แสดงสัดส่วนพื้นที่ใช้ไปแล้ว vs พื้นที่ว่าง
- ใช้สีแดงสำหรับพื้นที่ใช้แล้ว และสีเขียวสำหรับพื้นที่ว่าง

#### Bar Chart (แท่ง)
- แสดงการใช้งานของแต่ละ Data Store เป็น GB
- แบ่งเป็นแท่งสีแดง (ใช้แล้ว) และสีเขียว (ว่าง)

### 4. การ์ดรายละเอียดแต่ละ Data Store
แสดงข้อมูลแต่ละ Data Store แยกเป็นการ์ด ประกอบด้วย:
- ชื่อและ AZ
- ความคืบหน้าการใช้งาน (Progress Bar)
- ข้อมูลพื้นที่
- การเปรียบเทียบกับวันก่อนและสัปดาห์ที่แล้ว

## 🔄 การ Refresh ข้อมูล

Dashboard จะ Refresh ข้อมูลอัตโนมัติทุก **1 นาที** หรือคุณสามารถคลิกปุ่ม **Refresh** ที่มุมบนขวาเพื่อ Refresh ทันที

## 🎨 การปรับแต่งสี

Dashboard ใช้ระบบสีที่แสดงสถานะดังนี้:
- **สีเขียว (#10b981)**: ปกติ/ดี
- **สีเหลือง (#f59e0b)**: คำเตือน
- **สีแดง (#ef4444)**: วิกฤต/อันตราย
- **สีน้ำเงิน (#6366f1)**: ข้อมูลทั่วไป
- **สีม่วง (#8b5cf6)**: เน้นพิเศษ

## 🔒 สิทธิ์การใช้งาน

### การดู Dashboard
- **ทุกคน** (Admin, Manager, Viewer): สามารถดู Dashboard ได้

### การตั้งค่า
- **Admin เท่านั้น**: สามารถเลือก Data Store ที่จะแสดงใน Dashboard

## 💡 เคล็ดลับการใช้งาน

### 1. การเลือก Data Store
- ควรเลือกเฉพาะ Data Store ที่สำคัญเพื่อไม่ให้ Dashboard แสดงข้อมูลมากเกินไป
- แนะนำไม่เกิน 10-15 Data Store ต่อหนึ่ง Dashboard

### 2. การ Export PNG
- ควร Export ในโหมด Light Mode เพื่อความชัดเจนในการพิมพ์
- ภาพที่ Export จะมี Resolution สูง (2x) เหมาะสำหรับการนำเสนอ
- ไฟล์ภาพจะมีขนาดประมาณ 1-3 MB ขึ้นอยู่กับจำนวน Data Store

### 3. การติดตามแนวโน้ม
- สังเกตค่า "เปลี่ยนแปลงจากเมื่อวาน" เพื่อดูแนวโน้มการใช้งานรายวัน
- สังเกตค่า "เปลี่ยนแปลงจาก 7 วัน" เพื่อดูแนวโน้มการใช้งานรายสัปดาห์
- หากพบแนวโน้มการเพิ่มขึ้นอย่างรวดเร็ว ควรวางแผนขยาย Capacity

## 🐛 การแก้ไขปัญหา

### Dashboard ไม่แสดงข้อมูล
1. ตรวจสอบว่ามีการเลือก Data Store แล้วหรือไม่ (ไปที่ Settings)
2. ตรวจสอบว่ามีข้อมูล Metrics ในระบบหรือไม่
3. ลอง Refresh หน้าเว็บ (F5)

### ข้อมูลไม่อัพเดท
1. ตรวจสอบว่าระบบ Sync กำลังทำงานหรือไม่
2. ตรวจสอบการเชื่อมต่อกับฐานข้อมูล
3. ลอง Restart Backend Container

### Export PNG ไม่ทำงาน
1. ตรวจสอบว่า Browser รองรับ HTML5 Canvas
2. ปิด Browser Extensions ที่อาจบล็อก Download
3. ลองใช้ Browser อื่น (แนะนำ Chrome หรือ Edge)

## 📱 การใช้งานบน Mobile/Tablet

Dashboard รองรับการแสดงผลบนอุปกรณ์มือถือและแท็บเล็ต:
- **มือถือ**: แสดงการ์ดเป็นคอลัมน์เดียว Full Width
- **แท็บเล็ต**: แสดง 2 คอลัมน์
- **Desktop**: แสดง 3 คอลัมน์

## 🔗 API Endpoints

สำหรับนักพัฒนาที่ต้องการเชื่อมต่อกับ API:

### GET `/sync/dashboard/datastore-settings`
ดึงการตั้งค่า Data Store ที่เลือก
- **Auth**: Admin only
- **Response**: `{"data": {"selected_datastore_ids": [...]}}`

### PUT `/sync/dashboard/datastore-settings`
อัพเดทการตั้งค่า
- **Auth**: Admin only
- **Body**: `{"selected_datastore_ids": [...]}`

### GET `/sync/dashboard/datastore-data`
ดึงข้อมูล Dashboard
- **Auth**: All authenticated users
- **Response**: Array ของ Data Store พร้อมข้อมูลเปรียบเทียบ

## 📞 การติดต่อและการสนับสนุน

หากพบปัญหาหรือต้องการความช่วยเหลือ:
- Email: apirak@example.com
- สร้าง Issue ใน GitHub Repository
- ติดต่อ IT Support Team

## 📝 บันทึกการเปลี่ยนแปลง

### Version 1.0.0 (2026-02-10)
- ✨ เพิ่ม Data Store Dashboard ฟีเจอร์ใหม่
- 📊 รองรับกราฟและชาร์ตแบบ Interactive
- 🖼️ เพิ่มฟีเจอร์ Export เป็น PNG
- 🌏 รองรับภาษาไทยเต็มรูปแบบ
- 🎨 ออกแบบ UI แบบ Modern Professional
- ⚙️ เพิ่มหน้าตั้งค่าใน Admin Settings

---

**Copyright © 2026 Sangfor SCP VM Management System**  
**Documentation by AI Agent - GitHub Copilot**
