import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../audit/request-context';
import { CreateApiKeyDto, IngestAutomationDto } from './automation.dto';

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
    if (!rawKey) throw new UnauthorizedException('Передайте API-ключ в заголовке X-API-Key');
    const key = await this.prisma.automationApiKey.findUnique({ where: { keyHash: this.hash(rawKey) } });
    if (!key || key.revokedAt) throw new UnauthorizedException('API-ключ недействителен');
    if (!dto.results.length || dto.results.length > 1000) throw new BadRequestException('Допустимо от 1 до 1000 результатов за запрос');
    const created = await this.prisma.$transaction(async tx => {
      await tx.automationApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
      return Promise.all(dto.results.map(result => tx.automationResult.create({ data: { organizationId: key.organizationId, projectId: key.projectId, externalId: result.externalId, status: result.status, durationMs: result.durationMs, framework: result.framework, environment: result.environment, payload: (result.payload ?? {}) as Prisma.InputJsonValue } })));
    });
    return { accepted: created.length, projectId: key.projectId };
  }
  async results(organizationId: string, projectId?: string) { return this.prisma.automationResult.findMany({ where: { organizationId, ...(projectId ? { projectId } : {}) }, orderBy: { createdAt: 'desc' }, take: 200 }); }
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
}
