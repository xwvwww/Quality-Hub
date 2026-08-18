import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectMembersController } from './project-members.controller';
import { ProjectMembersService } from './project-members.service';

@Module({ controllers: [ProjectsController, ProjectMembersController], providers: [ProjectsService, ProjectMembersService] })
export class ProjectsModule {}
