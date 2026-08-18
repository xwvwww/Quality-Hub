import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, ReportFormat, ReportJobStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';
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
        const snapshot = await this.reports.get(job.organizationId, job.testPlanId);
        await this.prisma.generatedReport.update({ where: { id: job.id }, data: { progress: 45 } });
        const buffer = job.format === ReportFormat.PDF ? await this.documents.pdf(snapshot) : Buffer.from(JSON.stringify(snapshot, null, 2), 'utf8');
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
        this.logger.error(`Report ${job.id} failed: ${message}`);
        await this.prisma.generatedReport.update({ where: { id: job.id }, data: { status: ReportJobStatus.FAILED, progress: 0, error: message.slice(0, 1_000), completedAt: new Date() } });
      }
    } finally { this.busy = false; }
  }
}
