import { Module } from '@nestjs/common';
import { GeneratedReportsController } from './generated-reports.controller';
import { GeneratedReportsService } from './generated-reports.service';
import { PlanReportsController } from './plan-reports.controller';
import { PlanReportsService } from './plan-reports.service';

@Module({ controllers: [PlanReportsController, GeneratedReportsController], providers: [PlanReportsService, GeneratedReportsService], exports: [PlanReportsService] })
export class PlanReportsModule {}
