import { Injectable } from "@nestjs/common";
import pdfMakeRuntime from "pdfmake";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

type BaseSnapshot = Awaited<
  ReturnType<import("./plan-reports.service").PlanReportsService["get"]>
>;
type ReportSnapshot = Omit<BaseSnapshot, "cases"> & {
  cases: Array<
    BaseSnapshot["cases"][number] & {
      attachments?: Array<{ fileName: string; dataUrl: string }>;
    }
  >;
};
const pdfMake = pdfMakeRuntime as unknown as typeof import("pdfmake");
const statusLabels: Record<string, string> = {
  PASSED: "Успешно",
  FAILED: "Провалено",
  BLOCKED: "Заблокировано",
  SKIPPED: "Пропущено",
  RETEST: "Ретест",
  NOT_RUN: "Не выполнено",
};
const statusColors: Record<string, string> = {
  PASSED: "#16a34a",
  FAILED: "#dc2626",
  BLOCKED: "#d97706",
  SKIPPED: "#475569",
  RETEST: "#7c3aed",
  NOT_RUN: "#64748b",
};
const priorityLabels: Record<string, string> = {
  HIGHEST: "Самый высокий",
  HIGH: "Высокий",
  MEDIUM: "Средний",
  LOW: "Низкий",
  LOWEST: "Очень низкий",
};

function duration(seconds: number) {
  const h = Math.floor(seconds / 3600),
    m = Math.floor((seconds % 3600) / 60),
    s = seconds % 60;
  return [h && `${h}ч`, m && `${m}м`, (s || (!h && !m)) && `${s}с`]
    .filter(Boolean)
    .join(" ");
}
function section(name: string) {
  return name === "PRECONDITION"
    ? "Предусловия"
    : name === "POSTCONDITION"
      ? "Постусловия"
      : "Шаги";
}

