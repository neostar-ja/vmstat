# คู่มือระบบรายงาน (VMStat Reports System Guide)

คู่มือฉบับนี้อธิบายโครงสร้าง การทำงาน และฟังก์ชันทั้งหมดของ **ระบบรายงาน (Reports System)** ในแอปพลิเคชัน VMStat Analytic Dashboard (อ้างอิง URL: `https://10.251.150.222:3345/vmstat/reports`) 

---

## 1. ภาพรวมของระบบ (System Overview)
ระบบ Reports เป็นศูนย์กลางสำหรับการวิเคราะห์ข้อมูลประสิทธิภาพ (Performance), ความจุ (Capacity), ข้อมูลบัญชีทรัพย์สิน (Inventory), และการเฝ้าระวัง (Monitoring) ของโครงสร้างพื้นฐาน Sangfor SCP ระบบถูกออกแบบใหม่ให้มีความสวยงาม ทันสมัย รองรับการแสดงผลบนอุปกรณ์พกพา (Mobile Responsive) และใช้หลักการ **Progressive Disclosure** เพื่อประสบการณ์ใช้งานที่ดีเยี่ยม (UX)

### สถาปัตยกรรม (Architecture)
*   **Frontend:** React 18, Material-UI (MUI) v5, Recharts (สำหรับการวาดกราฟแบบ Interactive)
*   **Backend:** FastAPI (Python), SQLAlchemy, PostgreSQL
*   **Database Schema:** ใช้ข้อมูลจาก schema `sangfor` (สมุดบัญชีหลัก), `metrics` (ข้อมูลแบบ Time-Series), และ `analytics` (Materialized Views ที่สร้างไว้ล่วงหน้าเพื่อความรวดเร็ว)

---

## 2. การออกแบบหน้าจอและประสบการณ์ผู้ใช้ (UI/UX Design)

เพื่อแก้ปัญหาหน้าจอรายงานที่เคยโหลดช้าและใช้งานยากเมื่อมีพารามิเตอร์จำนวนมาก Hệ thống โฉมใหม่จึงถูกพัฒนาด้วยแนวคิด **Progressive Disclosure (การเปิดเผยข้อมูลตามลำดับ)** ดังนี้:

### 2.1 หน้าจอหลัก (Reports Catalog)
*   แสดงรายงานทั้งหมดผ่าน **Card Component** ที่สวยงามและแบ่งตามหมวดหมู่ (Categories) อย่างเป็นระเบียบ
*   หมวดหมู่ประกอบด้วย:
    *   **ทั้งหมด (All):** แสดงรายงานทั้ง 16 รายการ 
    *   **ทรัพยากร (Resource):** รายงานเกี่ยวกับ CPU, RAM, Network, Storage
    *   **โครงสร้าง (Infrastructure):** Datastore, Host, AZ
    *   **การแจ้งเตือน (Alarm):** สถิติและรายละเอียดขัดข้อง
    *   **Protection:** สถานะการปกป้องและสำรองข้อมูล
    *   **ปฏิบัติการ (Operational):** สถิติการ Start/Stop VM หรือการ Sync ข้อมูลระบบ
    *   **ผู้บริหาร (Executive):** ภาพรวมสปริงบอร์ดสำหรับผู้บริหาร

### 2.2 โฟลว์การดึงรายงาน (Progressive Filter Flow)
1.  **เลือกรายงาน (Selection):** ผู้ใช้คลิกที่การ์ดรายงานที่ต้องการ ระบบจะเข้าสู่หน้ารายละเอียดของรายงานนั้น (ยังไม่โหลดข้อมูลจากฐานข้อมูลทันที เพื่อลดภาระโหลด)
2.  **ตั้งค่าพารามิเตอร์ (Configuration - FilterPanel):** หน้าจอจะแสดงเฉพาะฟิลเตอร์ (Filter) ที่ **"จำเป็น"** ต่อรายงานนั้นๆ เช่น
    *   รายงานระดับ VM จะบังคับให้เลือก VM (`vm_uuid`)
    *   รายงานหน้า Top N จะมีให้กรอกเลข `top_n` (สูงสุด 50) และเลือก `metric` (CPU, Memory ฯลฯ)
    *   รายงาน VM Idle มีให้กรอก CPU/RAM threshold
3.  **ประมวลผล (Execution):** ผู้ใช้กดปุ่ม **"ดึงรายงาน (Apply)"** (มีไอคอนโหลดหมุนๆ ป้องกันการกดซ้ำ) จากนั้น Frontend จะส่ง Request ไปยัง FastAPI
4.  **แสดงผล (Rendering):** ผลลัพธ์ถูกนำเสนอผ่าน Box, KpiCard, BarChart/PieChart และ SortableTable แบบมี Animations 
5.  **การส่งออก (Export/Print):** ในหน้ารายงานจะมีปุ่มพิมพ์ (Print) และดาวน์โหลด CSV อยู่ที่มุมขวาบน

