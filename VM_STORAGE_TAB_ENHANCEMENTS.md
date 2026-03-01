# การปรับปรุงหน้า VM Detail - แท็บที่เก็บข้อมูล (Storage Tab)

**วันที่:** 9 กุมภาพันธ์ 2026
**เวอร์ชัน:** 3.0
**ไฟล์ที่แก้ไข:** `webapp/frontend/src/pages/VMDetailPage.tsx`

---

## 🎯 วัตถุประสงค์

ปรับปรุงหน้า VM Detail Tab ที่เก็บข้อมูล (Tab 3) โดย:
1. แก้ไขการคำนวณอัตราการเติบโตและ Runway ที่ไม่แสดงผลใน Tab 3
2. เพิ่มตารางแสดงประวัติการใช้งาน Disk 7 วันที่ผ่านมา
3. ออกแบบ UI ให้สวยงาม ทันสมัย มืออาชีพ รองรับทุกอุปกรณ์

---

## 🐛 ปัญหาที่พบและแก้ไข

### 1. **Bug: อัตราการเติบโตและ Runway แสดงค่าผิด**

**ปัญหา:**
```typescript
const storageGrowth = React.useMemo(() => {
    if (activeTab !== 1 || chartData.length < 2) return { rate: 0, trend: 'stable', perDay: 0 };
    // ... คำนวณ
}, [chartData, activeTab]);
```

- `storageGrowth` คำนวณเฉพาะเมื่อ `activeTab === 1` (Tab ประสิทธิภาพ)
- เมื่ออยู่ที่ Tab 3 (ที่เก็บข้อมูล) จะได้ค่าเริ่มต้น: `{ rate: 0, trend: 'stable', perDay: 0 }`
- ส่งผลให้:
  - **อัตราการเติบโต** แสดง `0 GB/วัน` เสมอ
  - **Runway** แสดง `♾️ ไม่จำกัด` เสมอ (เพราะ `perDay === 0`)

**การแก้ไข:**
```typescript
const storageGrowth = React.useMemo(() => {
    // แก้เป็น: คำนวณเมื่ออยู่ Tab 1 หรือ Tab 3
    if ((activeTab !== 1 && activeTab !== 3) || chartData.length < 2) 
        return { rate: 0, trend: 'stable', perDay: 0 };
    // ... คำนวณ
}, [chartData, activeTab]);
```

---

### 2. **Bug: Metrics Data ไม่โหลดใน Tab 3**

**ปัญหา:**
```typescript
const { data: metricsData, isLoading: metricsLoading } = useQuery({
    // ...
    enabled: !!vmUuid && activeTab === 1, // โหลดเฉพาะ Tab 1
});
```

- Metrics history (ข้อมูล storage ย้อนหลัง) โหลดเฉพาะ Tab 1
- Tab 3 ไม่มีข้อมูลเพื่อสร้างตารางแสดงประวัติ 7 วัน

**การแก้ไข:**
```typescript
enabled: !!vmUuid && (activeTab === 1 || activeTab === 3), // โหลดทั้ง Tab 1 และ Tab 3
```

---

### 3. **Bug: Chart Data ไม่คำนวณใน Tab 3**

**ปัญหา:**
```typescript
const chartData = React.useMemo(() => {
    if (activeTab !== 1 || !metricsResponse?.series) return [];
    // ... คำนวณ
}, [metricsResponse, activeTab, vm?.storage_total_mb]);
```

**การแก้ไข:**
```typescript
const chartData = React.useMemo(() => {
    if ((activeTab !== 1 && activeTab !== 3) || !metricsResponse?.series) return [];
    // ... คำนวณ
}, [metricsResponse, activeTab, vm?.storage_total_mb]);
```

---

## ✨ ฟีเจอร์ใหม่: ตารางประวัติการใช้งาน Disk 7 วัน

### โครงสร้างข้อมูล

ตารางแสดงข้อมูล 7 วันล่าสุด โดยมีคอลัมน์:

