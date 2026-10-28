# Hệ thống quản lý mượn/trả linh kiện và thiết bị thực hành — Khoa CNTT (ĐT 03)

Giải quyết tình trạng linh kiện, cáp kết nối và board mạch tại xưởng bị thất lạc do không có hệ thống theo dõi.

**Công nghệ:** Next.js 16 (App Router) · Prisma 6 · PostgreSQL · QR Code · Chart.js · JWT (jose) · bcryptjs

## Sản phẩm bàn giao

| Thành phần | Đường dẫn | Mô tả |
| --- | --- | --- |
| Web quản lý kho | `/staff/inventory` | Thêm thiết bị, in nhãn QR, cập nhật tình trạng (tốt/hỏng/mất), lọc và tìm kiếm |
| Quét QR & in nhãn | `/staff/qr` | Kiểm kê bằng đầu đọc mã QR, in nhãn hàng loạt để dán lên thiết bị |
| Phiếu mượn (cán bộ) | `/staff/loans` | Duyệt / từ chối, bàn giao, nhận trả và đánh giá tình trạng từng thiết bị, gửi nhắc nhở quá hạn |
| Đề xuất nhập bổ sung | `/staff/proposals` | Tổng hợp thiết bị hỏng/mất và nhóm hàng sắp hết để đề xuất nhập bù |
| Ứng dụng sinh viên | `/student` | Chọn thiết bị sẵn sàng, gửi yêu cầu mượn |
| Phiếu của tôi | `/student/loans` | Theo dõi trạng thái, hạn trả và thông báo |
| Dashboard thống kê | `/dashboard` | Tỷ lệ hư hao, xu hướng theo thời gian, cảnh báo quá hạn, đề xuất nhập |
| Quản lý người dùng | `/admin/users` | Đổi vai trò, khoá/mở tài khoản, đặt lại mật khẩu (**chỉ Admin**) |
| Nhật ký truy vết | `/admin/audit` | Xem toàn bộ thao tác quan trọng trên thiết bị và phiếu mượn (**chỉ Admin**) |

## Chức năng theo yêu cầu đề tài

- **Sinh viên đăng ký mượn qua web**: chọn nhiều thiết bị sẵn sàng, nhập mục đích và hạn trả (tối đa 30 ngày), sinh mã phiếu dạng `PM-<năm>-<số>`.
- **Cán bộ xưởng xác nhận**: duyệt/từ chối phiếu, bàn giao thiết bị (kiểm tra trạng thái giữ chỗ, hỗ trợ đối chiếu mã QR khi bàn giao).
- **Dán nhãn QR vào từng thiết bị**: mỗi thiết bị có `qrPayload` dạng `CNTT-EQ:<mã thiết bị>`; in nhãn hàng loạt và tra cứu/kiểm kê bằng cách quét mã.
- **Theo dõi tình trạng (tốt / hỏng / mất)**: lưu tình trạng lúc giao (`conditionOut`) và lúc nhận trả (`conditionIn`); thiết bị hỏng chuyển `MAINTENANCE`, mất chuyển `LOST`.
- **Cảnh báo quá hạn trả**: phiếu đã bàn giao quá hạn tự chuyển sang `OVERDUE`, hiển thị cảnh báo trên dashboard và trang phiếu mượn; cán bộ gửi nhắc nhở (ghi nhận số lần nhắc); dashboard có mục "Sắp tới hạn (24 giờ)". Sinh viên nhận thông báo trong ứng dụng.
- **Thống kê tỉ lệ hư hao**: tỷ lệ hư hao tổng và theo tháng (biểu đồ đường + cột), cơ cấu tốt/hỏng/mất, top thiết bị hư hao nhiều nhất, tổng phí đền bù.
- **Đề xuất nhập bổ sung**: tự động sinh đề xuất khi thiết bị hỏng/mất hoặc khi số thiết bị sẵn sàng của một danh mục xuống dưới ngưỡng; cán bộ duyệt/từ chối/đánh dấu đã nhập kho.

## Phân quyền

Hệ thống có 4 vai trò. Cán bộ xưởng (`TECHNICIAN`) và quản trị viên (`ADMIN`) cùng làm nghiệp vụ kho hằng ngày, nhưng chỉ `ADMIN` có các đặc quyền quản trị (quản lý người dùng, duyệt cấp cao nhất, xoá dữ liệu, xem nhật ký truy vết).

| Vai trò | Quyền |
| --- | --- |
| `STUDENT`, `LECTURER` | Xem thiết bị sẵn sàng, tạo phiếu mượn, huỷ phiếu đang chờ duyệt, xem phiếu và thông báo của mình |
| `TECHNICIAN` | Nghiệp vụ kho: thiết bị, QR, duyệt/bàn giao/nhận trả, cảnh báo quá hạn, tạo và từ chối đề xuất nhập, dashboard |
| `ADMIN` | Toàn bộ quyền của `TECHNICIAN`, cộng thêm: **quản lý người dùng** (đổi vai trò, khoá/mở, đặt lại mật khẩu), **duyệt đề xuất nhập** và xác nhận đã nhập kho, **xoá dữ liệu** (thiết bị, đề xuất, phiếu), **xem nhật ký truy vết** |

