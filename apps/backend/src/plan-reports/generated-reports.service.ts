import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReportJobStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGeneratedReportDto, GeneratedReportQueryDto } from './generated-reports.dto';

const reportSelect = {
  id: true, testPlanId: true, requestedById: true, status: true, format: true, includeAttachments: true,
  progress: true, fileName: true, mimeType: true, size: true, error: true, createdAt: true, startedAt: true,
  completedAt: true, expiresAt: true, testPlan: { select: { name: true, project: { select: { code: true, name: true } } } },
} satisfies Prisma.GeneratedReportSelect;

@Injectable()
export class GeneratedReportsService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreateGeneratedReportDto) {
    const plan = await this.prisma.testPlan.findFirst({ where: { id: dto.testPlanId, project: { organizationId } }, select: { id: true } });
    if (!plan) throw new NotFoundException('Тест-план не найден');
    const active = await this.prisma.generatedReport.count({ where: { organizationId, status: { in: [ReportJobStatus.QUEUED, ReportJobStatus.PROCESSING] } } });
    if (active >= 5) throw new BadRequestException('В организации уже формируется максимальное количество отчётов');
    const duplicate = await this.prisma.generatedReport.findFirst({ where: { organizationId, testPlanId: dto.testPlanId, requestedById: userId, format: dto.format, status: { in: [ReportJobStatus.QUEUED, ReportJobStatus.PROCESSING] } }, select: { id: true } });
    if (duplicate) throw new BadRequestException('Такой отчёт уже находится в очереди');
    const report = await this.prisma.generatedReport.create({ data: { organizationId, testPlanId: dto.testPlanId, requestedById: userId, format: dto.format, includeAttachments: dto.includeAttachments }, select: reportSelect });
    await this.prisma.auditLog.create({ data: { organizationId, userId, action: 'REPORT_QUEUED', entityType: 'GENERATED_REPORT', entityId: report.id, metadata: { testPlanId: dto.testPlanId, format: dto.format } } });
    return report;
  }

  async list(organizationId: string, query: GeneratedReportQueryDto) {
    const where = { organizationId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.generatedReport.findMany({ where, select: reportSelect, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.generatedReport.count({ where }),
    ]);
    return { items, meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } };
  }

  async detail(organizationId: string, id: string) {
    const report = await this.prisma.generatedReport.findFirst({ where: { id, organizationId }, select: reportSelect });
    if (!report) throw new NotFoundException('Отчёт не найден');
    return report;
  }
}
