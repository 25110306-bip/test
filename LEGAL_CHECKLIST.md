# Checklist vận hành

Bản này được chỉnh theo yêu cầu MVP: không bắt buộc xác minh SĐT/OTP, chỉ dùng xác minh cơ bản chống bot.

## Chống bot/spam

- Captcha toán server-signed ở đăng ký, đăng nhập và thêm idol bằng AI.
- Honeypot ẩn để bắt bot tự điền form.
- Rate limit toàn API và route auth.
- Fan Wall có lọc từ toxic cơ bản và admin/moderation.
- Idol do AI tạo nên để trạng thái chờ duyệt trước khi công khai.

## Dữ liệu cá nhân

- Chỉ yêu cầu email, mật khẩu, ngày sinh và consent.
- Số điện thoại là tùy chọn, không bắt buộc.
- Không lưu API key ở frontend.
- Không commit `.env` thật lên GitHub.

## Vàng nội bộ

- Vàng chỉ là điểm nội bộ.
- Không rút tiền, không đổi quà/thẻ, không chuyển giữa người dùng.
- Không dùng cơ chế may rủi.

## Khi chạy public lớn

- Nên nhờ tư vấn pháp lý rà lại yêu cầu định danh/xác thực theo loại hình dịch vụ thực tế.
- Nên thêm CAPTCHA mạnh hơn như Cloudflare Turnstile hoặc reCAPTCHA nếu bị spam.