Bảng đối chiếu nhanh các đặc quyền chỉ Admin có:

| Đặc quyền | Route | Ghi chú |
| --- | --- | --- |
| Xem & sửa người dùng | `GET /api/users`, `PATCH /api/users/:id` | Đổi vai trò, khoá/mở (`ACTIVE`/`LOCKED`/`INACTIVE`), đặt lại mật khẩu |
| Duyệt / xác nhận nhập kho đề xuất | `PATCH /api/proposals/:id` với `APPROVED` hoặc `DONE` | Cán bộ xưởng vẫn tạo đề xuất và từ chối được (`REJECTED`) |
| Xoá dữ liệu | `DELETE /api/equipment/:id`, `DELETE /api/proposals/:id`, `DELETE /api/loans/:id` | Có ràng buộc an toàn (xem ghi chú nghiệp vụ) |
| Xem nhật ký truy vết | `GET /api/audit` | Đọc bảng `AuditLog` |

Mọi route đặc quyền đều kiểm tra qua `requireUser(adminRoles)` trong `src/lib/auth.js`, trả về `403` nếu không phải Admin.

## Khởi chạy

```bash
# 1. Yêu cầu: Node.js >= 20 và PostgreSQL đang chạy; tạo database equipment_loan
# 2. Cấu hình biến môi trường
cp .env.example .env      # rồi điền DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

# 3. Cài đặt và khởi tạo cơ sở dữ liệu
npm install
npm run db:migrate        # hoặc: npm run db:deploy
npm run db:seed           # tạo tài khoản mẫu + dữ liệu demo

# 4. Chạy
npm run dev               # http://localhost:3000
```

Kiểm tra kết nối cơ sở dữ liệu: `npm run db:check`. Xem dữ liệu trực quan: `npm run db:studio`.

## Tài khoản dữ liệu mẫu

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Admin | `admin@cntt.edu.vn` | theo `ADMIN_PASSWORD` trong `.env` |
| Cán bộ xưởng | `canbo.xuong@cntt.edu.vn` | `CanBo@123456` |
| Sinh viên | `sv.an@student.cntt.edu.vn` | `SinhVien@123` |
| Sinh viên | `sv.binh@student.cntt.edu.vn` | `SinhVien@123` |
| Giảng viên | `gv.cuong@cntt.edu.vn` | `CanBo@123456` |

Dữ liệu mẫu gồm 20 thiết bị thuộc 5 danh mục, 5 phiếu mượn ở đủ các trạng thái (chờ duyệt, chờ bàn giao, đang mượn, quá hạn, đã trả có hỏng/mất) và 2 đề xuất nhập bổ sung.

## Cấu trúc chính

```text
prisma/
  schema.prisma          # User, Category, Location, Equipment, Loan, LoanItem, RestockProposal, Notification, AuditLog
  seed.js                # dữ liệu mẫu
src/
  app/api/               # route handlers: auth, users, audit, equipment (+ /scan), loans (+ approve/checkout/return/cancel/alerts), dashboard, proposals, notifications, catalog
  app/staff/             # web quản lý kho: inventory, qr, loans, proposals
  app/admin/             # trang quản trị (chỉ Admin): users, audit
  app/student/           # ứng dụng sinh viên: đăng ký mượn, phiếu của tôi
  app/dashboard/         # dashboard Chart.js
  components/AppNav.js   # điều hướng theo vai trò
  lib/                   # auth, prisma, loans (quá hạn/hư hao), equipment (QR/audit), labels, api-response
```

## Ghi chú nghiệp vụ

- Tình trạng thiết bị: `GOOD` (tốt) → `DAMAGED` (hỏng, vào `MAINTENANCE`) → `LOST` (mất). Phí đền bù lấy từ trường `replacementFee` của thiết bị.
- Vòng đời phiếu: `PENDING` → `APPROVED` → `CHECKED_OUT` → `RETURNED`, nhánh `REJECTED` / `CANCELLED`, và `OVERDUE` khi quá hạn.
- Khi sinh viên tạo phiếu, thiết bị chuyển `RESERVED`; bị từ chối/huỷ thì trả về `AVAILABLE`.
- Mọi thao tác quan trọng đều ghi vào `AuditLog` để truy vết thiết bị thất lạc; quản trị viên xem được tại `/admin/audit`.
- Xoá dữ liệu (chỉ Admin) có ràng buộc an toàn nhằm giữ lịch sử truy vết:
  - Thiết bị: chỉ xoá khi không ở trạng thái `RESERVED`/`BORROWED` và chưa từng gắn với phiếu mượn nào; nếu đã có lịch sử thì chuyển sang `RETIRED` (thanh lý) thay vì xoá.
  - Phiếu mượn: chỉ xoá phiếu đã kết thúc ở nhánh huỷ/từ chối (`CANCELLED`/`REJECTED`).
  - Đề xuất nhập: xoá tự do (không ảnh hưởng tồn kho).
- Quản trị viên không thể tự hạ quyền hoặc tự khoá tài khoản của chính mình, tránh tự khoá mất quyền truy cập hệ thống.
