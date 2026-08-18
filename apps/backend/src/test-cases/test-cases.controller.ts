import { Body, Controller, Delete, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';
import { Request } from 'express';
import { JwtUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { BulkTestCasesDto, CreateFolderDto, CreateTestCaseDto, SaveTestCaseDto, TestCaseQueryDto, UpdateFolderDto, UpdateTestCaseDto } from './test-cases.dto';
import { TestCasesService } from './test-cases.service';

type AuthRequest = Request & { user: JwtUser };
const editors = [MembershipRole.ADMIN, MembershipRole.QA_LEAD, MembershipRole.QA_ENGINEER] as const;

@ApiTags('test-case-repository')
@ApiBearerAuth()
@Controller()
export class TestCasesController {
  constructor(private service: TestCasesService) {}

  @Get('projects/:projectId/test-case-folders')
  folders(@Req() req: AuthRequest, @Param('projectId', ParseUUIDPipe) projectId: string) { return this.service.folders(req.user.organizationId, projectId); }

  @Post('projects/:projectId/test-case-folders')
  @Roles(...editors)
  createFolder(@Req() req: AuthRequest, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateFolderDto) { return this.service.createFolder(req.user.organizationId, projectId, dto); }

  @Patch('projects/:projectId/test-case-folders/:id')
  @Roles(...editors)
  updateFolder(@Req() req: AuthRequest, @Param('projectId', ParseUUIDPipe) projectId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFolderDto) { return this.service.updateFolder(req.user.organizationId, projectId, id, dto); }

  @Delete('projects/:projectId/test-case-folders/:id')
  @Roles(...editors)
  deleteFolder(@Req() req: AuthRequest, @Param('projectId', ParseUUIDPipe) projectId: string, @Param('id', ParseUUIDPipe) id: string) { return this.service.deleteFolder(req.user.organizationId, projectId, id); }

  @Get('projects/:projectId/test-cases')
  list(@Req() req: AuthRequest, @Param('projectId', ParseUUIDPipe) projectId: string, @Query() query: TestCaseQueryDto) { return this.service.list(req.user.organizationId, projectId, query); }

  @Post('projects/:projectId/test-cases')
  @Roles(...editors)
  create(@Req() req: AuthRequest, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: CreateTestCaseDto) { return this.service.create(req.user.organizationId, projectId, req.user.sub, dto); }

  @Post('projects/:projectId/test-cases/bulk')
  @Roles(...editors)
  bulk(@Req() req: AuthRequest, @Param('projectId', ParseUUIDPipe) projectId: string, @Body() dto: BulkTestCasesDto) { return this.service.bulk(req.user.organizationId, projectId, dto); }

  @Patch('test-cases/:id')
  @Roles(...editors)
  update(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestCaseDto) { return this.service.update(req.user.organizationId, id, dto); }

  @Get('test-cases/:id')
  detail(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.detail(req.user.organizationId, id); }

  @Post('test-cases/:id/save')
  @Roles(...editors)
  save(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SaveTestCaseDto) { return this.service.save(req.user.organizationId, id, req.user.sub, dto); }

  @Get('test-cases/:id/versions/:version')
  version(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Param('version', ParseIntPipe) version: number) { return this.service.version(req.user.organizationId, id, version); }

  @Post('test-cases/:id/versions/:version/restore')
  @Roles(...editors)
  restore(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Param('version', ParseIntPipe) version: number) { return this.service.restore(req.user.organizationId, id, version, req.user.sub); }

  @Post('test-cases/:id/clone')
  @Roles(...editors)
  clone(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.clone(req.user.organizationId, id, req.user.sub); }
}
