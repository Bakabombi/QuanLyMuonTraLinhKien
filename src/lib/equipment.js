import { prisma } from '@/lib/prisma';

export const QR_PREFIX = 'CNTT-EQ:';

/** Mã QR dán lên thiết bị. Nội dung quét được: CNTT-EQ:<mã thiết bị>. */
export function qrPayloadFor(code) {
  return `${QR_PREFIX}${code}`;
}

/** Đọc mã thiết bị từ nội dung QR đã quét (chấp nhận cả khi quét bằng đầu đọc mã vạch). */
export function parseQrPayload(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  return value.startsWith(QR_PREFIX) ? value.slice(QR_PREFIX.length) : value;
}

/** Tìm thiết bị theo nội dung QR hoặc mã thiết bị nhập tay. */
export async function findEquipmentByQr(raw) {
  const code = parseQrPayload(raw);
  if (!code) return null;
  const equipment = await prisma.equipment.findFirst({
    where: { OR: [{ qrPayload: String(raw).trim() }, { code }, { serialNumber: code }] },
    include: { category: true, location: true }
  });
  return equipment;
}

/** Tạo mã phiếu mượn dạng PM-<năm>-<số thứ tự>. */
export async function nextLoanCode() {
  const year = new Date().getFullYear();
  const prefix = `PM-${year}-`;
  const last = await prisma.loan.findFirst({ where: { code: { startsWith: prefix } }, orderBy: { code: 'desc' }, select: { code: true } });
  const lastNumber = last ? Number.parseInt(last.code.slice(prefix.length), 10) : 0;
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

export async function writeAudit(action, { userId = null, equipmentId = null, detail = null } = {}) {
  return prisma.auditLog.create({ data: { action, userId, equipmentId, detail: detail ?? undefined } });
}

export function notify(userId, type, title, message, loanId = null) {
  return { userId, type, title, message, loanId };
}
