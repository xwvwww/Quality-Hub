import { Body, Controller, Delete, Get, Headers, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { Request } from 'express';
import { JwtUser } from '../auth/auth.types';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateApiKeyDto, CreateAutomationSuiteDto, IngestAutomationDto, UpdateAutomationRunDto } from './automation.dto';
import { AutomationService } from './automation.service';
type AuthRequest = Request & { user: JwtUser };
@Controller('automation')
export class AutomationController {
  constructor(private service: AutomationService) {}
  @Get('keys') @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD) keys(@Req() req: AuthRequest) { return this.service.keys(req.user.organizationId); }
  @Post('keys') @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD) create(@Req() req: AuthRequest, @Body() dto: CreateApiKeyDto) { return this.service.createKey(req.user.organizationId, req.user.sub, dto); }
  @Delete('keys/:id') @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD) revoke(@Req() req: AuthRequest, @Param('id') id: string) { return this.service.revoke(req.user.organizationId, req.user.sub, id); }
  @Public() @Post('results') ingest(@Headers('x-api-key') key: string | undefined, @Body() dto: IngestAutomationDto) { return this.service.ingest(key, dto); }
  @Get('results') results(@Req() req: AuthRequest, @Query('projectId') projectId?: string) { return this.service.results(req.user.organizationId, projectId); }
  @Get('suites') suites(@Req() req: AuthRequest, @Query('projectId') projectId?: string) { return this.service.suites(req.user.organizationId, projectId); }
  @Post('suites') @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD, MembershipRole.QA_ENGINEER) createSuite(@Req() req: AuthRequest, @Body() dto: CreateAutomationSuiteDto) { return this.service.createSuite(req.user.organizationId, req.user.sub, dto); }
  @Post('suites/:id/run') @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD, MembershipRole.QA_ENGINEER) trigger(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.trigger(req.user.organizationId, req.user.sub, id); }
  @Get('runs') runs(@Req() req: AuthRequest, @Query('projectId') projectId?: string) { return this.service.runs(req.user.organizationId, projectId); }
  @Public() @Post('agent/claim') claim(@Headers('x-api-key') key: string | undefined) { return this.service.claim(key); }
  @Public() @Post('agent/runs/:id') updateRun(@Headers('x-api-key') key: string | undefined, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAutomationRunDto) { return this.service.updateRun(key, id, dto); }
}
