import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';
import { Request, Response } from 'express';
import { JwtUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { ImportsService } from './imports.service';

type AuthRequest = Request & { user: JwtUser };
const editors = [MembershipRole.ADMIN, MembershipRole.QA_LEAD, MembershipRole.QA_ENGINEER, MembershipRole.BUSINESS_ANALYST] as const;

@ApiTags('import-export')
@ApiBearerAuth()
@Controller('projects/:projectId/test-cases')
export class ImportsController {
  constructor(private service: ImportsService) {}

  @Post('import')
  @Roles(...editors)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  import(
    @Req() request: AuthRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('mode') mode: string,
    @Query('folderId') folderId: string | undefined,
    @UploadedFile() file: { originalname: string; mimetype: string; buffer: Buffer },
  ) {
    return this.service.import(request.user.organizationId, projectId, request.user.sub, file, mode === 'import', folderId);
  }

  @Get('export')
  async export(@Req() request: AuthRequest, @Param('projectId', ParseUUIDPipe) projectId: string, @Query('format') format: string, @Res() response: Response) {
    const output = await this.service.export(request.user.organizationId, projectId, format === 'csv' ? 'csv' : 'xlsx');
    response.setHeader('Content-Type', output.mime);
    response.setHeader('Content-Disposition', `attachment; filename="${output.name}"`);
    response.send(output.buffer);
  }

  @Get('import-template')
  async template(@Req() request: AuthRequest, @Param('projectId', ParseUUIDPipe) projectId: string, @Res() response: Response) {
    const output = await this.service.template(request.user.organizationId, projectId);
    response.setHeader('Content-Type', output.mime);
    response.setHeader('Content-Disposition', 'attachment; filename="test-cases-template.xlsx"');
    response.send(output.buffer);
  }
}