| คอลัมน์ | รายละเอียด |
|---------|-----------|
| 📅 **วันที่** | วันที่ พร้อมไฮไลต์วันปัจจุบัน |
| 💾 **ใช้งานแล้ว** | พื้นที่ที่ใช้งานแล้ว (MB + GB) |
| 📦 **พื้นที่ว่าง** | พื้นที่ว่าง (MB + GB) |
| 📊 **สัดส่วน** | Progress bar + เปอร์เซ็นต์ |
| 📈 **เปลี่ยนแปลง** | การเพิ่ม/ลดจากวันก่อนหน้า (MB + %) |

### การประมวลผลข้อมูล

```typescript
// 1. จัดกลุ่มข้อมูลตามวันที่
const dateMap = new Map<string, any>();
chartData.forEach((item: any) => {
    const date = new Date(item.timestamp);
    const dateKey = date.toLocaleDateString('th-TH', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    });
    
    // เก็บข้อมูลล่าสุดของแต่ละวัน
    if (!dateMap.has(dateKey) || new Date(item.timestamp) > new Date(dateMap.get(dateKey).timestamp)) {
        dateMap.set(dateKey, item);
    }
});

// 2. เรียงตามวันที่และเอา 7 วันล่าสุด
const sortedDates = Array.from(dateMap.entries())
    .sort((a, b) => new Date(a[1].timestamp).getTime() - new Date(b[1].timestamp).getTime())
    .slice(-7);

// 3. คำนวณการเปลี่ยนแปลงจากวันก่อนหน้า
sortedDates.forEach(([dateKey, item], index) => {
    const storageTotalMB = vm?.storage_total_mb || 0;
    const storageUsedMB = item.storageUsedMB || 0;
    const storageFreeMB = storageTotalMB - storageUsedMB;
    
    let changeFromPrevDay = 0;
    if (index > 0) {
        const prevDayUsed = sortedDates[index - 1][1].storageUsedMB || 0;
        changeFromPrevDay = storageUsedMB - prevDayUsed;
    }
    
    // สร้างข้อมูลสำหรับตาราง
    dailyData.push({
        date: new Date(item.timestamp),
        dateStr: dateKey,
        totalMB: storageTotalMB,
        usedMB: storageUsedMB,
        freeMB: storageFreeMB,
        usedPercent: (storageUsedMB / storageTotalMB) * 100,
        changeMB: changeFromPrevDay,
        changePercent: index > 0 ? (changeFromPrevDay / sortedDates[index - 1][1].storageUsedMB) * 100 : 0
    });
});
```

---

## 🎨 การออกแบบ UI

### 1. **Card Header แบบ Gradient**

```tsx
<Box sx={{ 
    bgcolor: 'primary.main', 
    color: 'primary.contrastText',
    px: 3,
    py: 2,
    display: 'flex',
    alignItems: 'center',
    gap: 1
}}>
    <CalendarIcon />
    <Typography variant="h6" fontWeight={700}>
        ประวัติการใช้งาน Storage (7 วันล่าสุด)
    </Typography>
</Box>
```

### 2. **Progress Bar สีสันสวยงาม**

```tsx
<Box sx={{ 
    width: 60, 
    height: 6, 
    bgcolor: 'action.hover',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative'
}}>
    <Box sx={{ 
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: `${day.usedPercent}%`,
        bgcolor: day.usedPercent > 90 ? 'error.main' : 
                day.usedPercent > 80 ? 'warning.main' : 
                'success.main',
        borderRadius: 3
    }} />
</Box>
```

### 3. **Status Chips พร้อม Icons**

**วันปัจจุบัน:**
```tsx
<Chip 
    label="วันนี้" 
    size="small" 
    color="primary"
    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
/>
```

**การเปลี่ยนแปลง:**
```tsx
<Chip
    label={`${isIncreasing ? '+' : ''}${formatBytes(Math.abs(day.changeMB))}`}
    size="small"
    color={isIncreasing ? 'error' : isDecreasing ? 'success' : 'default'}
    icon={isIncreasing ? <TrendingUpIcon /> : 
          isDecreasing ? <TrendingUpIcon sx={{ transform: 'rotate(180deg)' }} /> : 
          undefined}
/>
```

