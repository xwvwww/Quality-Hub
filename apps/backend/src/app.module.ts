import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { ProjectsModule } from './projects/projects.module';
import { TestCasesModule } from './test-cases/test-cases.module';
import { TestPlansModule } from './test-plans/test-plans.module';
import { TestRunsModule } from './test-runs/test-runs.module';
import { DefectsModule } from './defects/defects.module';
import { ReportsModule } from './reports/reports.module';
import './requirements/put.decorator';
import { RequirementsModule } from './requirements/requirements.module';
import { PlanReportsModule } from './plan-reports/plan-reports.module';
import { ImportsModule } from './imports/imports.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AutomationModule } from './automation/automation.module';
import { ProfileModule } from './profile/profile.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { CollaborationModule } from './collaboration/collaboration.module';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, UsersModule, OrganizationsModule, ProjectsModule, TestCasesModule, TestPlansModule, TestRunsModule, DefectsModule, ReportsModule, RequirementsModule, PlanReportsModule, ImportsModule, AnalyticsModule, AutomationModule, ProfileModule, WorkspaceModule, CollaborationModule], providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: RolesGuard }] })
export class AppModule {}
