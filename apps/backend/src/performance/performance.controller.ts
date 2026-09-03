import { BadRequestException, Body, Controller, Get, Headers, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MembershipRole } from '@prisma/client';
import { Request, Response } from 'express';
import { AutomationService } from '../automation/automation.service';
import { JwtUser } from '../auth/auth.types';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { PerformanceService } from './performance.service';
type AuthRequest = Request & { user: JwtUser };
const importers = [MembershipRole.ADMIN, MembershipRole.QA_LEAD, MembershipRole.QA_ENGINEER, MembershipRole.BUSINESS_ANALYST] as const;
@Controller('performance')
export class PerformanceController {
  constructor(private readonly service: PerformanceService, private readonly automation: AutomationService) {}
  @Public()
  @Post('jmeter/ci')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async ci(@Headers('x-api-key') rawKey: string | undefined, @UploadedFile() file: any, @Body() body: any, @Res({ passthrough: true }) response: Response) {
    const key = await this.automation.authenticateKey(rawKey);
    const result = await this.service.create(key.organizationId, key.createdById, { projectId: key.projectId, name: body.name || 'JMeter CI', environment: body.environment, build: body.build, sla: this.parseSla(body) }, file);
    await this.automation.markKeyUsed(key.id);
    if (!result.slaPassed) response.status(HttpStatus.UNPROCESSABLE_ENTITY);
    return { ...result, pipelineStatus: result.slaPassed ? 'passed' : 'failed', exitCode: result.slaPassed ? 0 : 1 };
  }
  @Post('jmeter/preview') @Roles(...importers)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  preview(@UploadedFile() file: any, @Body() body: any) { return this.service.preview(file, this.parseSla(body)); }
  @Post('jmeter/import') @Roles(...importers)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  create(@Req() req: AuthRequest, @UploadedFile() file: any, @Body() body: any) {
    return this.service.create(req.user.organizationId, req.user.sub, { projectId: body.projectId, testRunId: body.testRunId, name: body.name, environment: body.environment, build: body.build, sla: this.parseSla(body) }, file);
  }
  @Get() list(@Req() req: AuthRequest, @Query('projectId') projectId?: string) { return this.service.list(req.user.organizationId, projectId); }
  @Get(':id') detail(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.detail(req.user.organizationId, id); }
  private parseSla(body: any) {
    const value = { p95Ms: Number(body?.p95Ms ?? 1000), maxErrorRate: Number(body?.maxErrorRate ?? 1), minThroughput: Number(body?.minThroughput ?? 1) };
    if (!Number.isFinite(value.p95Ms) || value.p95Ms < 1 || !Number.isFinite(value.maxErrorRate) || value.maxErrorRate < 0 || value.maxErrorRate > 100 || !Number.isFinite(value.minThroughput) || value.minThroughput < 0) throw new BadRequestException('Некорректные SLA-пороги');
    return value;
  }
}
