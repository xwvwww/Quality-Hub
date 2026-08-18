import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtUser } from '../auth/auth.types';
import { CreateOrganizationDto, CreateSystemUserDto, ResetSystemUserPasswordDto, UpdateOrganizationDto, UpdateSystemProfileDto, UpdateSystemUserDto } from './system-admin.dto';
import { SystemAdminService } from './system-admin.service';
type AdminRequest = Request & { user: JwtUser };
@Controller('system-admin')
export class SystemAdminController {
  constructor(private service:SystemAdminService) {}
  private actor(request:AdminRequest) { if(!request.user.systemAdmin) throw new ForbiddenException('Требуются права системного администратора'); return request.user.sub; }
  @Get('stats') stats(@Req() r:AdminRequest){this.actor(r);return this.service.stats()}
  @Get('profile') profile(@Req() r:AdminRequest){return this.service.profile(this.actor(r))}
  @Patch('profile') updateProfile(@Req() r:AdminRequest,@Body() d:UpdateSystemProfileDto){return this.service.updateProfile(this.actor(r),d)}
  @Get('organizations') organizations(@Req() r:AdminRequest){this.actor(r);return this.service.organizations()}
  @Get('organizations/:id') organization(@Req() r:AdminRequest,@Param('id') id:string){this.actor(r);return this.service.organization(id)}
  @Post('organizations') createOrganization(@Req() r:AdminRequest,@Body() d:CreateOrganizationDto){return this.service.createOrganization(this.actor(r),d)}
  @Patch('organizations/:id') updateOrganization(@Req() r:AdminRequest,@Param('id') id:string,@Body() d:UpdateOrganizationDto){return this.service.updateOrganization(this.actor(r),id,d)}
  @Delete('organizations/:id') deleteOrganization(@Req() r:AdminRequest,@Param('id') id:string){return this.service.deleteOrganization(this.actor(r),id)}
  @Get('users') users(@Req() r:AdminRequest){this.actor(r);return this.service.users()}
  @Post('users') createUser(@Req() r:AdminRequest,@Body() d:CreateSystemUserDto){return this.service.createUser(this.actor(r),d)}
  @Patch('users/:id') updateUser(@Req() r:AdminRequest,@Param('id') id:string,@Body() d:UpdateSystemUserDto){return this.service.updateUser(this.actor(r),id,d)}
  @Delete('users/:id') disableUser(@Req() r:AdminRequest,@Param('id') id:string){return this.service.disableUser(this.actor(r),id)}
  @Post('users/:id/password') resetPassword(@Req() r:AdminRequest,@Param('id') id:string,@Body() d:ResetSystemUserPasswordDto){return this.service.resetPassword(this.actor(r),id,d.password)}
  @Get('sessions') sessions(@Req() r:AdminRequest){return this.service.sessions(this.actor(r))}
  @Delete('sessions/:id') revokeSession(@Req() r:AdminRequest,@Param('id') id:string){return this.service.revokeSession(this.actor(r),id)}
  @Get('notifications') notifications(@Req() r:AdminRequest){this.actor(r);return this.service.notifications()}
  @Get('audit') audit(@Req() r:AdminRequest){this.actor(r);return this.service.audit(false)}
  @Get('admin-audit') adminAudit(@Req() r:AdminRequest){this.actor(r);return this.service.audit(true)}
}
