# Rapid Mail Frontend

Vite + React + TypeScript UI with a Google OAuth login screen.

## Cài đặt

```bash
npm install
```

## Biến môi trường

Copy file `.env.example` rồi điền giá trị thực:

```
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

## Chạy dev

```bash
npm run dev
```

## Luồng đăng nhập Google (Code Flow)

1. Frontend load Google Identity Services script và tạo `CodeClient` bằng `VITE_GOOGLE_CLIENT_ID`.
2. Người dùng bấm “Tiếp tục với Google”, Google popup mở và trả về `code` OAuth.
3. Frontend hiển thị `code`; backend cần nhận mã này để trao đổi access token/ID token một cách an toàn.

> Nhớ cấu hình OAuth consent screen, Authorized JavaScript origins và Redirect URI trong Google Cloud Console cho client ID tương ứng.
