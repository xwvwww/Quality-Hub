import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddPlanCasesDto, CreateTestPlanDto, TestPlanQueryDto, UpdateTestPlanDto } from './test-plans.dto';

const planSelect = { id: true, projectId: true, name: true, description: true, authorId: true, startsAt: true, endsAt: true, environment: true, build: true, version: true, createdAt: true, project: { select: { id: true, code: true, name: true } }, _count: { select: { cases: true, runs: true } } } satisfies Prisma.TestPlanSelect;

@Injectable()
export class TestPlansService {
  constructor(private prisma: PrismaService) {}

  async list(organizationId: string, query: TestPlanQueryDto) {
    const where: Prisma.TestPlanWhereInput = { project: { organizationId }, ...(query.projectId ? { projectId: query.projectId } : {}), ...(query.search?.trim() ? { OR: [{ name: { contains: query.search.trim(), mode: 'insensitive' } }, { description: { contains: query.search.trim(), mode: 'insensitive' } }] } : {}) };
    const [items, total] = await this.prisma.$transaction([this.prisma.testPlan.findMany({ where, select: planSelect, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }), this.prisma.testPlan.count({ where })]);
    return { items, meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } };
  }

  async detail(organizationId: string, id: string) {
    const item = await this.prisma.testPlan.findFirst({ where: { id, project: { organizationId } }, include: { project: { select: { id: true, code: true, name: true } }, cases: { orderBy: { position: 'asc' }, include: { testCase: { select: { id: true, caseNumber: true, title: true, status: true, priority: true, severity: true, type: true, folderId: true, updatedAt: true } } } }, _count: { select: { runs: true } } } });
    if (!item) throw new NotFoundException('Тест-план не найден');
    return { ...item, cases: item.cases.map(entry => ({ ...entry, testCase: { ...entry.testCase, displayId: `${item.project.code}-TC-${String(entry.testCase.caseNumber).padStart(4, '0')}` } })) };
  }

  async create(organizationId: string, authorId: string, dto: CreateTestPlanDto) {
    await this.project(organizationId, dto.projectId); this.validateDates(dto.startsAt, dto.endsAt);
    return this.prisma.testPlan.create({ data: { projectId: dto.projectId, authorId, name: dto.name.trim(), description: dto.description?.trim() || null, startsAt: dto.startsAt ? new Date(dto.startsAt) : null, endsAt: dto.endsAt ? new Date(dto.endsAt) : null, environment: dto.environment?.trim() || null, build: dto.build?.trim() || null, version: dto.version?.trim() || null }, select: planSelect });
  }

  async update(organizationId: string, id: string, dto: UpdateTestPlanDto) {
    const current = await this.plan(organizationId, id); if (dto.projectId && dto.projectId !== current.projectId) throw new BadRequestException('Нельзя перенести тест-план в другой проект'); this.validateDates(dto.startsAt, dto.endsAt);
    return this.prisma.testPlan.update({ where: { id }, data: { ...(dto.name !== undefined ? { name: dto.name.trim() } : {}), ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}), ...(dto.startsAt !== undefined ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null } : {}), ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}), ...(dto.environment !== undefined ? { environment: dto.environment.trim() || null } : {}), ...(dto.build !== undefined ? { build: dto.build.trim() || null } : {}), ...(dto.version !== undefined ? { version: dto.version.trim() || null } : {}) }, select: planSelect });
  }

  async remove(organizationId: string, id: string) { await this.plan(organizationId, id); await this.prisma.testPlan.delete({ where: { id } }); return { success: true }; }

  async addCases(organizationId: string, id: string, dto: AddPlanCasesDto) {
    const plan = await this.plan(organizationId, id); let ids = dto.testCaseIds ?? [];
    if (dto.folderId) { const folder = await this.prisma.testCaseFolder.findFirst({ where: { id: dto.folderId, projectId: plan.projectId } }); if (!folder) throw new NotFoundException('Папка не найдена'); const folderIds = await this.descendants(plan.projectId, folder.id); const folderCases = await this.prisma.testCase.findMany({ where: { projectId: plan.projectId, folderId: { in: folderIds } }, select: { id: true } }); ids.push(...folderCases.map(item => item.id)); }
    if (dto.priority) { const priorityCases = await this.prisma.testCase.findMany({ where: { projectId: plan.projectId, priority: dto.priority }, select: { id: true } }); ids.push(...priorityCases.map(item => item.id)); }
    ids = [...new Set(ids)]; if (!ids.length) throw new BadRequestException('Не выбраны тест-кейсы');
    const valid = await this.prisma.testCase.findMany({ where: { id: { in: ids }, projectId: plan.projectId }, select: { id: true } }); if (valid.length !== ids.length) throw new NotFoundException('Часть тест-кейсов не найдена в проекте плана');
    const currentMax = await this.prisma.testPlanCase.aggregate({ where: { testPlanId: id }, _max: { position: true } }); const start = (currentMax._max.position ?? -1) + 1;
    await this.prisma.testPlanCase.createMany({ data: valid.map((item, index) => ({ testPlanId: id, testCaseId: item.id, position: start + index })), skipDuplicates: true });
    return this.detail(organizationId, id);
  }

  async removeCase(organizationId: string, id: string, testCaseId: string) { await this.plan(organizationId, id); await this.prisma.testPlanCase.deleteMany({ where: { testPlanId: id, testCaseId } }); return { success: true }; }

  private async plan(organizationId: string, id: string) { const item = await this.prisma.testPlan.findFirst({ where: { id, project: { organizationId } }, select: { id: true, projectId: true } }); if (!item) throw new NotFoundException('Тест-план не найден'); return item; }
  private async project(organizationId: string, id: string) { const item = await this.prisma.project.findFirst({ where: { id, organizationId } }); if (!item) throw new NotFoundException('Проект не найден'); return item; }
  private validateDates(start?: string, end?: string) { if (start && end && new Date(end) < new Date(start)) throw new BadRequestException('Дата окончания не может быть раньше даты начала'); }
  private async descendants(projectId: string, rootId: string) { const all = await this.prisma.testCaseFolder.findMany({ where: { projectId }, select: { id: true, parentId: true } }); const result = [rootId]; for (let index = 0; index < result.length; index++) result.push(...all.filter(item => item.parentId === result[index]).map(item => item.id)); return result; }
}
