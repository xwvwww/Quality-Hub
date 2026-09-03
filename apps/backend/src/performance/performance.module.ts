import { Module } from '@nestjs/common';
import { AutomationModule } from '../automation/automation.module';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
@Module({imports:[AutomationModule],controllers:[PerformanceController],providers:[PerformanceService]})
export class PerformanceModule{}
