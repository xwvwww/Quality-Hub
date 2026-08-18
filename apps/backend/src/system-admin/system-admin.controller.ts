import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtUser } from '../auth/auth.types';
import { CreateOrganizationDto, CreateSystemUserDto, UpdateSystemUserDto } from './system-admin.dto';
import { SystemAdminService } from './system-admin.service';
type R=Request&{user:JwtUser};
@Controller('system-admin') export class SystemAdminController { constructor(private s:SystemAdminService){} private check(r:R){if(!r.user.systemAdmin)throw new ForbiddenException('Требуются права системного администратора')}
  @Get('stats')stats(@Req()r:R){this.check(r);return this.s.stats()} @Get('organizations')organizations(@Req()r:R){this.check(r);return this.s.organizations()} @Post('organizations')createOrganization(@Req()r:R,@Body()d:CreateOrganizationDto){this.check(r);return this.s.createOrganization(r.user.sub,d)}
  @Get('users')users(@Req()r:R){this.check(r);return this.s.users()} @Post('users')createUser(@Req()r:R,@Body()d:CreateSystemUserDto){this.check(r);return this.s.createUser(r.user.sub,d)} @Patch('users/:id')updateUser(@Req()r:R,@Param('id')id:string,@Body()d:UpdateSystemUserDto){this.check(r);return this.s.updateUser(r.user.sub,id,d)} @Delete('users/:id')disableUser(@Req()r:R,@Param('id')id:string){this.check(r);return this.s.disableUser(r.user.sub,id)} @Get('audit')audit(@Req()r:R){this.check(r);return this.s.audit()}
}
