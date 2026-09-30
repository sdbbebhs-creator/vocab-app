# FSRS Ôn Tập Thông Minh

Ứng dụng học từ vựng & ngữ pháp tiếng Anh với thuật toán lặp lại ngắt quãng FSRS v4.

## Kiến trúc

- **Frontend**: React 19 + Vite, TypeScript.
- **Xác thực**: Supabase Auth (Email/Password).
- **Lưu trữ dữ liệu**: Netlify DB (Postgres qua Drizzle ORM) — mỗi từ vựng/ngữ pháp được lưu theo tài khoản người dùng, đồng bộ trên mọi thiết bị. Bản sao cục bộ (IndexedDB/localStorage) vẫn được giữ để dùng ngay cả khi mất mạng.
- **AI hỗ trợ**: Netlify Functions gọi Gemini API để tra cứu từ vựng/ngữ pháp và tối ưu tham số FSRS, có chế độ dự phòng offline khi không có API key.

## Luyện Output 5 ngữ cảnh (Gemini)

Khi mở cửa sổ luyện output của một từ vựng hoặc cấu trúc ngữ pháp:

1. Gemini gợi ý 5 ngữ cảnh thực tế phù hợp nhất với từ/cấu trúc đó và hiển thị thành 5 tab (có skeleton khi đang tải). Nếu AI lỗi hoặc bị giới hạn lượt gọi (429), app tự dùng 5 tab mặc định: Đời sống, Công sở, Trường học, Mạng xã hội, Tự do.
2. Mỗi tab tự sinh một câu mẫu kèm bản dịch; nút "Đổi câu mẫu" sinh câu khác. Các nút bị khóa tạm thời trong lúc gọi API để tránh spam.
3. Bấm "Xác nhận" để Gemini chấm điểm /100, sửa ngữ pháp, nhận xét bằng tiếng Việt và gợi ý cách nói tự nhiên hơn. Nếu AI không phản hồi, app chấm nhanh offline.

Tất cả lượt gọi đi qua Netlify Function `/api/ai/context-practice`, nên API key không bao giờ lộ ra trình duyệt.

## Chạy ở local

**Yêu cầu:** Node.js

1. Cài dependencies:
   ```
   npm install
   ```
2. Sao chép `.env.example` thành `.env.local` và điền `GEMINI_API_KEY` nếu muốn dùng tính năng AI (không bắt buộc, có fallback offline).
3. Chạy app:
   ```
   npm run dev
   ```

## Deploy

Dự án được cấu hình sẵn cho Netlify (`netlify.toml`):

- `npm run build` build ra `dist/`.
- `netlify/functions/*.mts` là các Netlify Functions xử lý AI lookup, tối ưu FSRS, và đồng bộ dữ liệu (`/api/sync`).
- Schema Postgres nằm ở `db/schema.ts`, migration nằm ở `netlify/database/migrations/` (sinh bằng `npx drizzle-kit generate`, Netlify tự áp dụng khi deploy).

## Xác thực & Đồng bộ

Người dùng đăng nhập bằng Email/Mật khẩu qua Supabase. Sau khi đăng nhập, dữ liệu từ vựng/ngữ pháp được đồng bộ hai chiều với Netlify DB thông qua `/api/sync`, nên dữ liệu không bị mất khi đổi thiết bị hoặc xóa cache trình duyệt.
