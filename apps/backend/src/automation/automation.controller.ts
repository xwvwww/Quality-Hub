import { Body, Controller, Delete, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { Request } from 'express';
import { JwtUser } from '../auth/auth.types';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateApiKeyDto, IngestAutomationDto } from './automation.dto';
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
}
