import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MembershipRole, Prisma } from '@prisma/client';
import { Request } from 'express';
import { JwtUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../audit/request-context';
import { CreateDefectDto, DefectQueryDto, UpdateDefectDto } from './defects.dto';
import { DefectsService } from './defects.service';

type AuthRequest = Request & { user: JwtUser };
const editors = [MembershipRole.ADMIN, MembershipRole.QA_LEAD, MembershipRole.QA_ENGINEER] as const;

@ApiTags('defects') @ApiBearerAuth() @Controller('defects')
export class DefectsController {
  constructor(private service: DefectsService, private prisma: PrismaService) {}
  @Get() list(@Req() req: AuthRequest, @Query() query: DefectQueryDto) { return this.service.list(req.user.organizationId, query); }
  @Get(':id') get(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.get(req.user.organizationId, id); }
  @Post() @Roles(...editors)
  async create(@Req() req: AuthRequest, @Body() dto: CreateDefectDto) {
    const result = await this.service.create(req.user.organizationId, req.user.sub, dto);
    await this.prisma.auditLog.create({ data: { organizationId: req.user.organizationId, userId: req.user.sub, action: 'DEFECT_CREATED', entityType: 'DEFECT', entityId: result.id, metadata: { title: dto.title, status: 'OPEN' }, ipAddress: RequestContext.ip() } });
    return result;
  }
  @Patch(':id') @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD, MembershipRole.QA_ENGINEER, MembershipRole.DEVELOPER)
  async update(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDefectDto) {
    const before = await this.service.get(req.user.organizationId, id);
    const result = await this.service.update(req.user.organizationId, id, dto);
    const metadata = { before: { status: before.status, priority: before.priority, severity: before.severity, assigneeId: before.assigneeId }, after: JSON.parse(JSON.stringify(dto)) } as Prisma.InputJsonValue;
    await this.prisma.auditLog.create({ data: { organizationId: req.user.organizationId, userId: req.user.sub, action: 'DEFECT_UPDATED', entityType: 'DEFECT', entityId: id, metadata, ipAddress: RequestContext.ip() } });
    if (dto.assigneeId && dto.assigneeId !== before.assigneeId) await this.prisma.notification.create({ data: { userId: dto.assigneeId, title: 'Вам назначен дефект', body: `${before.displayId}: ${dto.title ?? before.title}`, url: `/defects/${id}` } });
    return result;
  }
  @Delete(':id') @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD)
  remove(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.remove(req.user.organizationId, id); }
}
