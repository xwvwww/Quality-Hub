import { Controller, Delete, Get, Param, Post, Req, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MembershipRole } from '@prisma/client';
import { Request, Response } from 'express';
import { JwtUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { BufferedUpload, validateUploads } from '../security/upload-validation';
import { DefectAssetsService } from './defect-assets.service';

type AuthRequest = Request & { user: JwtUser };
const editors = [MembershipRole.ADMIN, MembershipRole.QA_LEAD, MembershipRole.QA_ENGINEER] as const;
const allowed = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain', 'application/json'] as const;

@Controller('defect-assets')
export class DefectAssetsController {
  constructor(private service: DefectAssetsService) {}
  @Get(':defectId') list(@Req() req: AuthRequest, @Param('defectId') id: string) { return this.service.list(req.user.organizationId, id); }
  @Get(':defectId/history') history(@Req() req: AuthRequest, @Param('defectId') id: string) { return this.service.history(req.user.organizationId, id); }
  @Post(':defectId')
  @Roles(...editors)
  @UseInterceptors(FilesInterceptor('files', 8, { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@Req() req: AuthRequest, @Param('defectId') id: string, @UploadedFiles() files: BufferedUpload[]) {
    validateUploads(files, allowed, 10 * 1024 * 1024);
    return this.service.upload(req.user.organizationId, id, req.user.sub, files);
  }
  @Get('files/:id') async file(@Req() req: AuthRequest, @Param('id') id: string, @Res() res: Response) {
    const file = await this.service.file(req.user.organizationId, id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(file.path);
  }
  @Delete('files/:id') @Roles(...editors) remove(@Req() req: AuthRequest, @Param('id') id: string) { return this.service.remove(req.user.organizationId, id); }
}
