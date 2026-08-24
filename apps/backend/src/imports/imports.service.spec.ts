import { Priority, TestCaseStatus, TestType } from '@prisma/client';
import { ImportsService } from './imports.service';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

describe('ImportsService XLSX mapping', () => {
  const service = new ImportsService({} as never) as any;

  it('maps the full Russian template and all expected results', () => {
    const row = service.normalize([
      'Авторизация', 'Описание', 'Готов', 'Самый высокий', 'FUNCTIONAL', '1m 45s',
      'Открыть страницу', 'Страница открыта', 'Ввести логин\nНажать Войти',
      'Логин введён\nПользователь вошёл', 'Выйти', 'Сессия закрыта',
    ]);
    expect(row).toMatchObject({
      status: TestCaseStatus.READY, priority: Priority.HIGHEST,
      type: TestType.FUNCTIONAL, durationSeconds: 105,
      preExpected: 'Страница открыта', postExpected: 'Сессия закрыта',
    });
  });

  it('keeps the legacy 9-column template compatible', () => {
    const row = service.normalize(['Старый кейс', '', 'HIGH', 'FUNCTIONAL', '45s', 'Подготовить', 'Выполнить', 'Готово', 'Очистить']);
    expect(row.status).toBe(TestCaseStatus.DRAFT);
    expect(row.durationSeconds).toBe(45);
    expect(row.steps).toBe('Выполнить');
  });

  it('reads namespace-prefixed XLSX and ignores validation-only rows', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Тест-кейсы');
    sheet.addRow(Array.from({ length: 12 }, (_, index) => `Колонка ${index + 1}`));
    sheet.addRow(['Кейс импорта', '', 'Готов', 'Средний', 'FUNCTIONAL', '1m']);
    sheet.getCell('C1001').dataValidation = { type: 'list', formulae: ['"Готов,Черновик"'] };
    const archive = await JSZip.loadAsync(Buffer.from(await workbook.xlsx.writeBuffer()));
    for (const entry of Object.values(archive.files).filter((item) => !item.dir && item.name.startsWith('xl/') && item.name.endsWith('.xml'))) {
      const xml = await entry.async('string');
      archive.file(entry.name, xml.replace(/<(\/?)(workbook|sheets|sheet|sst|si|t)(\s|>)/g, '<$1x:$2$3').replace(/xmlns="http:\/\/schemas.openxmlformats.org\/spreadsheetml\/2006\/main"/g, 'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'));
    }
    const rows = await service.xlsx(await archive.generateAsync({ type: 'nodebuffer' }));
    expect(rows).toHaveLength(1);
    expect(rows[0][0]).toBe('Кейс импорта');
  });
});
