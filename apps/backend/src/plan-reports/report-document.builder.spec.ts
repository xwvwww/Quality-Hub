import { ReportDocumentBuilder } from './report-document.builder';

describe('ReportDocumentBuilder', () => {
  it('creates an A3 PDF with Cyrillic content', async () => {
    const snapshot = {
      plan: { id: 'plan', name: 'Регрессионное тестирование', project: { code: 'SKZ', name: 'ScanKZ' } },
      metrics: { total: 1, executed: 1, progress: 100, passRate: 100, estimatedDuration: 60, actualDuration: 55, defects: 0, PASSED: 1, FAILED: 0, BLOCKED: 0, SKIPPED: 0, RETEST: 0, NOT_RUN: 0 },
      cases: [{
        displayId: 'SKZ-TC-0001', title: 'Вход в систему', status: 'PASSED', priority: 'HIGH',
        actualDuration: 55, estimatedDuration: 60, description: 'Проверка входа', actualResult: 'Вход выполнен',
        steps: [{ position: 0, section: 'ACTION', action: 'Ввести email', expectedResult: 'Поле заполнено' }], defects: [],
        attachments: [{ fileName: 'evidence.png', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' }],
      }],
    };
    const result = await new ReportDocumentBuilder().pdf(snapshot as never);
    expect(result.subarray(0, 5).toString()).toBe('%PDF-');
    expect(result.length).toBeGreaterThan(5_000);
  });
});
