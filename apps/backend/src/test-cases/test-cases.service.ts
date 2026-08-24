import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  MembershipRole,
  Prisma,
  TestCaseStatus,
  TestStepSection,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  BulkAction,
  BulkTestCasesDto,
  CreateFolderDto,
  CreateTestCaseDto,
  SaveTestCaseDto,
  TestCaseQueryDto,
  UpdateFolderDto,
  UpdateTestCaseDto,
} from "./test-cases.dto";

const caseSelect = {
  id: true,
  caseNumber: true,
  title: true,
  status: true,
  priority: true,
  severity: true,
  type: true,
  folderId: true,
  currentVersion: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TestCaseSelect;

@Injectable()
export class TestCasesService {
  constructor(private prisma: PrismaService) {}

  async folders(
    organizationId: string,
    projectId: string,
    userId: string,
    role: MembershipRole,
  ) {
    await this.project(organizationId, projectId, userId, role);
    const folders = await this.prisma.testCaseFolder.findMany({
      where: { projectId },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: { _count: { select: { testCases: true, children: true } } },
    });
    const own = new Map(
      folders.map((folder) => [folder.id, folder._count.testCases]),
    );
    const children = new Map<string, typeof folders>();
    for (const folder of folders)
      children.set(folder.parentId ?? "root", [
        ...(children.get(folder.parentId ?? "root") ?? []),
        folder,
      ]);
    const total = (id: string): number =>
      (own.get(id) ?? 0) +
      (children.get(id) ?? []).reduce((sum, child) => sum + total(child.id), 0);
    return folders.map((folder) => ({
      ...folder,
      _count: { ...folder._count, testCases: total(folder.id) },
    }));
  }

  async createFolder(
    organizationId: string,
    projectId: string,
    userId: string,
    role: MembershipRole,
    dto: CreateFolderDto,
  ) {
    await this.project(organizationId, projectId, userId, role);
    if (dto.parentId) await this.folder(projectId, dto.parentId);
    const last = await this.prisma.testCaseFolder.aggregate({
      where: { projectId, parentId: dto.parentId ?? null },
      _max: { position: true },
    });
    return this.prisma.testCaseFolder.create({
      data: {
        projectId,
        parentId: dto.parentId ?? null,
        name: dto.name.trim(),
        position: (last._max.position ?? -1) + 1,
      },
    });
  }

  async updateFolder(
    organizationId: string,
    projectId: string,
    userId: string,
    role: MembershipRole,
    id: string,
    dto: UpdateFolderDto,
  ) {
    await this.project(organizationId, projectId, userId, role);
    await this.folder(projectId, id);
    if (dto.parentId) {
      if (dto.parentId === id)
        throw new BadRequestException(
          "Папку нельзя переместить внутрь самой себя",
        );
      await this.folder(projectId, dto.parentId);
      await this.ensureNotDescendant(id, dto.parentId);
    }
    return this.prisma.testCaseFolder.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
      },
    });
  }

  async deleteFolder(
    organizationId: string,
    projectId: string,
    userId: string,
    role: MembershipRole,
    id: string,
  ) {
    await this.project(organizationId, projectId, userId, role);
    const current = await this.folder(projectId, id);
    const [children, cases] = await Promise.all([
      this.prisma.testCaseFolder.count({ where: { parentId: id } }),
      this.prisma.testCase.count({ where: { folderId: id } }),
    ]);
    if (children || cases)
      throw new ConflictException("Удалить можно только пустую папку");
    await this.prisma.testCaseFolder.delete({ where: { id: current.id } });
    return { success: true };
  }

  async list(
    organizationId: string,
    projectId: string,
    userId: string,
    role: MembershipRole,
    query: TestCaseQueryDto,
  ) {
    const project = await this.project(organizationId, projectId, userId, role);
    let folderIds: string[] | undefined;
    if (query.folderId) {
      await this.folder(projectId, query.folderId);
      folderIds = query.includeNested
        ? await this.descendantIds(projectId, query.folderId)
        : [query.folderId];
    }
    const where: Prisma.TestCaseWhereInput = {
      projectId,
      ...(folderIds ? { folderId: { in: folderIds } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { title: { contains: query.search.trim(), mode: "insensitive" } },
              ...(Number.isInteger(Number(query.search))
                ? [{ caseNumber: Number(query.search) }]
                : []),
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.testCase.findMany({
        where,
        select: caseSelect,
        orderBy: { caseNumber: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.testCase.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        ...item,
        displayId: this.displayId(project.code, item.caseNumber),
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  async create(
    organizationId: string,
    projectId: string,
    authorId: string,
    role: MembershipRole,
    dto: CreateTestCaseDto,
  ) {
    const project = await this.project(
      organizationId,
      projectId,
      authorId,
      role,
    );
    if (dto.folderId) await this.folder(projectId, dto.folderId);
    return this.prisma.$transaction(async (tx) => {
      const counter = await tx.project.update({
        where: { id: projectId },
        data: { nextTestCaseNumber: { increment: 1 } },
        select: { nextTestCaseNumber: true },
      });
      const caseNumber = counter.nextTestCaseNumber - 1;
      const item = await tx.testCase.create({
        data: {
          projectId,
          folderId: dto.folderId ?? null,
          caseNumber,
          title: dto.title.trim(),
          status: dto.status,
          priority: dto.priority,
          severity: dto.severity,
          type: dto.type,
          authorId,
          versions: {
            create: {
              version: 1,
              description: dto.description?.trim() || null,
              durationSeconds: dto.durationSeconds,
              createdById: authorId,
              steps: {
                create: this.sectionSteps(
                  dto.preconditionSteps,
                  dto.steps,
                  dto.postconditionSteps,
                ),
              },
            },
          },
        },
        select: caseSelect,
      });
      return { ...item, displayId: this.displayId(project.code, caseNumber) };
    });
  }

  async update(
    organizationId: string,
    id: string,
    userId: string,
    role: MembershipRole,
    dto: UpdateTestCaseDto,
  ) {
    const current = await this.case(organizationId, id, userId, role);
    if (dto.folderId) await this.folder(current.projectId, dto.folderId);
    return this.prisma.testCase.update({
      where: { id },
      data: { ...dto, ...(dto.title ? { title: dto.title.trim() } : {}) },
      select: caseSelect,
    });
  }

  async detail(
    organizationId: string,
    id: string,
    userId: string,
    role: MembershipRole,
  ) {
    const item = await this.prisma.testCase.findFirst({
      where: {
        id,
        project: {
          organizationId,
          ...(role === MembershipRole.ADMIN
            ? {}
            : { OR: [{ ownerId: userId }, { members: { some: { userId } } }] }),
        },
      },
      include: {
        project: { select: { id: true, code: true, name: true } },
        folder: { select: { id: true, name: true } },
        versions: {
          orderBy: { version: "desc" },
          include: {
            steps: { orderBy: [{ section: "asc" }, { position: "asc" }] },
          },
        },
      },
    });
    if (!item) throw new NotFoundException("Тест-кейс не найден");
    const current = item.versions.find(
      (version) => version.version === item.currentVersion,
    );
    return {
      ...item,
      displayId: this.displayId(item.project.code, item.caseNumber),
      currentVersionData: current,
    };
  }

  async save(
    organizationId: string,
    id: string,
    actorId: string,
    role: MembershipRole,
    dto: SaveTestCaseDto,
  ) {
    const current = await this.case(organizationId, id, actorId, role);
    if (dto.folderId) await this.folder(current.projectId, dto.folderId);
    return this.prisma.$transaction(async (tx) => {
      const versionNumber = dto.createNewVersion
        ? current.currentVersion + 1
        : current.currentVersion;
      if (dto.createNewVersion) {
        await tx.testCaseVersion.create({
          data: {
            testCaseId: id,
            version: versionNumber,
            description: dto.description?.trim() || null,
            durationSeconds: dto.durationSeconds,
            preconditions: dto.preconditions?.trim() || null,
            postconditions: dto.postconditions?.trim() || null,
            createdById: actorId,
            steps: {
              create: this.sectionSteps(
                dto.preconditionSteps,
                dto.steps,
                dto.postconditionSteps,
              ),
            },
          },
        });
      } else {
        const version = await tx.testCaseVersion.findUnique({
          where: {
            testCaseId_version: { testCaseId: id, version: versionNumber },
          },
        });
        if (!version)
          throw new NotFoundException("Текущая версия тест-кейса не найдена");
        await tx.testStep.deleteMany({ where: { versionId: version.id } });
        await tx.testCaseVersion.update({
          where: { id: version.id },
          data: {
            description: dto.description?.trim() || null,
            durationSeconds: dto.durationSeconds,
            preconditions: dto.preconditions?.trim() || null,
            postconditions: dto.postconditions?.trim() || null,
            steps: {
              create: this.sectionSteps(
                dto.preconditionSteps,
                dto.steps,
                dto.postconditionSteps,
              ),
            },
          },
        });
      }
      await tx.testCase.update({
        where: { id },
        data: {
          title: dto.title?.trim() ?? current.title,
          folderId: dto.folderId ?? current.folderId,
          status: dto.status ?? current.status,
          priority: dto.priority ?? current.priority,
          severity: dto.severity ?? current.severity,
          type: dto.type ?? current.type,
          currentVersion: versionNumber,
        },
      });
      return { id, currentVersion: versionNumber };
    });
  }

  async version(
    organizationId: string,
    id: string,
    userId: string,
    role: MembershipRole,
    versionNumber: number,
  ) {
    await this.case(organizationId, id, userId, role);
    const version = await this.prisma.testCaseVersion.findUnique({
      where: { testCaseId_version: { testCaseId: id, version: versionNumber } },
      include: {
        steps: { orderBy: [{ section: "asc" }, { position: "asc" }] },
      },
    });
    if (!version) throw new NotFoundException("Версия не найдена");
    return version;
  }

  async restore(
    organizationId: string,
    id: string,
    versionNumber: number,
    actorId: string,
    role: MembershipRole,
  ) {
    const item = await this.case(organizationId, id, actorId, role);
    const source = await this.version(
      organizationId,
      id,
      actorId,
      role,
      versionNumber,
    );
    const next = item.currentVersion + 1;
    await this.prisma.$transaction([
      this.prisma.testCaseVersion.create({
        data: {
          testCaseId: id,
          version: next,
          description: source.description,
          durationSeconds: source.durationSeconds,
          preconditions: source.preconditions,
          postconditions: source.postconditions,
          createdById: actorId,
          steps: {
            create: source.steps.map((step) => ({
              section: step.section,
              position: step.position,
              action: step.action,
              expectedResult: step.expectedResult,
            })),
          },
        },
      }),
      this.prisma.testCase.update({
        where: { id },
        data: { currentVersion: next },
      }),
    ]);
    return { id, currentVersion: next, restoredFrom: versionNumber };
  }

  async clone(
    organizationId: string,
    id: string,
    authorId: string,
    role: MembershipRole,
  ) {
    const source = await this.prisma.testCase.findFirst({
      where: {
        id,
        project: {
          organizationId,
          ...(role === MembershipRole.ADMIN
            ? {}
            : {
                OR: [
                  { ownerId: authorId },
                  { members: { some: { userId: authorId } } },
                ],
              }),
        },
      },
      include: { project: true },
    });
    if (!source) throw new NotFoundException("Тест-кейс не найден");
    const version = await this.prisma.testCaseVersion.findUnique({
      where: {
        testCaseId_version: { testCaseId: id, version: source.currentVersion },
      },
      include: {
        steps: { orderBy: [{ section: "asc" }, { position: "asc" }] },
      },
    });
    return this.prisma.$transaction(async (tx) => {
      const counter = await tx.project.update({
        where: { id: source.projectId },
        data: { nextTestCaseNumber: { increment: 1 } },
        select: { nextTestCaseNumber: true },
      });
      const caseNumber = counter.nextTestCaseNumber - 1;
      const item = await tx.testCase.create({
        data: {
          projectId: source.projectId,
          folderId: source.folderId,
          caseNumber,
          title: `${source.title} (копия)`,
          status: TestCaseStatus.DRAFT,
          priority: source.priority,
          severity: source.severity,
          type: source.type,
          authorId,
          versions: {
            create: {
              version: 1,
              description: version?.description,
              durationSeconds: version?.durationSeconds ?? 0,
              preconditions: version?.preconditions,
              postconditions: version?.postconditions,
              createdById: authorId,
              steps: {
                create:
                  version?.steps.map((step) => ({
                    section: step.section,
                    position: step.position,
                    action: step.action,
                    expectedResult: step.expectedResult,
                  })) ?? [],
              },
            },
          },
        },
        select: caseSelect,
      });
      return {
        ...item,
        displayId: this.displayId(source.project.code, caseNumber),
      };
    });
  }

  async bulk(
    organizationId: string,
    projectId: string,
    userId: string,
    role: MembershipRole,
    dto: BulkTestCasesDto,
  ) {
    await this.project(organizationId, projectId, userId, role);
    const found = await this.prisma.testCase.count({
      where: { id: { in: dto.ids }, projectId },
    });
    if (found !== dto.ids.length)
      throw new NotFoundException("Часть тест-кейсов не найдена");
    if (dto.action === BulkAction.DELETE) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.testCase.deleteMany({ where: { id: { in: dto.ids }, projectId } });
          const remaining = await tx.testCase.findMany({ where: { projectId }, orderBy: { caseNumber: "asc" }, select: { id: true, caseNumber: true } });
          for (let index = 0; index < remaining.length; index++) {
            const nextNumber = index + 1;
            if (remaining[index].caseNumber !== nextNumber)
              await tx.testCase.update({ where: { id: remaining[index].id }, data: { caseNumber: nextNumber } });
          }
          await tx.project.update({ where: { id: projectId }, data: { nextTestCaseNumber: remaining.length + 1 } });
        });
        return { affected: found };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2003"
        )
          throw new ConflictException(
            "Тест-кейс уже использован в запуске. Архивируйте его, чтобы сохранить историю",
          );
        throw error;
      }
    }
    if (dto.action === BulkAction.MOVE) {
      if (!dto.folderId)
        throw new BadRequestException("Не выбрана папка назначения");
      await this.folder(projectId, dto.folderId);
      await this.prisma.testCase.updateMany({
        where: { id: { in: dto.ids }, projectId },
        data: { folderId: dto.folderId },
      });
    }
    if (dto.action === BulkAction.ARCHIVE)
      await this.prisma.testCase.updateMany({
        where: { id: { in: dto.ids }, projectId },
        data: { status: TestCaseStatus.ARCHIVED },
      });
    if (dto.action === BulkAction.SET_PRIORITY) {
      if (!dto.priority) throw new BadRequestException("Не выбран приоритет");
      await this.prisma.testCase.updateMany({
        where: { id: { in: dto.ids }, projectId },
        data: { priority: dto.priority },
      });
    }
    if (dto.action === BulkAction.SET_STATUS) {
      if (!dto.status) throw new BadRequestException("Не выбран статус");
      await this.prisma.testCase.updateMany({
        where: { id: { in: dto.ids }, projectId },
        data: { status: dto.status },
      });
    }
    return { affected: found };
  }

  private async project(
    organizationId: string,
    id: string,
    userId: string,
    role: MembershipRole,
  ) {
    const item = await this.prisma.project.findFirst({
      where: {
        id,
        organizationId,
        ...(role === MembershipRole.ADMIN
          ? {}
          : { OR: [{ ownerId: userId }, { members: { some: { userId } } }] }),
      },
      select: { id: true, code: true },
    });
    if (!item) throw new NotFoundException("Проект не найден или нет доступа");
    return item;
  }
  private async folder(projectId: string, id: string) {
    const item = await this.prisma.testCaseFolder.findFirst({
      where: { id, projectId },
    });
    if (!item) throw new NotFoundException("Папка не найдена");
    return item;
  }
  private async case(
    organizationId: string,
    id: string,
    userId: string,
    role: MembershipRole,
  ) {
    const item = await this.prisma.testCase.findFirst({
      where: {
        id,
        project: {
          organizationId,
          ...(role === MembershipRole.ADMIN
            ? {}
            : { OR: [{ ownerId: userId }, { members: { some: { userId } } }] }),
        },
      },
    });
    if (!item)
      throw new NotFoundException("Тест-кейс не найден или нет доступа");
    return item;
  }
  private displayId(code: string, number: number) {
    return `${code}-TC-${String(number).padStart(4, "0")}`;
  }
  private sectionSteps(
    preconditions: Array<{ action: string; expectedResult: string }>,
    actions: Array<{ action: string; expectedResult: string }>,
    postconditions: Array<{ action: string; expectedResult: string }>,
  ) {
    const map = (
      steps: Array<{ action: string; expectedResult: string }>,
      section: TestStepSection,
    ) =>
      steps.map((step, index) => ({
        section,
        position: index + 1,
        action: step.action.trim(),
        expectedResult: step.expectedResult.trim(),
      }));
    return [
      ...map(preconditions ?? [], TestStepSection.PRECONDITION),
      ...map(actions ?? [], TestStepSection.ACTION),
      ...map(postconditions ?? [], TestStepSection.POSTCONDITION),
    ];
  }
  private async descendantIds(projectId: string, rootId: string) {
    const folders = await this.prisma.testCaseFolder.findMany({
      where: { projectId },
      select: { id: true, parentId: true },
    });
    const result = [rootId];
    for (let index = 0; index < result.length; index++)
      result.push(
        ...folders
          .filter((item) => item.parentId === result[index])
          .map((item) => item.id),
      );
    return result;
  }
  private async ensureNotDescendant(folderId: string, targetId: string) {
    let current: string | null = targetId;
    while (current) {
      if (current === folderId)
        throw new BadRequestException(
          "Папку нельзя переместить в собственную вложенную папку",
        );
      const parent: { parentId: string | null } | null =
        await this.prisma.testCaseFolder.findUnique({
          where: { id: current },
          select: { parentId: true },
        });
      current = parent?.parentId ?? null;
    }
  }
}
