import { Module } from '@nestjs/common';
import { GeneratedReportsController } from './generated-reports.controller';
import { GeneratedReportsService } from './generated-reports.service';
import { GeneratedReportsWorker } from './generated-reports.worker';
import { PlanReportsController } from './plan-reports.controller';
import { PlanReportsService } from './plan-reports.service';
import { ReportDocumentBuilder } from './report-document.builder';

@Module({
  controllers: [PlanReportsController, GeneratedReportsController],
  providers: [PlanReportsService, GeneratedReportsService, ReportDocumentBuilder, GeneratedReportsWorker],
  exports: [PlanReportsService],
})
export class PlanReportsModule {}
