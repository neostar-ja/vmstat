# Keycloak SSO Integration Guide

## ภาพรวม (Overview)
ระบบ VMStat รองรับการเข้าสู่ระบบผ่าน Keycloak SSO (Single Sign-On) ด้วย OAuth 2.0 Authorization Code Flow + PKCE (S256) โดยรองรับทั้งการ login ด้วย username/password ปกติ และผ่าน Keycloak

## สถาปัตยกรรม (Architecture)

```
User → Login Page → [Keycloak SSO Button] → Backend /auth/keycloak/login
                                               ↓
                                          Generate PKCE (code_verifier + code_challenge)
                                          Generate CSRF state
                                               ↓
                                          Return Keycloak Auth URL
                                               ↓
User ← Redirect to Keycloak Login Page ←──────┘
                                               ↓
User logs in at Keycloak → Redirect back to /vmstat/login?code=...&state=...
                                               ↓
Frontend → POST /auth/keycloak/callback {code, state}
                                               ↓
Backend: Exchange code for tokens (PKCE verifier)
         Decode ID token → get user info
         Check allowed_users list
         Create/update local user
         Generate local JWT
                                               ↓
Frontend ← {access_token, user info} ← Backend
         Store in authStore → Navigate to dashboard
```

## ขั้นตอนการตั้งค่า (Configuration)

### 1. เข้าหน้า Admin Settings
- เข้าสู่ระบบด้วย admin account
- ไปที่ **ตั้งค่าระบบ** → เลือกแท็บ **Keycloak SSO**

### 2. กรอกข้อมูลเชื่อมต่อ
| Field | Description | Example |
|-------|-------------|---------|
| Server URL | URL ของ Keycloak server | `https://keycloak.wuh.go.th` |
| Realm | Keycloak Realm | `WUH` |
| Client ID | Client ID ที่ตั้งใน Keycloak | `vmstat` |
| Client Secret | Client Secret | (จาก Keycloak console) |
| Redirect URI | URL callback กลับมาที่ app | `https://10.251.150.222:3345/vmstat/login` |
| Scope | OIDC Scopes | `openid profile email` |

### 3. ตั้งค่าผู้ใช้
- **สร้างผู้ใช้อัตโนมัติ**: สร้าง local user ใน DB เมื่อ SSO login ครั้งแรก
- **ซิงค์ข้อมูลผู้ใช้**: อัพเดท email/ชื่อ จาก Keycloak ทุกครั้งที่ login
- **Default Role**: Role เริ่มต้นสำหรับ SSO user ใหม่

### 4. เพิ่ม Allowed Users
- กด **เพิ่มผู้ใช้** → กรอก Keycloak username → เลือก role (admin/manager/viewer)
- เฉพาะผู้ใช้ในรายการเท่านั้นที่สามารถ login SSO ได้

### 5. เปิดใช้งาน SSO
- เปิด switch **เปิดใช้งาน** ด้านขวาบน
- กด **บันทึกการตั้งค่า**

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/auth/keycloak/public-config` | ❌ | สถานะ SSO สำหรับ login page |
| `GET` | `/auth/keycloak/config` | Admin | ดูการตั้งค่า (ซ่อน secret) |
| `POST` | `/auth/keycloak/config` | Admin | สร้าง/แก้ไขการตั้งค่า |
| `PUT` | `/auth/keycloak/config` | Admin | แก้ไขบางฟิลด์ |
| `DELETE` | `/auth/keycloak/config` | Admin | ลบการตั้งค่า |
| `POST` | `/auth/keycloak/test-connection` | Admin | ทดสอบเชื่อมต่อ Keycloak (รับ config ใน body หรือใช้ที่บันทึกไว้) |
| `GET` | `/auth/keycloak/login` | ❌ | เริ่ม OAuth PKCE flow |
| `POST` | `/auth/keycloak/callback` | ❌ | รับ callback จาก Keycloak |
| `POST` | `/auth/keycloak/test-user-login` | ❌ | ทดสอบ login (Direct Access) |

## ตั้งค่า Keycloak Server

### สร้าง Client ใน Keycloak
1. ไปที่ Keycloak Admin Console → Realm → Clients → Create Client
2. ตั้งค่า:
   - **Client ID**: `vmstat`
   - **Client Protocol**: `openid-connect`
   - **Root URL**: `https://10.251.150.222:3345/vmstat`
   - **Valid Redirect URIs**: `https://10.251.150.222:3345/vmstat/*`
   - **Web Origins**: `https://10.251.150.222:3345`
3. ในแท็บ Settings:
   - **PKCE Code Challenge Method**: `S256`
   - **Standard Flow Enabled**: ✅
   - **Direct Access Grants Enabled**: ✅ (สำหรับทดสอบ)

## Database Tables

### `webapp.keycloak_config`
เก็บการตั้งค่า Keycloak (1 row)

### `webapp.keycloak_user_mapping`
เก็บ mapping ระหว่าง Keycloak user กับ role ในระบบ

## Troubleshooting

| ปัญหา | สาเหตุ | วิธีแก้ |
|--------|--------|---------|
| SSO button ไม่ทำงาน | Config ไม่ได้เปิดใช้งาน | ตั้งค่าและเปิด switch ในหน้า Admin |
| "Invalid state" | state expired (10 นาที) | ลองใหม่ |
| "ไม่ได้รับอนุญาต" | user ไม่อยู่ใน allowed_users | เพิ่ม user ในหน้า Admin |
| Token exchange failed | client_secret ผิด | ตรวจสอบ secret ใน Keycloak console |
| Connection timeout | Keycloak server ไม่พร้อม | ตรวจสอบ server URL และ network |
| 404 on config page | ยังไม่ได้บันทึก config | ระบบจะแสดงฟอร์มว่าง (แก้ไขแล้วใน v1.1) |
