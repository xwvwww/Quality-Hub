import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';
import { Request } from 'express';
import { JwtUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { AddPlanCasesDto, CreateTestPlanDto, TestPlanQueryDto, UpdateTestPlanDto } from './test-plans.dto';
import { TestPlansService } from './test-plans.service';

type AuthRequest = Request & { user: JwtUser }; const managers = [MembershipRole.ADMIN, MembershipRole.QA_LEAD] as const;
@ApiTags('test-plans') @ApiBearerAuth() @Controller('test-plans')
export class TestPlansController {
  constructor(private service: TestPlansService) {}
  @Get() list(@Req() req: AuthRequest, @Query() query: TestPlanQueryDto) { return this.service.list(req.user.organizationId, query); }
  @Get(':id') detail(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.detail(req.user.organizationId, id); }
  @Post() @Roles(...managers) create(@Req() req: AuthRequest, @Body() dto: CreateTestPlanDto) { return this.service.create(req.user.organizationId, req.user.sub, dto); }
  @Patch(':id') @Roles(...managers) update(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestPlanDto) { return this.service.update(req.user.organizationId, id, dto); }
  @Delete(':id') @Roles(...managers) remove(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.remove(req.user.organizationId, id); }
  @Post(':id/cases') @Roles(...managers) addCases(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AddPlanCasesDto) { return this.service.addCases(req.user.organizationId, id, dto); }
  @Delete(':id/cases/:testCaseId') @Roles(...managers) removeCase(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Param('testCaseId', ParseUUIDPipe) testCaseId: string) { return this.service.removeCase(req.user.organizationId, id, testCaseId); }
}
