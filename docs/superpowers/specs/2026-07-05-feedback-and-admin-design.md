# Feedback & Admin Page — Design Spec

**Date:** 2026-07-05
**Status:** Approved

## Overview

Thêm chức năng feedback cho user (trên trang About) và một trang admin để quản lý user + feedback. User đã đăng nhập có thể gửi feedback theo 3 loại: Bug Report, Feature Request, General Feedback. Admin (role mới trên User) có thể xem/quản lý danh sách user (đổi role, khóa/mở khóa, xóa) và danh sách feedback (lọc, đổi trạng thái, xóa).

## Data Model

### User (thay đổi — `models/user.model.ts`, `schema/user.schema.ts`)

Thêm 2 field:

```ts
role: 'user' | 'admin';      // default 'user'
isActive: boolean;           // default true
```

Không có tài khoản admin mặc định — cấp quyền admin đầu tiên bằng cách sửa thủ công trong DB.

### Feedback (mới — `models/feedback.model.ts`, `schema/feedback.schema.ts`)

```ts
{
  user_id: ObjectId,                              // ref User
  type: 'bug' | 'feature' | 'general',
  title: string,                                  // max 100 chars
  message: string,                                // max 2000 chars
  status: 'pending' | 'in_progress' | 'resolved',  // default 'pending'
  createdAt: Date,
  updatedAt: Date,
}
```

## Components mới

### Backend

| File | Mục đích |
|------|----------|
| `models/feedback.model.ts` | Mongoose model cho Feedback |
| `schema/feedback.schema.ts` | Zod schema: tạo feedback (type/title/message), update status |
| `schema/admin.schema.ts` | Zod schema cho các request admin (đổi role, đổi isActive, filter feedback) |
| `repositories/feedback.repository.ts` | CRUD Feedback |
| `controllers/feedback.controller.ts` | `createFeedback`, `getMyFeedback` |
| `controllers/admin.controller.ts` | `listUsers`, `updateUserRole`, `updateUserActive`, `deleteUser`, `listFeedback`, `updateFeedbackStatus`, `deleteFeedback` |
| `routers/feedback.route.ts` | Route `/v1/feedback` (auth) |
| `routers/admin.route.ts` | Route `/v1/admin/*` (auth + requireAdmin) |
| `middleware/require-admin.ts` | Middleware mới: load user theo `req.user.sub`, kiểm tra `role === 'admin'`, ngược lại throw `FORBIDDEN_ERROR` |
| `scripts/seed.ts` | Script tạo admin account đầu tiên, có prompt nhập email/password (chạy: `npm run seed`) |

`middleware/verify-token.ts` (cập nhật): sau khi verify JWT, load user từ DB, nếu `isActive === false` → throw `FORBIDDEN_ERROR`. Áp dụng cho mọi request đã qua `verifyToken`, nên user bị khóa bị chặn ngay từ lượt gọi API kế tiếp (không cần hạ tầng real-time).

### Frontend

| File | Mục đích |
|------|----------|
| `features/feedback/feedbackApi.tsx` | Thunk `createFeedback` (theo pattern `campaignApi.tsx`) |
| `features/admin/adminApi.tsx` | Thunk cho các API admin ở trên |
| `schema/feedback.ts` | Yup schema validate form feedback (type/title/message) |
| `pages/about/About.tsx` (cập nhật) | Thêm section form feedback: chọn loại (Bug/Feature/General) + tiêu đề + nội dung |
| `pages/admin/AdminPage.tsx` | Trang admin, 2 tab: "Users" và "Feedback" (tái dùng pattern tab của `SettingsModal`) |
| `pages/admin/UsersTab.tsx` | Bảng user: tên, email, role, trạng thái active, ô tìm kiếm, action đổi role/khóa/xóa (có confirm modal cho xóa) |
| `pages/admin/FeedbackTab.tsx` | Bảng feedback: loại, tiêu đề, người gửi, trạng thái, thời gian; filter theo type/status; action đổi trạng thái/xóa |
| `App.tsx` (cập nhật) | Thêm route `/admin`, bọc `ProtectedRoute` + kiểm tra `user.role === 'admin'` (redirect `/campaigns` nếu không phải admin) |
| `components/layout/Header.tsx` (cập nhật) | Chỉ hiện link "Admin" khi `user.role === 'admin'` |

## API Endpoints

```
POST   /v1/feedback                    # tạo feedback (user đã đăng nhập)
GET    /v1/feedback/mine               # feedback của chính user

GET    /v1/admin/users                 # danh sách + tìm kiếm, query ?search=
PATCH  /v1/admin/users/:id/role        # đổi role, body { role }
PATCH  /v1/admin/users/:id/active      # khóa/mở khóa, body { isActive }
DELETE /v1/admin/users/:id             # xóa user

GET    /v1/admin/feedback              # danh sách + lọc, query ?type=&status=
PATCH  /v1/admin/feedback/:id/status   # đổi trạng thái, body { status }
DELETE /v1/admin/feedback/:id          # xóa feedback
```

Tất cả route `/v1/admin/*` yêu cầu `verifyToken` + `requireAdmin`.

## Authorization Flow

```
Request → verifyToken (JWT hợp lệ? user.isActive?) → requireAdmin (user.role === 'admin'?) → controller
```

- User bị khóa (`isActive: false`): mọi request tiếp theo nhận `403 FORBIDDEN`, frontend interceptor điều hướng về `/login`.
- User không phải admin gọi `/v1/admin/*`: nhận `403 FORBIDDEN`.
- Frontend ẩn UI (link Header, route `/admin`) dựa theo `role`, nhưng backend là lớp chặn thật sự.

## Seed Database

Script `scripts/seed.ts`:
- Kiểm tra DB, nếu chưa có admin → prompt user nhập email/password
- Hash password, tạo user với `role: 'admin'`, `isActive: true`
- Chạy: `npm run seed` (hoặc tự động chạy lần đầu deploy)
- Output: in ra email/password đã tạo hoặc "Admin already exists"

## Error Handling

- Xóa/khóa chính tài khoản admin đang đăng nhập: chặn ở controller, throw `BAD_REQUEST_ERROR` ("Không thể tự khóa/xóa tài khoản của chính mình").
- Tạo feedback: validate `type` thuộc enum, `title` (1-100 chars), `message` (1-2000 chars) không rỗng (Zod `.strict()`).
- Xóa feedback: hard delete (xóa luôn khỏi DB).
- **Xóa user**: không cascade xóa feedback — feedback của user đó vẫn tồn tại (với `user_id` trỏ đến user không còn). Giữ lịch sử feedback để có thể audit/report sau này.

## Out of Scope

- Rating/sao cho feedback.
- Feedback ẩn danh (chưa đăng nhập).
- Thông báo real-time khi tài khoản bị khóa (chỉ chặn ở lượt gọi API kế tiếp).
- Phân quyền nhiều cấp (chỉ có `user`/`admin`, không có cấp trung gian).
- Audit log cho hành động admin.
