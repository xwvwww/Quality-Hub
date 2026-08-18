import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { JwtUser } from '../auth/auth.types';
import { ChangePasswordDto, UpdatePreferencesDto, UpdateProfileDto } from './profile.dto';
import { ProfileService } from './profile.service';
type AuthRequest = Request & { user: JwtUser };
@Controller('profile')
export class ProfileController {
  constructor(private service: ProfileService) {}
  @Get() get(@Req() req: AuthRequest) { return this.service.get(req.user.organizationId, req.user.sub); }
  @Get('preferences') preferencesGet(@Req() req: AuthRequest) { return this.service.preferences(req.user.sub); }
  @Patch('preferences') preferencesSave(@Req() req: AuthRequest, @Body() dto: UpdatePreferencesDto) { return this.service.preferences(req.user.sub, dto); }
  @Get('sessions') sessions(@Req() req: AuthRequest) { return this.service.sessions(req.user.sub); }
  @Delete('sessions/:id') revokeSession(@Req() req: AuthRequest, @Param('id') id: string) { return this.service.revokeSession(req.user.sub, id); }
  @Patch() update(@Req() req: AuthRequest, @Body() dto: UpdateProfileDto) { return this.service.update(req.user.organizationId, req.user.sub, dto.firstName, dto.lastName); }
  @Post('password') password(@Req() req: AuthRequest, @Body() dto: ChangePasswordDto) { return this.service.password(req.user.organizationId, req.user.sub, dto.currentPassword, dto.newPassword); }
  @Post('avatar') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } })) upload(@Req() req: AuthRequest, @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) { return this.service.upload(req.user.organizationId, req.user.sub, file); }
  @Get('avatar/:id') async avatar(@Req() req: AuthRequest, @Param('id') id: string, @Res() res: Response) { const file = await this.service.avatar(req.user.organizationId, id); res.setHeader('Content-Type', file.mimeType); return res.sendFile(file.path); }
}
