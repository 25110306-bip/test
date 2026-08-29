const express = require('express');
const router = express.Router();

router.get('/terms', (req, res) => {
  res.json({
    title: 'Điều khoản sử dụng',
    version: '2026-07-09',
    content: [
      'Người dùng cần cung cấp thông tin đăng ký chính xác và chịu trách nhiệm với hoạt động tài khoản.',
      'Tài khoản cần xác thực số điện thoại trước khi bình chọn, hoàn thành nhiệm vụ hoặc gửi nội dung tương tác.',
      'Vàng là đơn vị điểm nội bộ, chỉ dùng để bình chọn trên website, không quy đổi thành tiền, thẻ, quà thật và không chuyển giữa người dùng.',
      'Không được dùng bot, tài khoản ảo, gian lận nhiệm vụ, spam bình chọn hoặc đăng nội dung vi phạm pháp luật.',
      'Ban quản trị có thể khóa tài khoản, hủy vote hoặc xóa dữ liệu vi phạm theo quy trình kiểm duyệt.'
    ]
  });
});

router.get('/privacy', (req, res) => {
  res.json({
    title: 'Chính sách riêng tư',
    version: '2026-07-09',
    content: [
      'Dữ liệu được thu thập gồm họ tên, email, số điện thoại, ngày sinh, thông tin người giám hộ nếu người dùng dưới 16 tuổi, nhật ký đăng nhập, nhiệm vụ, vàng và bình chọn.',
      'Mục đích xử lý: tạo tài khoản, xác thực người dùng, chống gian lận, vận hành bình chọn/xếp hạng, hỗ trợ người dùng và đáp ứng yêu cầu pháp luật khi có căn cứ.',
      'Người dùng có quyền yêu cầu xem, chỉnh sửa, rút lại đồng ý trong phạm vi pháp luật cho phép, hạn chế/xóa dữ liệu và khiếu nại về xử lý dữ liệu cá nhân.',
      'Mật khẩu được băm, OTP có hạn dùng, secret không lưu trong mã nguồn. Khi triển khai thật cần cấu hình HTTPS, SMS OTP thật, sao lưu và phân quyền quản trị.'
    ]
  });
});

module.exports = router;