### 4. **Row Highlight & Hover Effects**

```tsx
<TableRow 
    hover
    sx={{
        bgcolor: isToday ? 'rgba(14, 165, 233, 0.05)' : 'inherit',
        '&:hover': {
            bgcolor: 'action.hover',
            transform: 'scale(1.001)',
            transition: 'all 0.2s ease'
        }
    }}
>
```

### 5. **Summary Footer**

แสดงสรุปข้อมูลสำคัญ:
- อัตราการเติบโตเฉลี่ย
- การเปลี่ยนแปลงรวม 7 วัน
- ข้อมูลล่าสุด

```tsx
<Box sx={{ 
    bgcolor: 'action.hover', 
    px: 3, 
    py: 2,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2
}}>
    <Box>
        <Typography variant="caption" color="text.secondary">
            อัตราการเติบโตเฉลี่ย
        </Typography>
        <Typography variant="body2" fontWeight={700} color="warning.main">
            {storageGrowth.perDay > 0 ? '+' : ''}{(storageGrowth.perDay / 1024).toFixed(2)} GB/วัน
        </Typography>
    </Box>
    {/* ... อื่นๆ */}
</Box>
```

---

## 📊 ภาพรวมการแสดงผล

### Before (ก่อนแก้ไข):
```
✅ พื้นที่ว่าง: 500 GB
❌ อัตราการเติบโต: 0 GB/วัน (ผิด!)
❌ Runway: ♾️ ไม่จำกัด (ผิด!)
❌ ไม่มีตารางประวัติ
```

### After (หลังแก้ไข):
```
✅ พื้นที่ว่าง: 500 GB
✅ อัตราการเติบโต: +2.5 GB/วัน (ถูกต้อง!)
✅ Runway: ~200 วัน (ถูกต้อง!)
✅ ตารางประวัติ 7 วัน พร้อมกราฟและการวิเคราะห์
```

---

## 🧪 การทดสอบ

### 1. เปิดหน้า VM Detail
```
https://10.251.150.222:3345/vmstat/vms/{vm_uuid}
```

### 2. ไปที่ Tab "ที่เก็บข้อมูล" (Tab 3)

**สังเกต:**
- ✅ **Storage Usage Card** แสดงเปอร์เซ็นต์การใช้งานถูกต้อง
- ✅ **Growth Rate Card** แสดงอัตราการเติบโต GB/วัน (ไม่ใช่ 0)
- ✅ **Runway Card** แสดงจำนวนวันคงเหลือ (ถ้ามีการเติบโต)

### 3. เลื่อนลงดูตาราง "ประวัติการใช้งาน Storage"

**ตรวจสอบ:**
- ✅ แสดงข้อมูล 7 วันล่าสุด
- ✅ วันปัจจุบันมี Badge "วันนี้"
- ✅ คอลัมน์ "ใช้งานแล้ว" แสดงทั้ง MB และ GB
- ✅ คอลัมน์ "พื้นที่ว่าง" แสดงทั้ง MB และ GB
- ✅ Progress Bar มีสีตามเปอร์เซ็นต์:
  - สีเขียว: < 80%
  - สีส้ม: 80-90%
  - สีแดง: > 90%
- ✅ คอลัมน์ "เปลี่ยนแปลง" แสดง:
  - Chip สีแดง + ลูกศรขึ้น: เพิ่มขึ้น
  - Chip สีเขียว + ลูกศรลง: ลดลง
  - แสดงทั้ง MB และ %

### 4. ตรวจสอบ Summary Footer

**ตรวจสอบ:**
- ✅ อัตราการเติบโตเฉลี่ย (GB/วัน)
- ✅ การเปลี่ยนแปลงรวม 7 วัน (GB)
- ✅ ข้อมูลล่าสุด (วันที่ + เวลา)

