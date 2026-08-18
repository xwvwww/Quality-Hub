import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { EntityStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, ProjectQueryDto, UpdateProjectDto } from './projects.dto';

const projectSelect = {
  id: true, code: true, name: true, description: true, status: true,
  createdAt: true, updatedAt: true, ownerId: true,
  owner: { select: { id: true, firstName: true, lastName: true, email: true } },
  _count: { select: { members: true, testCases: true, testPlans: true, testRuns: true, defects: true } },
} satisfies Prisma.ProjectSelect;

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async list(organizationId: string, query: ProjectQueryDto) {
    const where: Prisma.ProjectWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search?.trim() ? { OR: [
        { name: { contains: query.search.trim(), mode: 'insensitive' } },
        { code: { contains: query.search.trim(), mode: 'insensitive' } },
        { description: { contains: query.search.trim(), mode: 'insensitive' } },
      ] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({ where, select: projectSelect, orderBy: { [query.sortBy]: query.sortOrder }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.project.count({ where }),
    ]);
    return { items, meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } };
  }

  async get(organizationId: string, id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, organizationId }, select: projectSelect });
    if (!project) throw new NotFoundException('Проект не найден');
    return project;
  }

  async create(organizationId: string, actorId: string, dto: CreateProjectDto) {
    const ownerId = dto.ownerId ?? actorId;
    await this.ensureMember(organizationId, ownerId);
    try {
      return await this.prisma.project.create({ data: { organizationId, ownerId, name: dto.name.trim(), code: dto.code, description: dto.description?.trim() || null }, select: projectSelect });
    } catch (error) { this.handleUnique(error); }
  }

  async update(organizationId: string, id: string, dto: UpdateProjectDto) {
    await this.get(organizationId, id);
    if (dto.ownerId) await this.ensureMember(organizationId, dto.ownerId);
    try {
      return await this.prisma.project.update({ where: { id }, data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      }, select: projectSelect });
    } catch (error) { this.handleUnique(error); }
  }

  async archive(organizationId: string, id: string) {
    await this.get(organizationId, id);
    return this.prisma.project.update({ where: { id }, data: { status: EntityStatus.ARCHIVED }, select: projectSelect });
  }

  async remove(organizationId: string, id: string) {
    await this.get(organizationId, id);
    await this.prisma.project.delete({ where: { id } });
    return { success: true };
  }

  private async ensureMember(organizationId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId, userId } } });
    if (!member) throw new UnprocessableEntityException('Владелец должен состоять в текущей организации');
  }

  private handleUnique(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Проект с таким кодом уже существует');
    throw error;
  }
}
