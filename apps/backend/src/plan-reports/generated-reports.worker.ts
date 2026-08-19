import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, ReportFormat, ReportJobStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { resolve, sep } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { PlanReportsService } from './plan-reports.service';
import { ReportDocumentBuilder } from './report-document.builder';

@Injectable()
export class GeneratedReportsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GeneratedReportsWorker.name);
  private timer?: NodeJS.Timeout;
  private busy = false;

  constructor(private prisma: PrismaService, private reports: PlanReportsService, private documents: ReportDocumentBuilder) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 2_000);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      const job = await this.prisma.generatedReport.findFirst({ where: { status: ReportJobStatus.QUEUED }, orderBy: { createdAt: 'asc' } });
      if (!job) return;
      const claimed = await this.prisma.generatedReport.updateMany({ where: { id: job.id, status: ReportJobStatus.QUEUED }, data: { status: ReportJobStatus.PROCESSING, progress: 10, startedAt: new Date(), error: null } });
      if (claimed.count !== 1) return;
      try {
        const snapshot = await this.reports.get(job.organizationId, job.testPlanId, job.failedOnly);
        await this.prisma.generatedReport.update({ where: { id: job.id }, data: { progress: 45 } });
        const printable = job.format === ReportFormat.PDF && job.includeAttachments ? await this.withAttachments(snapshot, job.organizationId) : snapshot;
        const buffer = job.format === ReportFormat.PDF ? await this.documents.pdf(printable) : Buffer.from(JSON.stringify(snapshot, null, 2), 'utf8');
        const extension = job.format === ReportFormat.PDF ? 'pdf' : 'json';
        const mimeType = job.format === ReportFormat.PDF ? 'application/pdf' : 'application/json; charset=utf-8';
        const root = process.env.UPLOAD_DIR ?? 'uploads';
        const storageKey = `generated-reports/${randomUUID()}.${extension}`;
        await mkdir(resolve(root, 'generated-reports'), { recursive: true });
        await writeFile(resolve(root, storageKey), buffer, { flag: 'wx' });
        const safeCode = snapshot.plan.project.code.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || 'quality-hub';
        await this.prisma.generatedReport.update({ where: { id: job.id }, data: {
          status: ReportJobStatus.COMPLETED, progress: 100, storageKey,
          fileName: `${safeCode}-test-report.${extension}`, mimeType, size: buffer.length,
          snapshot: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue,
          completedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000),
        } });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
        this.logger.error(`Report ${job.id} failed: ${message.slice(0, 300)}`);
        await this.prisma.generatedReport.update({ where: { id: job.id }, data: { status: ReportJobStatus.FAILED, progress: 0, error: 'Не удалось сформировать отчёт. Повторите позже', completedAt: new Date() } });
      }
    } finally { this.busy = false; }
  }

  private async withAttachments<T extends { run: { id: string } | null; cases: Array<{ id: string }> }>(snapshot: T, organizationId: string) {
    if (!snapshot.run) return snapshot;
    const runCases = await this.prisma.testRunCase.findMany({ where: { testRunId: snapshot.run.id }, select: { id: true, testCaseId: true } });
    const caseByRunCase = new Map(runCases.map((item) => [item.id, item.testCaseId]));
    const files = await this.prisma.attachment.findMany({ where: { organizationId, entityType: 'TEST_RUN_CASE', entityId: { in: runCases.map((item) => item.id) }, mimeType: { in: ['image/png', 'image/jpeg'] } }, orderBy: { createdAt: 'asc' }, take: 20, select: { entityId: true, fileName: true, mimeType: true, size: true, storageKey: true } });
    const root = resolve(process.env.UPLOAD_DIR ?? 'uploads');
    let total = 0;
    const grouped = new Map<string, Array<{ fileName: string; dataUrl: string }>>();
    for (const file of files) {
      if (total + file.size > 25 * 1024 * 1024) break;
      const path = resolve(root, file.storageKey);
      if (!path.startsWith(`${root}${sep}`)) continue;
      const buffer = await readFile(path).catch(() => null);
      if (!buffer) continue;
      total += buffer.length;
      const testCaseId = caseByRunCase.get(file.entityId);
      if (!testCaseId) continue;
      const group = grouped.get(testCaseId) ?? [];
      group.push({ fileName: file.fileName, dataUrl: `data:${file.mimeType};base64,${buffer.toString('base64')}` });
      grouped.set(testCaseId, group);
    }
    return { ...snapshot, cases: snapshot.cases.map((item) => ({ ...item, attachments: grouped.get(item.id) ?? [] })) };
  }
}