function escapeSvg(value: unknown) {
  return String(value ?? "—")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function pill(
  text: string,
  foreground: string,
  background: string,
  width = 108,
): { svg: string; width: number } {
  return {
    svg: `<svg width="${width}" height="19" viewBox="0 0 ${width} 19" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="19" rx="9.5" fill="${background}"/><text x="${width / 2}" y="12.7" text-anchor="middle" font-family="Roboto, sans-serif" font-size="7.5" font-weight="600" fill="${foreground}">${escapeSvg(text)}</text></svg>`,
    width,
  };
}

function labeledPill(
  label: string,
  text: string,
  foreground: string,
  background: string,
): Content {
  return {
    stack: [
      { text: label, fontSize: 7, color: "#64748b", margin: [2, 0, 0, 3] },
      pill(text, foreground, background),
    ],
  } as Content;
}

@Injectable()
export class ReportDocumentBuilder {
  private readonly fonts = {
    Roboto: {
      normal: require.resolve("pdfmake/fonts/Roboto/Roboto-Regular.ttf"),
      bold: require.resolve("pdfmake/fonts/Roboto/Roboto-Medium.ttf"),
      italics: require.resolve("pdfmake/fonts/Roboto/Roboto-Italic.ttf"),
      bolditalics: require.resolve(
        "pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf",
      ),
    },
  };

  async pdf(snapshot: ReportSnapshot): Promise<Buffer> {
    const m = snapshot.metrics;
    const statusKeys = Object.keys(statusLabels);
    const statusTotal = Math.max(1, statusKeys.reduce((sum, key) => sum + Number(m[key as keyof typeof m] ?? 0), 0));
    const metric = (label: string, value: string, hint: string): Content => ({
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                { text: label, color: "#64748b", fontSize: 9 },
                { text: value, bold: true, fontSize: 23, margin: [0, 8, 0, 3] },
                { text: hint, color: "#64748b", fontSize: 8 },
              ],
              fillColor: "#ffffff",
              margin: [14, 13, 14, 13],
            },
          ],
        ],
      },
      layout: {
        hLineColor: () => "#dbe3f0",
        vLineColor: () => "#dbe3f0",
        hLineWidth: () => 1,
        vLineWidth: () => 1,
      },
    });
    const caseBlocks: Content[] = snapshot.cases.map((testCase) => {
      const stepBlocks: Content[] = [
        "PRECONDITION",
        "ACTION",
        "POSTCONDITION",
      ].flatMap((kind) => {
        const steps = testCase.steps.filter((item) => item.section === kind);
        return [
          {
            text: section(kind),
            bold: true,
            fontSize: 9,
            color: "#334155",
            margin: [0, 9, 0, 4],
          },
          {
            table: {
              headerRows: 1,
              dontBreakRows: true,
              widths: [24, "*", "*"],
              body: [
                [
                  { text: "#", bold: true, color: "#64748b" },
                  { text: "Действие", bold: true, color: "#64748b" },
                  { text: "Ожидаемый результат", bold: true, color: "#64748b" },
                ],
                ...(steps.length
                  ? steps.map((step, i) => [
                      { text: String(i + 1), bold: true, color: "#4f46e5" },
                      { text: step.action },
                      { text: step.expectedResult || "—", color: "#475569" },
                    ])
                  : [
                      [
                        { text: "—", color: "#94a3b8" },
                        { text: "Нет шагов", color: "#94a3b8", colSpan: 2 },
                        {},
                      ],
                    ]),
              ],
            },
            layout: {
              fillColor: (row) =>
                row === 0 ? "#f1f5f9" : row % 2 === 0 ? "#fafbff" : "#ffffff",
              hLineColor: () => "#e2e8f0",
              vLineColor: () => "#e2e8f0",
              hLineWidth: () => 0.6,
              vLineWidth: () => 0.6,
              paddingLeft: () => 7,
              paddingRight: () => 7,
              paddingTop: () => 5,
              paddingBottom: () => 5,
            },
          } as Content,
        ];
      });
      const attachments: Content[] = (testCase.attachments ?? []).flatMap(
        (file) => [
          {
            image: file.dataUrl,
            fit: [430, 260],
            alignment: "left",
            margin: [0, 6, 0, 3],
          },
          {
            text: file.fileName,
            fontSize: 8,
            color: "#64748b",
            margin: [0, 0, 0, 5],
          },
        ],
      );
      const body: Content[] = [
        {
          columns: [
            {
              stack: [
                {
                  text: testCase.displayId,
                  bold: true,
                  color: "#4f46e5",
                  fontSize: 10,
                },
                {
                  text: testCase.title,
                  bold: true,
                  fontSize: 12,
                  margin: [0, 3, 0, 0],
                },
              ],
              width: "*",
            },
            {
              ...pill(
                statusLabels[testCase.status] ?? testCase.status,
                statusColors[testCase.status],
                testCase.status === "PASSED"
                  ? "#dcfce7"
                  : testCase.status === "FAILED"
                    ? "#ffe4e6"
                    : testCase.status === "BLOCKED"
                      ? "#ffedd5"
                      : "#f1f5f9",
                72,
              ),
              width: 100,
            } as Content,
            {
              text: `Факт ${duration(testCase.actualDuration)} · План ${duration(testCase.estimatedDuration)}`,
              alignment: "right",
              width: 125,
              fontSize: 8,
              color: "#475569",
            },
          ],
          columnGap: 10,
        },
        {
          columns: [
            labeledPill("ТИП", testCase.type, "#0369a1", "#e0f2fe"),
            labeledPill(
              "ПРИОРИТЕТ",
              priorityLabels[testCase.priority] ?? testCase.priority,
              testCase.priority === "HIGHEST"
                ? "#b91c1c"
                : testCase.priority === "HIGH"
                  ? "#c2410c"
                  : "#6d28d9",
              testCase.priority === "HIGHEST"
                ? "#ffe4e6"
                : testCase.priority === "HIGH"
                  ? "#ffedd5"
                  : "#ede9fe",
            ),
            labeledPill(
              "ИСПОЛНИТЕЛЬ",
              testCase.executor
                ? `${testCase.executor.firstName} ${testCase.executor.lastName}`
                : "—",
              "#047857",
              "#d1fae5",
            ),
          ],
          columnGap: 8,
          margin: [0, 10, 0, 2],
        },
        ...(testCase.description
          ? [{ text: testCase.description, margin: [0, 7, 0, 2] } as Content]
          : []),
        ...stepBlocks,
        ...(testCase.actualResult || testCase.comment
          ? [
              {
                table: {
                  widths: ["*"],
                  body: [
                    [
                      {
                        stack: [
                          { text: "Фактический результ", bold: true },
                          {
                            text: testCase.actualResult || "—",
                            margin: [0, 3, 0, 0],
                          },
                          ...(testCase.comment
                            ? [
                                {
                                  text: `Комментарий: ${testCase.comment}`,
                                  color: "#64748b",
                                  margin: [0, 3, 0, 0],
                                },
                              ]
                            : []),
                        ],
                        fillColor:
                          testCase.status === "FAILED" ? "#fff1f2" : "#f8fafc",
                        margin: [9, 7, 9, 7],
                      },
                    ],
                  ],
                },
                layout: "noBorders",
                margin: [0, 7, 0, 2],
              } as Content,
            ]
          : []),
        ...(testCase.defects.length
          ? [
              {
                text: `Дефекты: ${testCase.defects.map((item) => `${item.displayId} · ${item.title}`).join("; ")}`,
                color: "#b91c1c",
                margin: [0, 6, 0, 2],
              } as Content,
            ]
          : []),
        ...(attachments.length
          ? [
              {
                text: "Вложения и подтверждения",
                bold: true,
                fontSize: 10,
                margin: [0, 9, 0, 2],
              } as Content,
              ...attachments,
            ]
          : []),
      ];
      const card = {
        table: {
          dontBreakRows: !attachments.length,
          widths: ["*"],
          body: [
            [{ stack: body, fillColor: "#ffffff", margin: [14, 13, 14, 13] }],
          ],
        },
        layout: {
          hLineColor: () =>
            testCase.status === "FAILED" ? "#fecaca" : "#dbe3f0",
          vLineColor: () =>
            testCase.status === "FAILED" ? "#fecaca" : "#dbe3f0",
          hLineWidth: () => 1,
          vLineWidth: () => 1,
        },
        margin: [0, 0, 0, 10],
      } as Content;
      return testCase.steps.length <= 14 && !attachments.length
        ? ({ stack: [card], unbreakable: true } as unknown as Content)
        : card;
    });
    const doc: TDocumentDefinitions = {
      pageSize: "A3",
      pageOrientation: "portrait",
      pageMargins: [48, 48, 48, 46],
      defaultStyle: {
        font: "Roboto",
        fontSize: 9,
        color: "#0f172a",
        lineHeight: 1.15,
      },
      header: () => ({
        text: "Quality Hub — Almen Alnur",
        alignment: "center",
        fontSize: 7,
        color: "#475569",
        margin: [0, 17, 0, 0],
      }),
      footer: (page, pages) => ({
        text: `Quality Hub · Almen Alnur · ${page} / ${pages}`,
        alignment: "center",
        fontSize: 7,
        color: "#64748b",
      }),
      content: [
        {
          table: {
            widths: ["*"],
            body: [
              [
                {
                  stack: [
                    {
                      text: "ОТЧЁТ О ТЕСТИРОВАНИИ",
                      bold: true,
                      color: "#6366f1",
                      fontSize: 9,
                      characterSpacing: 1.2,
                    },
                    {
                      text: snapshot.plan.name,
                      fontSize: 25,
                      bold: true,
                      margin: [0, 5, 0, 5],
                    },
                    {
                      text: `${snapshot.plan.project.code} · ${snapshot.plan.project.name}`,
                      color: "#64748b",
                    },
                    {
                      columns: [
                        {
                          text: `Версия / Build\n${snapshot.plan.version || "—"} / ${snapshot.plan.build || "—"}`,
                        },
                        {
                          text: `Окружение\n${snapshot.plan.environment || "—"}`,
                        },
                        {
                          text: `Тест-ран\n${snapshot.run?.name || "Не запускался"}`,
                        },
                        {
                          text: `Сформирован\n${new Date(snapshot.generatedAt).toLocaleString("ru-RU")}`,
                        },
                      ],
                      columnGap: 14,
                      fontSize: 8,
                      color: "#475569",
                      margin: [0, 18, 0, 0],
                    },
                  ],
                  fillColor: "#f5f7ff",
                  margin: [18, 16, 18, 16],
                },
              ],
            ],
          },
          layout: {
            hLineColor: () => "#cfd8ea",
            vLineColor: () => "#cfd8ea",
            hLineWidth: () => 1,
            vLineWidth: () => 1,
          },
          margin: [0, 0, 0, 12],
        },
        {
          columns: [
            metric(
              "Выполнение",
              `${m.progress}%`,
              `${m.executed} из ${m.total}`,
            ),
            metric("Успешность", `${m.passRate}%`, `${m.PASSED} успешно`),
            metric(
              "Затрачено",
              duration(m.actualDuration),
              `Оценка ${duration(m.estimatedDuration)}`,
            ),
          ],
          columnGap: 9,
          margin: [0, 0, 0, 12],
        },
        {
          canvas: statusKeys.reduce<{ type: "rect"; x: number; y: number; w: number; h: number; color: string; r: number }[]>((items, key) => {
            const x = items.reduce((sum, item) => sum + item.w, 0);
            const width = 720 * Number(m[key as keyof typeof m] ?? 0) / statusTotal;
            if (width > 0) items.push({ type: "rect", x, y: 0, w: width, h: 10, color: statusColors[key], r: 5 });
            return items;
          }, []),
          margin: [0, 0, 0, 12],
        } as Content,
        {
          table: {
            widths: ["*", "*", "*", "*", "*", "*"],
            body: [
              Object.keys(statusLabels).map((key) => ({
                stack: [
                  {
                    text: String(m[key as keyof typeof m] ?? 0),
                    fontSize: 17,
                    bold: true,
                    color: statusColors[key],
                  },
                  {
                    text: statusLabels[key],
                    fontSize: 7,
                    color: statusColors[key],
                  },
                ],
                fillColor:
                  key === "FAILED"
                    ? "#fff1f2"
                    : key === "PASSED"
                      ? "#f0fdf4"
                      : "#f8fafc",
                margin: [8, 9, 8, 9],
              })),
            ],
          },
          layout: {
            hLineColor: () => "#e2e8f0",
            vLineColor: () => "#e2e8f0",
            hLineWidth: () => 1,
            vLineWidth: () => 1,
          },
          margin: [0, 0, 0, 16],
        },
        ...(snapshot.comparison
          ? [
              {
                table: {
                  widths: ["*", "*", "*"],
                  body: [[
                    { stack: [{ text: "СРАВНЕНИЕ С ПРОШЛЫМ ЗАПУСКОМ", fontSize: 7, color: "#64748b" }, { text: `${snapshot.comparison.passRateDelta !== null && snapshot.comparison.passRateDelta >= 0 ? "+" : ""}${snapshot.comparison.passRateDelta ?? 0}% успешности`, bold: true, fontSize: 15, color: (snapshot.comparison.passRateDelta ?? 0) >= 0 ? "#047857" : "#be123c", margin: [0, 5, 0, 0] }], fillColor: "#eef2ff", margin: [10, 9, 10, 9] },
                    { stack: [{ text: "НОВЫЕ РЕГРЕССИИ", fontSize: 7, color: "#9f1239" }, { text: String(snapshot.comparison.regressions), bold: true, fontSize: 15, color: "#be123c", margin: [0, 5, 0, 0] }], fillColor: "#fff1f2", margin: [10, 9, 10, 9] },
                    { stack: [{ text: "ИСПРАВЛЕНО", fontSize: 7, color: "#047857" }, { text: String(snapshot.comparison.fixed), bold: true, fontSize: 15, color: "#047857", margin: [0, 5, 0, 0] }], fillColor: "#ecfdf5", margin: [10, 9, 10, 9] },
                  ]],
                },
                layout: "noBorders",
                margin: [0, 0, 0, 16],
              } as Content,
            ]
          : []),
        {
          text: "Подробные результаты тест-кейсов",
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 7],
        },
        ...caseBlocks,
      ],
    };
    const allowedFonts = new Set(Object.values(this.fonts.Roboto));
    pdfMake.setUrlAccessPolicy(() => false);
    pdfMake.setLocalAccessPolicy((path) => allowedFonts.has(path));
    pdfMake.setFonts(this.fonts);
    return pdfMake.createPdf(doc).getBuffer();
  }
}
