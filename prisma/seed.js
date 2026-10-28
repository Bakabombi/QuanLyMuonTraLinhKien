import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@cntt.edu.vn';
const adminPassword = process.env.ADMIN_PASSWORD ?? 'Administrator@123';
const staffPassword = 'CanBo@123456';
const studentPassword = 'SinhVien@123';

const day = 24 * 60 * 60 * 1000;
const now = Date.now();

async function upsertUser({ email, fullName, role, studentCode, password }) {
  return prisma.user.upsert({
    where: { email },
    update: { fullName, role, passwordHash: await bcrypt.hash(password, 12) },
    create: { fullName, email, role, studentCode: studentCode ?? null, passwordHash: await bcrypt.hash(password, 12) }
  });
}

const categories = [
  { name: 'Vi điều khiển', description: 'Arduino, ESP32, STM32 và board phát triển' },
  { name: 'Cảm biến', description: 'Cảm biến nhiệt độ, khoảng cách, ánh sáng, chuyển động' },
  { name: 'Module & mạch mở rộng', description: 'Relay, driver, ADC/DAC, mạch nguồn' },
  { name: 'Cáp & đầu nối', description: 'Cáp USB, jumper, cáp tín hiệu, đầu nối' },
  { name: 'Dụng cụ đo', description: 'Đồng hồ vạn năng, máy hiện sóng, nguồn DC' }
];

const locations = [
  { code: 'K-A1', name: 'Tủ A1 - Xưởng CNTT' },
  { code: 'K-A2', name: 'Tủ A2 - Xưởng CNTT' },
  { code: 'K-B1', name: 'Tủ B1 - Phòng thực hành 1' },
  { code: 'K-B2', name: 'Tủ B2 - Phòng thực hành 2' }
];

const equipmentSeed = [
  { code: 'ARD-001', name: 'Arduino Uno R3', model: 'ATmega328P', category: 'Vi điều khiển', location: 'K-A1', serialNumber: 'ARD-UNO-0001', replacementFee: 250000 },
  { code: 'ARD-002', name: 'Arduino Uno R3', model: 'ATmega328P', category: 'Vi điều khiển', location: 'K-A1', serialNumber: 'ARD-UNO-0002', replacementFee: 250000 },
  { code: 'ARD-003', name: 'Arduino Uno R3', model: 'ATmega328P', category: 'Vi điều khiển', location: 'K-A1', serialNumber: 'ARD-UNO-0003', replacementFee: 250000 },
  { code: 'ESP-001', name: 'ESP32 DevKit V1', model: 'ESP32-WROOM-32', category: 'Vi điều khiển', location: 'K-A1', serialNumber: 'ESP32-0001', replacementFee: 320000 },
  { code: 'ESP-002', name: 'ESP32 DevKit V1', model: 'ESP32-WROOM-32', category: 'Vi điều khiển', location: 'K-A1', serialNumber: 'ESP32-0002', replacementFee: 320000 },
  { code: 'STM-001', name: 'STM32F103 Blue Pill', model: 'STM32F103C8T6', category: 'Vi điều khiển', location: 'K-A2', serialNumber: 'STM32-0001', replacementFee: 180000 },
  { code: 'SEN-001', name: 'Cảm biến siêu âm HC-SR04', model: 'HC-SR04', category: 'Cảm biến', location: 'K-A2', serialNumber: 'HC-SR04-0001', replacementFee: 60000 },
  { code: 'SEN-002', name: 'Cảm biến siêu âm HC-SR04', model: 'HC-SR04', category: 'Cảm biến', location: 'K-A2', serialNumber: 'HC-SR04-0002', replacementFee: 60000 },
  { code: 'SEN-003', name: 'Cảm biến nhiệt độ DHT22', model: 'DHT22', category: 'Cảm biến', location: 'K-A2', serialNumber: 'DHT22-0001', replacementFee: 90000 },
  { code: 'SEN-004', name: 'Cảm biến ánh sáng LDR', model: 'GL5528', category: 'Cảm biến', location: 'K-A2', serialNumber: 'LDR-0001', replacementFee: 20000 },
  { code: 'MOD-001', name: 'Module Relay 4 kênh', model: 'SRD-05VDC', category: 'Module & mạch mở rộng', location: 'K-B1', serialNumber: 'RELAY4-0001', replacementFee: 85000 },
  { code: 'MOD-002', name: 'Module Relay 4 kênh', model: 'SRD-05VDC', category: 'Module & mạch mở rộng', location: 'K-B1', serialNumber: 'RELAY4-0002', replacementFee: 85000 },
  { code: 'MOD-003', name: 'Mạch cầu H L298N', model: 'L298N', category: 'Module & mạch mở rộng', location: 'K-B1', serialNumber: 'L298N-0001', replacementFee: 75000 },
  { code: 'MOD-004', name: 'Module ADC ADS1115', model: 'ADS1115', category: 'Module & mạch mở rộng', location: 'K-B1', serialNumber: 'ADS1115-0001', replacementFee: 120000 },
  { code: 'CAB-001', name: 'Cáp USB-B kết nối board', model: 'USB 2.0 A-B', category: 'Cáp & đầu nối', location: 'K-B2', serialNumber: 'USBB-0001', replacementFee: 35000 },
  { code: 'CAB-002', name: 'Cáp USB-B kết nối board', model: 'USB 2.0 A-B', category: 'Cáp & đầu nối', location: 'K-B2', serialNumber: 'USBB-0002', replacementFee: 35000 },
  { code: 'CAB-003', name: 'Bộ dây jumper 120 sợi', model: 'Jumper 20cm', category: 'Cáp & đầu nối', location: 'K-B2', serialNumber: 'JUMP-0001', replacementFee: 45000 },
  { code: 'CAB-004', name: 'Cáp tín hiệu BNC', model: 'BNC 1m', category: 'Cáp & đầu nối', location: 'K-B2', serialNumber: 'BNC-0001', replacementFee: 150000 },
  { code: 'MET-001', name: 'Đồng hồ vạn năng', model: 'DT9205A', category: 'Dụng cụ đo', location: 'K-B2', serialNumber: 'DMM-0001', replacementFee: 450000 },
  { code: 'MET-002', name: 'Nguồn DC điều chỉnh', model: 'HY1803D', category: 'Dụng cụ đo', location: 'K-B2', serialNumber: 'PSU-0001', replacementFee: 950000 }
];

