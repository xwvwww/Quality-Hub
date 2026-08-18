import { Injectable } from '@nestjs/common';
import pdfMakeRuntime from 'pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

type ReportSnapshot = Awaited<ReturnType<import('./plan-reports.service').PlanReportsService['get']>>;
const pdfMake = pdfMakeRuntime as unknown as typeof import('pdfmake');

const statusLabels: Record<string, string> = {
  PASSED: 'Успешно', FAILED: 'Провалено', BLOCKED: 'Заблокировано',
  SKIPPED: 'Пропущено', RETEST: 'Ретест', NOT_RUN: 'Не выполнено',
};

function duration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours && `${hours}ч`, minutes && `${minutes}м`, (rest || (!hours && !minutes)) && `${rest}с`].filter(Boolean).join(' ');
}

@Injectable()
export class ReportDocumentBuilder {
  private readonly fonts = {
    Roboto: {
      normal: require.resolve('pdfmake/fonts/Roboto/Roboto-Regular.ttf'),
      bold: require.resolve('pdfmake/fonts/Roboto/Roboto-Medium.ttf'),
      italics: require.resolve('pdfmake/fonts/Roboto/Roboto-Italic.ttf'),
      bolditalics: require.resolve('pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf'),
    },
  };

  async pdf(snapshot: ReportSnapshot): Promise<Buffer> {
    const m = snapshot.metrics;
    const details: Content[] = snapshot.cases.flatMap((testCase, index) => {
      const steps = testCase.steps.length
        ? testCase.steps.map((step) => `${step.position + 1}. ${step.action}${step.expectedResult ? ` → ${step.expectedResult}` : ''}`)
        : ['Шаги не указаны'];
      return [
        { text: `${testCase.displayId}  ${testCase.title}`, style: 'caseTitle', pageBreak: index && index % 12 === 0 ? 'before' : undefined },
        { columns: [
          { text: `Статус: ${statusLabels[testCase.status] ?? testCase.status}` },
          { text: `Приоритет: ${testCase.priority}` },
          { text: `Время: ${duration(testCase.actualDuration)} / ${duration(testCase.estimatedDuration)}` },
        ], style: 'caseMeta' },
        testCase.description ? { text: testCase.description, margin: [0, 3, 0, 3] } : { text: '' },
        { ul: steps, margin: [14, 2, 0, 5] },
        testCase.actualResult ? { text: `Фактический результат: ${testCase.actualResult}`, color: '#334155' } : { text: '' },
        testCase.defects.length ? { text: `Дефекты: ${testCase.defects.map((item) => `${item.displayId} ${item.title}`).join('; ')}`, color: '#b91c1c', margin: [0, 2, 0, 7] } : { text: '', margin: [0, 0, 0, 7] },
      ];
    });
    const doc: TDocumentDefinitions = {
      pageSize: 'A3', pageOrientation: 'portrait', pageMargins: [48, 52, 48, 48],
      defaultStyle: { font: 'Roboto', fontSize: 9, color: '#0f172a' },
      footer: (page, pages) => ({ text: `Quality Hub • Almen Alnur • ${page} / ${pages}`, alignment: 'center', color: '#64748b', fontSize: 8 }),
      styles: {
        title: { fontSize: 25, bold: true, color: '#312e81', margin: [0, 0, 0, 8] },
        eyebrow: { fontSize: 9, bold: true, color: '#6366f1', characterSpacing: 1.2 },
        caseTitle: { fontSize: 11, bold: true, color: '#312e81', margin: [0, 9, 0, 3] },
        caseMeta: { fontSize: 8, color: '#475569', margin: [0, 0, 0, 3] },
      },
      content: [
        { text: 'ОТЧЁТ О ТЕСТИРОВАНИИ', style: 'eyebrow' },
        { text: snapshot.plan.name, style: 'title' },
        { text: `${snapshot.plan.project.code} · ${snapshot.plan.project.name}`, color: '#64748b', margin: [0, 0, 0, 14] },
        { table: { widths: ['*', '*', '*', '*'], body: [
          ['Выполнение', 'Успешность', 'Затрачено', 'Дефекты'],
          [`${m.progress}% (${m.executed}/${m.total})`, `${m.passRate}%`, duration(m.actualDuration), String(m.defects)],
        ] }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 12] },
        { text: `Результаты: успешно ${m.PASSED} · провалено ${m.FAILED} · заблокировано ${m.BLOCKED} · не выполнено ${m.NOT_RUN}`, bold: true, margin: [0, 0, 0, 10] },
        { text: 'Подробные результаты тест-кейсов', fontSize: 16, bold: true, margin: [0, 7, 0, 4] },
        ...details,
      ],
    };
    const allowedFonts = new Set(Object.values(this.fonts.Roboto));
    pdfMake.setUrlAccessPolicy(() => false);
    pdfMake.setLocalAccessPolicy((path) => allowedFonts.has(path));
    pdfMake.setFonts(this.fonts);
    return pdfMake.createPdf(doc).getBuffer();
  }
}
