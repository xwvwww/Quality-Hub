import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';
import { Request, Response } from 'express';
import { JwtUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { BufferedUpload, validateUploads } from '../security/upload-validation';
import { AssignRunCaseDto, CreateTestRunDto, SaveTestResultDto, TestRunQueryDto } from './test-runs.dto';
import { TestRunsService } from './test-runs.service';

type AuthRequest = Request & { user: JwtUser };
const managers = [MembershipRole.ADMIN, MembershipRole.QA_LEAD] as const;
const executors = [MembershipRole.ADMIN, MembershipRole.QA_LEAD, MembershipRole.QA_ENGINEER] as const;

@ApiTags('test-runs') @ApiBearerAuth() @Controller('test-runs')
export class TestRunsController {
  constructor(private service: TestRunsService) {}
  @Get() list(@Req() req: AuthRequest, @Query() query: TestRunQueryDto) { return this.service.list(req.user.organizationId, query); }
  @Get('attachments/:attachmentId') async attachment(@Req() req: AuthRequest, @Param('attachmentId', ParseUUIDPipe) id: string, @Res() res: Response) {
    const file = await this.service.attachment(req.user.organizationId, id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(file.path);
  }
  @Get(':id') detail(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.detail(req.user.organizationId, id); }
  @Post() @Roles(...managers) create(@Req() req: AuthRequest, @Body() dto: CreateTestRunDto) { return this.service.create(req.user.organizationId, req.user.sub, dto); }
  @Post(':id/cases/:runCaseId/results') @Roles(...executors) result(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Param('runCaseId', ParseUUIDPipe) runCaseId: string, @Body() dto: SaveTestResultDto) { return this.service.saveResult(req.user.organizationId, id, runCaseId, req.user.sub, dto); }
  @Post(':id/cases/:runCaseId/attachments') @Roles(...executors) @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Param('runCaseId', ParseUUIDPipe) runCaseId: string, @UploadedFiles() files: BufferedUpload[]) {
    validateUploads(files, ['image/png', 'image/jpeg', 'image/webp'], 10 * 1024 * 1024);
    return this.service.upload(req.user.organizationId, id, runCaseId, req.user.sub, files);
  }
  @Patch(':id/cases/:runCaseId/assignee') @Roles(...managers) assign(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Param('runCaseId', ParseUUIDPipe) runCaseId: string, @Body() dto: AssignRunCaseDto) { return this.service.assign(req.user.organizationId, id, runCaseId, dto); }
  @Post(':id/complete') @Roles(...managers) complete(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.complete(req.user.organizationId, id); }
  @Delete(':id') @Roles(...managers) remove(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.remove(req.user.organizationId, id); }
}