### 5. ทดสอบ Responsive Design

- ✅ Desktop: ตารางแสดงผลเต็มความกว้าง
- ✅ Tablet: Scroll แนวนอนถ้าจำเป็น
- ✅ Mobile: Scroll แนวนอน + ฟอนต์ปรับขนาด

---

## 📈 ผลลัพธ์

### Performance:
- ⚡ Query metrics เฉพาะเมื่อใช้งาน Tab 1 หรือ Tab 3
- 💪 คำนวณ chartData และ storageGrowth ตรงตาม Tab ที่ใช้งาน
- 🎯 ไม่มี unnecessary calculations

### User Experience:
- 🎨 UI สวยงาม ทันสมัย มืออาชีพ
- 📊 ข้อมูลชัดเจน เข้าใจง่าย
- 🔍 วิเคราะห์ได้ง่าย เห็นแนวโน้ม
- 📱 รองรับทุกอุปกรณ์

### Accuracy:
- ✅ อัตราการเติบโตคำนวณถูกต้อง
- ✅ Runway ประเมินได้แม่นยำ
- ✅ ข้อมูลประวัติแสดงตรงตามความเป็นจริง

---

## 🔧 Technical Details

### Data Flow:
```
1. User เปิด Tab 3
   ↓
2. Query metricsData (enabled: activeTab === 3)
   ↓
3. คำนวณ chartData (useMemo เมื่อ activeTab === 3)
   ↓
4. คำนวณ storageGrowth (useMemo เมื่อ activeTab === 3)
   ↓
5. จัดกลุ่มข้อมูลตามวันที่
   ↓
6. คำนวณการเปลี่ยนแปลงแต่ละวัน
   ↓
7. Render ตาราง + Summary
```

### Memory Optimization:
- ใช้ `Map` สำหรับจัดกลุ่มข้อมูล (O(1) lookup)
- เก็บเฉพาะข้อมูลล่าสุดของแต่ละวัน
- จำกัด 7 วันล่าสุดเท่านั้น

---

## 🚀 Deployment

**Status:** ✅ Deployed สำเร็จเมื่อ 9 กุมภาพันธ์ 2026

**Build Time:**
- Backend: 55.9s
- Frontend: 69.3s

**Containers:**
- ✅ vmstat-backend: Up (healthy)
- ✅ vmstat-frontend: Up (healthy)

**Access:**
- Frontend: https://10.251.150.222:3345/vmstat/
- API Docs: https://10.251.150.222:3345/vmstat/api/docs

---

## 📝 Notes

1. **ข้อมูลแสดง 7 วันล่าสุด** - ถ้ามีข้อมูลน้อยกว่า 7 วัน จะแสดงเท่าที่มี
2. **การเปลี่ยนแปลง** - วันแรกไม่มีข้อมูลเปลี่ยนแปลง (แสดง "-")
3. **สี Progress Bar:**
   - เขียว: ปลอดภัย (< 80%)
   - ส้ม: เตือน (80-90%)
   - แดง: อันตราย (> 90%)
4. **Runway Calculation:**
   - ถ้า perDay > 0: คำนวณจากพื้นที่ว่าง / อัตราการเติบโต
   - ถ้า perDay <= 0: แสดง "ไม่จำกัด"

---

## 🔗 Related Documents

- [PERFORMANCE_OPTIMIZATION_V2.md](./PERFORMANCE_OPTIMIZATION_V2.md) - การปรับปรุงประสิทธิภาพรอบที่ 2
- [PERFORMANCE_IMPROVEMENTS.md](./PERFORMANCE_IMPROVEMENTS.md) - การปรับปรุงรอบที่ 1
- [COMPREHENSIVE_MANUAL.md](./document/COMPREHENSIVE_MANUAL.md) - คู่มือการใช้งานโปรเจค

---

**จัดทำโดย:** GitHub Copilot (Claude Sonnet 4.5)  
**Last Updated:** 9 กุมภาพันธ์ 2026
