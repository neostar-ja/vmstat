# 🚀 Quick Start Guide - Data Store Executive Dashboard

## การเข้าใช้งานด่วน (Quick Access)

### 🌐 URL
```
https://10.251.150.222:3345/vmstat/datastores
```

### 📍 ตำแหน่งในระบบ
1. Login เข้าระบบ
2. คลิกเมนู **"DataStores"** ทางซ้าย
3. คลิกแท็บ **"ภาพรวมผู้บริหาร"** ด้านบน

---

## ⚡ ฟีเจอร์หลัก 3 ข้อ

### 1. 🖥️ Full-Screen Mode
- **คลิก**: ปุ่ม 🔲 มุมบนขวา
- **ออก**: ปุ่ม 🗗 หรือกด ESC
- **ใช้เมื่อ**: แสดงบนทีวี, จอมอนิเตอร์, ห้องประชุม

### 2. 📸 Export PNG
- **คลิก**: ปุ่ม ⬇️ มุมบนขวา
- **ผลลัพธ์**: ภาพ PNG ความละเอียดสูง
- **ใช้เมื่อ**: ต้องการรายงาน, นำเสนอ, แนบเอกสาร

### 3. 🔄 Auto-Refresh
- **อัตโนมัติ**: ทุก 60 วินาที
- **Manual**: คลิกปุ่ม 🔄 มุมบนขวา
- **ใช้เมื่อ**: ติดตามสถานะ Real-time

---

## 🎨 สีและความหมาย

### การใช้งาน Storage:
| สี | ระดับ | ความหมาย |
|---|-------|----------|
| 🟢 เขียว | 0-70% | ✅ ปกติ |
| 🟡 เหลือง | 70-80% | ⚠️ ควรระวัง |
| 🟠 ส้ม | 80-90% | 🚨 ใกล้เต็ม |
| 🔴 แดง | 90-100% | 🔥 วิกฤต |

### แนวโน้ม:
| ไอคอน | สี | ความหมาย |
|------|---|----------|
| 📈 | แดง | เพิ่มขึ้น (พื้นที่ลดลง) ⚠️ |
| 📉 | เขียว | ลดลง (พื้นที่เพิ่มขึ้น) ✅ |

---

## 🔧 การตั้งค่า (สำหรับ Admin)

### เลือก Data Store ที่จะแสดง:
1. ไปที่ **Settings** → **Admin Settings**
2. คลิกแท็บ **"Data Store Dashboard"**
3. ✓ ติ๊กเลือก Data Store
4. คลิก **"บันทึกการตั้งค่า"**

---

## 📱 รองรับอุปกรณ์

| อุปกรณ์ | คอลัมน์ | สถานะ |
|---------|---------|-------|
| 📱 Mobile | 1 | ✅ |
| 📱 Tablet | 2 | ✅ |
| 💻 Desktop | 3 | ✅ |
| 🖥️ 4K Display | 3-4 | ✅ |

---

## ❓ แก้ปัญหาเบื้องต้น

### Q: Dashboard ว่างเปล่า?
**A**: ไปตั้งค่าเลือก Data Store ใน Admin Settings ก่อน

### Q: Export ไม่ได้?
**A**: ลองปิด Browser Extensions หรือ Hard Refresh (Ctrl+F5)

### Q: Full-Screen ไม่ทำงาน?
**A**: อนุญาต Fullscreen ในการตั้งค่า Browser

---

## 📊 ข้อมูลที่แสดง

### Summary (ด้านบน):
- จำนวน Data Store ทั้งหมด
- ความจุรวม (Total Capacity)
- พื้นที่ใช้แล้ว (Used)
- พื้นที่ว่าง (Free)

### Charts (กลาง):
- **Pie Chart**: สัดส่วนการใช้งานแต่ละ Data Store
- **Bar Chart**: เปรียบเทียบ ใช้ไป vs ว่าง

### Cards (ด้านล่าง):
แต่ละการ์ดแสดง:
- สถานะ (Status)
- ประเภท (Type)
- AZ (DC/DR)
- แถบการใช้งานแบบสี
- สถิติ: ความจุ, ใช้ไป, คงเหลือ
- แนวโน้ม: 1 วัน, 7 วัน

---

## 🎯 Use Cases

### 1. แสดงบน TV ห้องประชุม
```
1. เปิดเว็บบนคอมพิวเตอร์ที่ต่อกับ TV
2. Login และเปิด Executive Dashboard
3. คลิก Full-Screen (🔲)
4. ปล่อยให้ Auto-refresh ทำงาน
```

### 2. รายงานผู้บริหาร
```
1. เปิด Executive Dashboard
2. คลิก Export (⬇️)
3. ได้ภาพ PNG ความละเอียดสูง
4. นำไปใส่ PowerPoint/Word
```

### 3. Monitoring ห้อง NOC
```
1. เปิดบนจอ Monitor
2. Full-Screen
3. ติดตาม Real-time 24/7
```

---

## 📚 เอกสารเพิ่มเติม

| ชื่อไฟล์ | ภาษา | เนื้อหา |
|----------|------|---------|
| `EXECUTIVE_DASHBOARD_GUIDE.md` | 🇹🇭 ไทย | คู่มือผู้ใช้ทั่วไป |
| `EXECUTIVE_DASHBOARD_TECHNICAL.md` | 🇬🇧 English | Technical Documentation |
| `IMPLEMENTATION_SUMMARY.md` | 🇹🇭 ไทย | สรุปการพัฒนา |

**ตำแหน่ง**: `/opt/code/sangfor_scp/document/`

---

## 💡 Tips & Tricks

1. 💾 **ประหยัดเวลา**: กด Ctrl+D เพื่อ Bookmark หน้านี้
2. 🔄 **Refresh เร็ว**: กดปุ่ม F5 แทนปุ่มบนหน้าจอ
3. 📸 **Export สวย**: ใช้ Light Mode ก่อน Export (พื้นหลังขาว)
4. 🖥️ **Full-Screen**: กด F11 (บาง Browser)
5. 📱 **Mobile**: หมุนเป็น Landscape เพื่อดูได้ดีขึ้น

---

## ⚙️ ข้อมูลเทคนิค

- **Framework**: React 18.2+
- **UI**: Material-UI 5.15+
- **Charts**: Recharts 2.10+
- **Export**: html2canvas 1.4+
- **Refresh**: 60 วินาที
- **Resolution**: Scale 3x (Ultra HD)

---

## 📞 ติดต่อ

**พบปัญหา?**
1. ดูเอกสาร: `EXECUTIVE_DASHBOARD_GUIDE.md`
2. ตรวจสอบ Console: F12
3. ดู Logs: `docker-compose logs -f`

---

**Version**: 1.0  
**Updated**: 14 Feb 2026  
**Status**: ✅ Production Ready
