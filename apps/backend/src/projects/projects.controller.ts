import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';
import { Request } from 'express';
import { JwtUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { CreateProjectDto, ProjectQueryDto, UpdateProjectDto } from './projects.dto';
import { ProjectsService } from './projects.service';

type AuthRequest = Request & { user: JwtUser };

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Get()
  list(@Req() req: AuthRequest, @Query() query: ProjectQueryDto) { return this.projects.list(req.user.organizationId, req.user.sub, req.user.role, query); }

  @Get(':id')
  get(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.projects.get(req.user.organizationId, id, req.user.sub, req.user.role); }

  @Post()
  @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD)
  create(@Req() req: AuthRequest, @Body() dto: CreateProjectDto) { return this.projects.create(req.user.organizationId, req.user.sub, dto); }

  @Patch(':id')
  @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD)
  update(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectDto) { return this.projects.update(req.user.organizationId, id, dto, req.user.sub, req.user.role); }

  @Post(':id/archive')
  @Roles(MembershipRole.ADMIN, MembershipRole.QA_LEAD)
  archive(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.projects.archive(req.user.organizationId, id, req.user.sub, req.user.role); }

  @Delete(':id')
  @Roles(MembershipRole.ADMIN)
  remove(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.projects.remove(req.user.organizationId, id, req.user.sub, req.user.role); }
}
