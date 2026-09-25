import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { AutomationFramework, AutomationRunStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../audit/request-context';
import { CreateApiKeyDto, CreateAutomationSuiteDto, IngestAutomationDto, UpdateAutomationRunDto } from './automation.dto';

@Injectable()
export class AutomationService {
  constructor(private prisma: PrismaService) {}
  async keys(organizationId: string) { return this.prisma.automationApiKey.findMany({ where: { organizationId }, select: { id: true, projectId: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true }, orderBy: { createdAt: 'desc' } }); }
  async createKey(organizationId: string, userId: string, dto: CreateApiKeyDto) {
    if (!await this.prisma.project.findFirst({ where: { id: dto.projectId, organizationId } })) throw new NotFoundException('Проект не найден');
    const secret = `qh_${randomBytes(32).toString('hex')}`;
    const created = await this.prisma.automationApiKey.create({ data: { organizationId, projectId: dto.projectId, name: dto.name.trim(), keyHash: this.hash(secret), keyPrefix: secret.slice(0, 11), createdById: userId }, select: { id: true, projectId: true, name: true, keyPrefix: true, createdAt: true } });
    await this.prisma.auditLog.create({ data: { organizationId, userId, action: 'AUTOMATION_KEY_CREATED', entityType: 'AUTOMATION_API_KEY', entityId: created.id, metadata: { name: created.name, projectId: dto.projectId }, ipAddress: RequestContext.ip() } });
    return { ...created, secret };
  }
  async revoke(organizationId: string, userId: string, id: string) {
    const key = await this.prisma.automationApiKey.findFirst({ where: { id, organizationId, revokedAt: null } });
    if (!key) throw new NotFoundException('Активный API-ключ не найден');
    await this.prisma.$transaction([this.prisma.automationApiKey.update({ where: { id }, data: { revokedAt: new Date() } }), this.prisma.auditLog.create({ data: { organizationId, userId, action: 'AUTOMATION_KEY_REVOKED', entityType: 'AUTOMATION_API_KEY', entityId: id, ipAddress: RequestContext.ip() } })]);
    return { success: true };
  }
  async ingest(rawKey: string | undefined, dto: IngestAutomationDto) {
    const key = await this.authenticateKey(rawKey);
    if (!dto.results.length || dto.results.length > 1000) throw new BadRequestException('Допустимо от 1 до 1000 результатов за запрос');
    const created = await this.prisma.$transaction(async tx => {
      await tx.automationApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
      return Promise.all(dto.results.map(result => tx.automationResult.create({ data: { organizationId: key.organizationId, projectId: key.projectId, externalId: result.externalId, status: result.status, durationMs: result.durationMs, framework: result.framework, environment: result.environment, payload: (result.payload ?? {}) as Prisma.InputJsonValue } })));
    });
    return { accepted: created.length, projectId: key.projectId };
  }
  async results(organizationId: string, projectId?: string) { return this.prisma.automationResult.findMany({ where: { organizationId, ...(projectId ? { projectId } : {}) }, orderBy: { createdAt: 'desc' }, take: 200 }); }
  async suites(organizationId: string, projectId?: string) {
    return this.prisma.automationSuite.findMany({ where: { organizationId, ...(projectId ? { projectId } : {}) }, orderBy: { updatedAt: 'desc' }, include: { project: { select: { code: true, name: true } }, _count: { select: { runs: true } } } });
  }
  async createSuite(organizationId: string, userId: string, dto: CreateAutomationSuiteDto) {
    const project = await this.prisma.project.findFirst({ where: { id: dto.projectId, organizationId } });
    if (!project) throw new NotFoundException('Проект не найден');
    return this.prisma.automationSuite.create({ data: { organizationId, projectId: dto.projectId, createdById: userId, name: dto.name.trim(), framework: dto.framework, command: dto.command.trim(), repository: dto.repository?.trim() || null, branch: dto.branch?.trim() || null, environment: dto.environment?.trim() || null }, include: { project: { select: { code: true, name: true } }, _count: { select: { runs: true } } } });
  }
  async trigger(organizationId: string, userId: string, suiteId: string) {
    const suite = await this.prisma.automationSuite.findFirst({ where: { id: suiteId, organizationId, enabled: true } });
    if (!suite) throw new NotFoundException('Automation suite не найден');
    return this.prisma.automationRun.create({ data: { organizationId, projectId: suite.projectId, suiteId, requestedById: userId, framework: suite.framework, environment: suite.environment }, include: { suite: true } });
  }
  async runs(organizationId: string, projectId?: string) {
    return this.prisma.automationRun.findMany({ where: { organizationId, ...(projectId ? { projectId } : {}) }, orderBy: { createdAt: 'desc' }, take: 100, include: { suite: { select: { name: true, framework: true } }, project: { select: { code: true, name: true } } } });
  }
  async claim(rawKey: string | undefined) {
    const key = await this.authenticateKey(rawKey);
    const run = await this.prisma.automationRun.findFirst({ where: { projectId: key.projectId, status: AutomationRunStatus.QUEUED }, orderBy: { createdAt: 'asc' }, include: { suite: true } });
    if (!run) return null;
    const claimed = await this.prisma.automationRun.updateMany({ where: { id: run.id, status: AutomationRunStatus.QUEUED }, data: { status: AutomationRunStatus.RUNNING, startedAt: new Date() } });
    if (!claimed.count) return null;
    await this.prisma.automationApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    return this.prisma.automationRun.findUnique({ where: { id: run.id }, include: { suite: true } });
  }
  async updateRun(rawKey: string | undefined, runId: string, dto: UpdateAutomationRunDto) {
    const key = await this.authenticateKey(rawKey);
    const run = await this.prisma.automationRun.findFirst({ where: { id: runId, projectId: key.projectId } });
    if (!run) throw new NotFoundException('Запуск не найден');
    const finished = dto.status === AutomationRunStatus.PASSED
      || dto.status === AutomationRunStatus.FAILED
      || dto.status === AutomationRunStatus.CANCELLED;
    await this.prisma.automationApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    return this.prisma.automationRun.update({ where: { id: runId }, data: { ...dto, completedAt: finished ? new Date() : undefined }, include: { suite: true } });
  }
  async authenticateKey(rawKey: string | undefined) {
    if (!rawKey) throw new UnauthorizedException('Передайте API-ключ в заголовке X-API-Key');
    const key = await this.prisma.automationApiKey.findUnique({ where: { keyHash: this.hash(rawKey) } });
    if (!key || key.revokedAt) throw new UnauthorizedException('API-ключ недействителен');
    return key;
  }
  async markKeyUsed(id: string) { await this.prisma.automationApiKey.update({ where: { id }, data: { lastUsedAt: new Date() } }); }
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
}
