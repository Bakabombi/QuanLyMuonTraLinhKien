export const conditionLabels = { GOOD: 'Tốt', DAMAGED: 'Hỏng', LOST: 'Mất' };

export const statusLabels = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Chờ bàn giao',
  CHECKED_OUT: 'Đang mượn',
  OVERDUE: 'Quá hạn',
  RETURNED: 'Đã trả',
  REJECTED: 'Bị từ chối',
  CANCELLED: 'Đã huỷ'
};

export const equipmentStatusLabels = {
  AVAILABLE: 'Sẵn sàng',
  RESERVED: 'Đã giữ chỗ',
  BORROWED: 'Đang cho mượn',
  MAINTENANCE: 'Đang sửa chữa',
  RETIRED: 'Thanh lý',
  LOST: 'Đã mất'
};

export const proposalStatusLabels = {
  OPEN: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  DONE: 'Hoàn tất'
};

export const roleLabels = {
  ADMIN: 'Quản trị viên',
  TECHNICIAN: 'Cán bộ xưởng',
  LECTURER: 'Giảng viên',
  STUDENT: 'Sinh viên'
};

export const userStatusLabels = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngưng hoạt động',
  LOCKED: 'Đã khoá'
};

/** Diễn giải mã hành động trong nhật ký truy vết (AuditLog). */
export const auditActionLabels = {
  SEED_DATA: 'Khởi tạo dữ liệu mẫu',
  CREATE_LOAN: 'Tạo phiếu mượn',
  CANCEL_LOAN: 'Huỷ phiếu mượn',
  DELETE_LOAN: 'Xoá phiếu mượn',
  APPROVE_LOAN: 'Duyệt phiếu mượn',
  REJECT_LOAN: 'Từ chối phiếu mượn',
  CHECKOUT_LOAN: 'Bàn giao thiết bị',
  RETURN_EQUIPMENT: 'Nhận trả thiết bị',
  REMIND_OVERDUE: 'Gửi nhắc nhở quá hạn',
  CREATE_EQUIPMENT: 'Thêm thiết bị',
  UPDATE_EQUIPMENT: 'Cập nhật thiết bị',
  DELETE_EQUIPMENT: 'Xoá thiết bị',
  QR_STOCKTAKE: 'Kiểm kê bằng QR',
  CREATE_RESTOCK_PROPOSAL: 'Tạo đề xuất nhập',
  AUTO_RESTOCK_PROPOSAL: 'Tạo đề xuất nhập tự động',
  REVIEW_RESTOCK_PROPOSAL: 'Xử lý đề xuất nhập',
  DELETE_RESTOCK_PROPOSAL: 'Xoá đề xuất nhập',
  UPDATE_USER: 'Cập nhật người dùng'
};

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

export function formatMoney(value) {
  return `${Number(value ?? 0).toLocaleString('vi-VN')} đ`;
}

/** Số ngày còn lại (âm nghĩa là đã quá hạn). */
export function daysLeft(value) {
  if (!value) return 0;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
}

export function badgeClass(value) {
  return `badge ${value}`;
}
