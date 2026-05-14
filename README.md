# 🚀 VTeen Cosmic Android (Pro Max Ultra 2026)

[![VTeen Fast OTA Update](https://github.com/quyenhan13/apkvteen/actions/workflows/super-ci-cd.yml/badge.svg)](https://github.com/quyenhan13/apkvteen/actions/workflows/super-ci-cd.yml)

Hệ thống giải trí đa phương tiện thế hệ mới dành cho Android, tích hợp công nghệ **Cosmic Storage** và **OTA Lightning Update**.

## 🛠 Tính năng nổi bật
- **Cloud Driver**: Quản lý tệp tin đa nguồn (Google Drive, Web API) với giao diện Glassmorphism cực phẩm.
- **Fast OTA**: Cập nhật tính năng và sửa lỗi tức thì không cần cài lại APK.
- **Role System**: Phân quyền tài khoản **VTEEN** (Người dùng) và **ADMIN** (Quản trị viên).
- **Pro Player**: Trình phát phim ổn định, bypass mọi rào cản CORS và 403.

## 🚀 Quy trình cập nhật (OTA)
Hệ thống sử dụng **GitHub Actions** để tự động hóa việc triển khai:
1. Khi có code mới được `push` lên branch `main`.
2. GitHub Action sẽ tự động build bản `dist` và nén thành `update.zip`.
3. Bản cập nhật được đẩy lên GitHub Release dưới dạng một Tag mới.
4. Ứng dụng VTeen trên điện thoại sẽ nhận diện và tự động cài đặt bản cập nhật này.

## 💻 Hướng dẫn phát triển
```bash
# Cài đặt
npm install

# Chạy môi trường Dev (Browser)
npm run dev

# Build bản cập nhật OTA thủ công
npm run build
# Sau đó nén thư mục dist/ thành update.zip và upload lên Release
```

## 📱 Build APK
```bash
# Đồng bộ code sang Android Project
npx cap sync android

# Mở Android Studio để build
npx cap open android
```

---
*Developed by Chin & AntiGravity AI.*