---

## 3. รายงานทั้ง 16 รูปแบบ (The 16 Available Reports)

รายการด้านล่างนี้คือรายงานทั้งหมดที่ระบบรองรับ (ผูกกับไฟล์ใน `/backend/app/routers/reports.py` และ `/frontend/src/components/reports/renderers/`)

### หมวดทรัพยากร (Resource)
1. **พฤติกรรมการใช้ทรัพยากร VM (VM Resource Usage) `[vm_resource_usage]`**
   * **Endpoint:** `GET /reports/vm-resource/{vm_uuid}`
   * **ข้อมูลที่ใช้:** กราฟ Time-series ชี้แจงการใช้ CPU, Memory, Disk IOS ทั้ง Max, Avg, P95 ในช่วงเวลาที่เลือก
2. **Top VMs ตามทรัพยากร (Top VMs) `[top_vms]`**
   * **Endpoint:** `GET /reports/top-vms` (limit `top_n=50`)
   * **ข้อมูลที่ใช้:** กราฟ Bar แนวซ้าย-ขวา จัดอันดับ 10-50 ตัวแรกที่กิน CPU, RAM, Network, Disk สูงสุด
3. **VM ที่เป็นไปได้ว่าจะ Oversized (Oversized VMs) `[oversized_vms]`**
   * **Endpoint:** `GET /reports/oversized-vms`
   * **ข้อมูลที่ใช้:** ชี้เป้า VM ที่ขอ CPU/RAM ไว้เยอะแต่ใช้จริงน้อยมาก (Avg < 10-20%)
4. **VM ที่แทบไม่มีการใช้งาน (Idle VMs) `[idle_vms]`**
   * **Endpoint:** `GET /reports/idle-vms`
   * **ข้อมูลที่ใช้:** ค้นหา Zombie VM / Idle VM โดยระบุ Threshold ได้ด้วยตนเอง (ค่าเริ่มต้นคือ CPU<20%, RAM<30%)
5. **Top การใช้แบนด์วิดท์เครือข่าย (Network Top) `[network_top]`**
   * **Endpoint:** `GET /reports/network-top` (limit `top_n=50`)
   * **ข้อมูลที่ใช้:** หายอดรวม Average RX/TX (Mbps) ที่สูงสุดในระบบ

### หมวดโครงสร้างพื้นฐาน (Infrastructure)
6. **สรุประดับ AZ (AZ Summary) `[az_summary]`**
   * **ข้อมูลที่ใช้:** วิเคราะห์ความหนาแน่นและ Overcommit ราย Availability Zone
7. **สรุประดับกลุ่ม (Group Summary) `[group_summary]`**
   * **ข้อมูลที่ใช้:** แจกแจงการใช้ทรัพยากรย่อยตามแต่ละกลุ่มของบริษัทหรือแผนก (Group)
8. **วิเคราะห์โฮสต์เชิงลึก (Host Detail) `[host_detail]`**
   * **ข้อมูลที่ใช้:** เจาะลึก Host Physical โดยเฉพาะเจาะจงดูว่า Host ตัวไหนรับภาระ VM อะไรไว้บ้าง
9. **ความจุพื้นที่เก็บข้อมูล (Datastore Capacity) `[datastore_capacity]`**
   * **Endpoint:** `GET /reports/datastore-capacity`
   * **ข้อมูลที่ใช้:** ตรวจสอบพื้นที่ (GB/TB) ของ Datastore ตัวใดใกล้เต็ม (> 80% / > 90%)
10. **วิเคราะห์ความจุโฮสต์และ Overcommit (Host Capacity) `[host_capacity]`**
    * **Endpoint:** `GET /reports/host-capacity`
    * **ข้อมูลที่ใช้:** คำนวณอัตรา CPU/RAM Overcommit ratio เพื่อป้องกันระบบเกิดขวดคอ (Bottleneck)

### หมวดการดูแลทั่วไป (Executive / Inventory / Alarms)
11. **รายงานผู้บริหาร (Executive Summary) `[executive_summary]`**
    * **ข้อมูลที่ใช้:** สรุปตัวเลขกลมๆ ที่สำคัญ 6 ค่า: VM ทั้งหมด, รันอยู่, จำนวน Host, CPU Avg., RAM Avg., และ Alarms ปัจจุบัน
12. **ข้อมูลสินทรัพย์ระบบ (Inventory) `[inventory]`**
    * **Endpoint:** `GET /reports/inventory`
    * **ข้อมูลที่ใช้:** สรุปจำนวนแจกแจงตาม OS (Pie Chart) และแจกแจงตาม Group (Bar Chart) 
