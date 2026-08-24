import { Priority, TestCaseStatus, TestType } from '@prisma/client';
import { ImportsService } from './imports.service';

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
});