async function main() {
  const admin = await upsertUser({ email: adminEmail, fullName: 'Quản trị viên khoa CNTT', role: 'ADMIN', password: adminPassword });
  const technician = await upsertUser({ email: 'canbo.xuong@cntt.edu.vn', fullName: 'Nguyễn Văn Hùng (Cán bộ xưởng)', role: 'TECHNICIAN', password: staffPassword });
  const student1 = await upsertUser({ email: 'sv.an@student.cntt.edu.vn', fullName: 'Trần Hoài An', role: 'STUDENT', studentCode: 'SV2021001', password: studentPassword });
  const student2 = await upsertUser({ email: 'sv.binh@student.cntt.edu.vn', fullName: 'Lê Thanh Bình', role: 'STUDENT', studentCode: 'SV2021002', password: studentPassword });
  await upsertUser({ email: 'gv.cuong@cntt.edu.vn', fullName: 'Phạm Mạnh Cường (Giảng viên)', role: 'LECTURER', password: staffPassword });

  const categoryMap = new Map();
  for (const category of categories) {
    const record = await prisma.category.upsert({ where: { name: category.name }, update: { description: category.description }, create: category });
    categoryMap.set(category.name, record.id);
  }
  const locationMap = new Map();
  for (const location of locations) {
    const record = await prisma.location.upsert({ where: { code: location.code }, update: { name: location.name }, create: location });
    locationMap.set(location.code, record.id);
  }

  const equipmentMap = new Map();
  for (const item of equipmentSeed) {
    const record = await prisma.equipment.upsert({
      where: { code: item.code },
      update: { name: item.name, model: item.model, categoryId: categoryMap.get(item.category), locationId: locationMap.get(item.location), replacementFee: item.replacementFee },
      create: {
        code: item.code,
        name: item.name,
        model: item.model,
        serialNumber: item.serialNumber,
        qrPayload: `CNTT-EQ:${item.code}`,
        replacementFee: item.replacementFee,
        categoryId: categoryMap.get(item.category),
        locationId: locationMap.get(item.location)
      }
    });
    equipmentMap.set(item.code, record.id);
  }

  const existingLoans = await prisma.loan.count();
  if (existingLoans === 0) {
    await prisma.loan.create({
      data: {
        code: 'PM-2026-0001',
        borrowerId: student1.id,
        purpose: 'Làm bài tập lớn môn Vi xử lý - điều khiển LED qua relay',
        expectedReturnAt: new Date(now + 5 * day),
        status: 'PENDING',
        items: { create: [{ equipmentId: equipmentMap.get('ARD-001') }, { equipmentId: equipmentMap.get('MOD-001') }] }
      }
    });
    await prisma.equipment.updateMany({ where: { id: { in: [equipmentMap.get('ARD-001'), equipmentMap.get('MOD-001')] } }, data: { status: 'RESERVED' } });

    await prisma.loan.create({
      data: {
        code: 'PM-2026-0002',
        borrowerId: student2.id,
        approvedById: technician.id,
        purpose: 'Thực hành môn IoT - đọc cảm biến nhiệt độ DHT22',
        expectedReturnAt: new Date(now + 3 * day),
        status: 'APPROVED',
        items: { create: [{ equipmentId: equipmentMap.get('ESP-001') }, { equipmentId: equipmentMap.get('SEN-003') }] }
      }
    });
    await prisma.equipment.updateMany({ where: { id: { in: [equipmentMap.get('ESP-001'), equipmentMap.get('SEN-003')] } }, data: { status: 'RESERVED' } });

    await prisma.loan.create({
      data: {
        code: 'PM-2026-0003',
        borrowerId: student1.id,
        approvedById: technician.id,
        purpose: 'Thực hành truyền thông UART giữa hai board',
        expectedReturnAt: new Date(now + 2 * day),
        checkedOutAt: new Date(now - 1 * day),
        status: 'CHECKED_OUT',
        items: { create: [{ equipmentId: equipmentMap.get('STM-001') }, { equipmentId: equipmentMap.get('CAB-001') }] }
      }
    });
    await prisma.equipment.updateMany({ where: { id: { in: [equipmentMap.get('STM-001'), equipmentMap.get('CAB-001')] } }, data: { status: 'BORROWED' } });

    await prisma.loan.create({
      data: {
        code: 'PM-2026-0004',
        borrowerId: student2.id,
        approvedById: technician.id,
        purpose: 'Đo tín hiệu xung bằng đồng hồ vạn năng phục vụ đồ án',
        expectedReturnAt: new Date(now - 4 * day),
        checkedOutAt: new Date(now - 10 * day),
        reminderCount: 1,
        lastRemindedAt: new Date(now - 2 * day),
        status: 'OVERDUE',
        items: { create: [{ equipmentId: equipmentMap.get('MET-001') }, { equipmentId: equipmentMap.get('CAB-004') }] }
      }
    });
    await prisma.equipment.updateMany({ where: { id: { in: [equipmentMap.get('MET-001'), equipmentMap.get('CAB-004')] } }, data: { status: 'BORROWED' } });

    await prisma.loan.create({
      data: {
        code: 'PM-2026-0005',
        borrowerId: student1.id,
        approvedById: technician.id,
        purpose: 'Thực hành mạch cầu H điều khiển động cơ DC',
        expectedReturnAt: new Date(now - 12 * day),
        checkedOutAt: new Date(now - 18 * day),
        returnedAt: new Date(now - 13 * day),
        status: 'RETURNED',
        items: {
          create: [
            { equipmentId: equipmentMap.get('MOD-003'), conditionIn: 'DAMAGED', penaltyFee: 75000, returnNote: 'Cháy IC L298N do cấp quá áp' },
            { equipmentId: equipmentMap.get('SEN-001'), conditionIn: 'LOST', isLost: true, penaltyFee: 60000, returnNote: 'Sinh viên làm mất, đã báo cán bộ xưởng' }
          ]
        }
      }
    });
    await prisma.equipment.update({ where: { id: equipmentMap.get('MOD-003') }, data: { condition: 'DAMAGED', status: 'MAINTENANCE', lastCheckedAt: new Date(now - 13 * day) } });
    await prisma.equipment.update({ where: { id: equipmentMap.get('SEN-001') }, data: { condition: 'LOST', status: 'LOST', lastCheckedAt: new Date(now - 13 * day) } });

    await prisma.notification.createMany({
      data: [
        { userId: student2.id, type: 'OVERDUE', title: 'Thiết bị quá hạn trả', message: 'Phiếu PM-2026-0004 đã quá hạn. Vui lòng mang thiết bị trả cho cán bộ xưởng.' },
        { userId: student1.id, type: 'LOAN_RETURNED', title: 'Đã nhận trả thiết bị', message: 'Phiếu PM-2026-0005 đã hoàn tất. Có 1 thiết bị hỏng và 1 thiết bị mất.' }
      ]
    });

    await prisma.restockProposal.create({
      data: {
        equipmentId: equipmentMap.get('SEN-001'),
        title: 'Nhập bổ sung cảm biến siêu âm HC-SR04',
        suggestedQty: 2,
        reason: 'Thiết bị SEN-001 bị mất trong phiếu PM-2026-0005, tồn kho khả dụng giảm dưới ngưỡng an toàn.',
        createdById: technician.id
      }
    });
    await prisma.restockProposal.create({
      data: {
        categoryId: categoryMap.get('Cáp & đầu nối'),
        title: 'Nhập bổ sung cáp và đầu nối',
        suggestedQty: 5,
        reason: 'Nhóm cáp/đầu nối có tỷ lệ hư hao cao, thường xuyên hết khi sinh viên đăng ký theo nhóm.',
        createdById: technician.id
      }
    });

    await prisma.auditLog.createMany({
      data: [
        { action: 'SEED_DATA', detail: { note: 'Khởi tạo dữ liệu mẫu hệ thống mượn/trả' } },
        { action: 'RETURN_EQUIPMENT', userId: technician.id, equipmentId: equipmentMap.get('MOD-003'), detail: { condition: 'DAMAGED' } },
        { action: 'RETURN_EQUIPMENT', userId: technician.id, equipmentId: equipmentMap.get('SEN-001'), detail: { condition: 'LOST' } }
      ]
    });
  }

  void admin;
  console.log('Đã khởi tạo dữ liệu mẫu.');
  console.log(`  Admin     : ${adminEmail} / ${adminPassword}`);
  console.log(`  Cán bộ    : canbo.xuong@cntt.edu.vn / ${staffPassword}`);
  console.log(`  Sinh viên : sv.an@student.cntt.edu.vn / ${studentPassword}`);
  console.log(`  Sinh viên : sv.binh@student.cntt.edu.vn / ${studentPassword}`);
}

await main();
await prisma.$disconnect();