13. **สรุปสถิติ Alarm (Alarm Summary) `[alarm_summary]`**
    * **Endpoint:** `GET /reports/alarm-summary`
    * **ข้อมูลที่ใช้:** สัดส่วนของ Alert รายความรุนแรง (P1, P2, P3) และ VM ที่สะสมจำนวนแจ้งเตือนไว้เยอะที่สุดชี้เป้าปัญหาเรื้อรัง

### หมวด Protection และ Operation
14. **สถานะการปกป้อง(Protection) `[protection_status]`**
    * **Endpoint:** `GET /reports/protection-status`
    * **ข้อมูลที่ใช้:** ติดตามหา VM ใดบ้างที่ "ไม่ได้ตั้งค่า Protection" ไว้ ซึ่งเป็นความเสี่ยงระยะยาว
15. **ประวัติการดำเนินการ (VM Control Actions) `[vm_control_actions]`**
    * **Endpoint:** `GET /reports/vm-control-actions`
    * **ข้อมูลที่ใช้:** Audit log สืบหว่าใครเป็นคนสั่ง Start/Stop/Reboot ในระบบ และผลลัพธ์เป็น Success หรือ Failed
16. **สถานะการ Sync ข้อมูล (Sync Status) `[sync_status]`**
    * **Endpoint:** `GET /reports/sync-status`
    * **ข้อมูลที่ใช้:** ตรวจเช็คเวลาประมวลผล (Duration) ของ Background Job ย้อนหลัง

---

## 4. โครงสร้างซอร์สโค้ด (Source Code Mapping)

หลังจากการทำ Code Refactoring ระบบรายงานมีความเป็นระเบียบสูง (Modular) ดังนี้:

### 4.1 Frontend (`/webapp/frontend/src/`)
*   `pages/ReportsPage.tsx`: **หัวใจหลัก (Orchestrator)** ดูแล Layout Sidebar การจัดการ Category และ Context ของ Filter State
*   `components/reports/FilterPanel.tsx`: เมนูตัวกรอง (Filter logic) ทำหน้าที่ Render Input แบบฉลาดตาม `selectedReport.id`
*   `components/reports/renderers/index.tsx`: **Dispatcher Pattern** ตัวชี้เป้าว่าถ้าเป็นรายงาน A ให้ใช้ Component A ทำการเรนเดอร์เนื้อหาข้อมูล
*   `components/reports/renderers/*.tsx`: โค้ดรายงาน 16 ไฟล์ เช่น `NetworkTop.tsx`, `DatastoreCapacity.tsx` แยกต่างหากไฟล์ใครไฟล์มัน
*   `components/common/`: โค้ดแชร์ (Shared Component) แบบ `SortableTable`, `KpiCard`, `UtilBar`

### 4.2 Backend (`/webapp/backend/app/`)
*   `routers/reports.py`: รวบรวมฟีด API ของ 16 endpoints คอยทำ SQL Aggregation เพื่อป้อน Frontend โหลดค่า 
    * *ข้อควรระวังเรื่องความเร็ว (Performance):* มีการกำหนด Maximum Limit ไว้เสมอ (เช่น `top_n <= 50`) เพื่อป้องกัน Out of Memory Attack

---

## 5. วิธีการแก้ไข หรือปรับปรุงระบบในอนาคต (Extensibility Guide)

หากคุณต้องการเพิ่มรายงานประเภทที่ 17 ในส่วนของคุณ สามารถทำได้ด้วยโมเดล 3 ขั้นตอน (3-Step Model)

1.  **Backend (API):**
    *   สร้าง Endpoint ชื่อ `GET /reports/my-new-report` ลงในไฟล์ `reports.py` โดยคืนค่าตัวแปร Dictionary ให้มี Key ตามที่ตกลงกัน เช่น `items: [...]` 
2.  **Frontend (State & Router):**
    *   เพิ่มออบเจ็กต์ลงไปในตัวแปร List รายงานตรงที่ใดที่หนึ่งที่จะดึงได้จากตัวแอป (ในบางสถาปัตยกรรมจะดึงจาก `GET /reports/types`)
3.  **Frontend (Renderer UI):**
    *   สร้างไฟล์ `/frontend/src/components/reports/renderers/MyNewReport.tsx`
    *   ดึงเอา `<KpiCard>` กับ `<SortableTable />` มาเรียงๆ กันให้สวยงาม และผูก Props `data={data}`
    *   นำไปเสียบเข้า `switch-case` เอาไว้ใน `/renderers/index.tsx` เพื่อให้ระบบรู้จัก

---

*จบเอกสารคู่มือระบบรายงาน*
