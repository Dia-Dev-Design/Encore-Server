import { Injectable } from '@nestjs/common';
import { CompanyEntity } from './entities/company.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { OmitCreateProperties } from 'src/types/omit-createproperties';
import { UserEntity } from 'src/user/entities/user.entity';
import { CurrentStage, Prisma, UserCompanyRole } from '@prisma/client';
import { PaginationParams } from 'src/types/pagination';
import { CompanyFilterParamsDto } from 'src/companies/dto/company-filter-params';
import { PrismaQueryBuilder } from 'src/common/query/query-builder';
import { companyFilterConfig } from 'src/common/query/company-filter-config';
import { calcPagination } from '../utils/calc-pagination';
import {
  CompanyServicesEnum,
  CompanyStructureEnum,
  GetAllTabEnum,
} from './enums/comapanies.enum';
import {
  ChatbotLawyerReqStatusEnum,
  HasReqChatbotLawyerEnum,
} from '../chatbot/enums/chatbot.enum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CompaniesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(company: OmitCreateProperties<CompanyEntity>) {
    return this.prisma.company.create({ data: company });
  }

  async findManyCompannies(ids: string[], data: Prisma.CompanyWhereInput) {
    return await this.prisma.company.findMany({
      where: {
        id: { in: ids },
        ...data,
      },
    });
  }

  async updateCompanies(ids: string[], data: Prisma.CompanyUpdateInput) {
    await this.prisma.company.updateMany({
      where: { id: { in: ids } },
      data,
    });
  }

  async updateCompany(
    id: string,
    data: Prisma.CompanyUpdateInput,
    include: any,
  ) {
    await this.prisma.company.update({
      where: { id },
      data,
      include,
    });
  }

  getByOwnerAndId(owner: UserEntity, companyId: string) {
    return this.prisma.userCompany.findFirst({
      where: {
        companyId,
        userId: owner.id,
      },
      include: {
        Company: true,
        User: true,
      },
    });
  }

  getCompanyCountries(companyId: string) {
    return this.prisma.companyCountryLocation.findMany({
      where: {
        companyId,
      },
    });
  }

  getCompanyStates(companyId: string) {
    return this.prisma.companyStateLocation.findMany({
      where: {
        companyId,
      },
    });
  }

  getEmployeeStateLocations(companyId: string) {
    return this.prisma.companyW2EmployeeStateLocation.findMany({
      where: {
        companyId,
      },
    });
  }

  getEmployeeCountryLocations(companyId: string) {
    return this.prisma.companyEmployeeCountryLocation.findMany({
      where: {
        companyId,
      },
    });
  }

  async upsertEmployeeStateLocations(
    companyId: string,
    states: string[] | undefined,
  ) {
    if (!states) {
      return;
    }
    const existingStates =
      await this.prisma.companyW2EmployeeStateLocation.findMany({
        where: { companyId },
        select: { state: true },
      });

    const existingStateSet = new Set(
      existingStates.map((record) => record.state),
    );
    const newStateSet = new Set(states);

    const statesToInsert = states.filter(
      (state) => !existingStateSet.has(state),
    );
    const statesToDelete = existingStates
      .filter((record) => !newStateSet.has(record.state))
      .map((record) => record.state);

    await this.prisma.$transaction([
      this.prisma.companyW2EmployeeStateLocation.createMany({
        data: statesToInsert.map((state) => ({
          companyId,
          state,
        })),
      }),
      this.prisma.companyW2EmployeeStateLocation.deleteMany({
        where: {
          companyId,
          state: { in: statesToDelete },
        },
      }),
    ]);
  }

  async upsertEmployeeCountryLocations(
    companyId: string,
    countries?: string[],
  ) {
    if (!countries) {
      return;
    }
    const existingCountries =
      await this.prisma.companyEmployeeCountryLocation.findMany({
        where: { companyId },
        select: { country: true },
      });

    const existingCountrySet = new Set(
      existingCountries.map((record) => record.country),
    );
    const newCountrySet = new Set(countries);

    const countriesToInsert = countries.filter(
      (country) => !existingCountrySet.has(country),
    );
    const countriesToDelete = existingCountries
      .filter((record) => !newCountrySet.has(record.country))
      .map((record) => record.country);

    await this.prisma.$transaction([
      this.prisma.companyEmployeeCountryLocation.createMany({
        data: countriesToInsert.map((country) => ({
          companyId,
          country,
        })),
      }),
      this.prisma.companyEmployeeCountryLocation.deleteMany({
        where: {
          companyId,
          country: { in: countriesToDelete },
        },
      }),
    ]);
  }

  createWithUser(
    company: OmitCreateProperties<CompanyEntity>,
    user: UserEntity,
  ) {
    const rootFolderId = uuidv4();
    return this.prisma.$transaction(async (prisma) => {
      const newCompany = await prisma.company.create({
        data: {
          ...company,
          UserCompany: {
            create: {
              userId: user.id,
              role: UserCompanyRole.OWNER,
            },
          },
        },
      });
      const rootFolder = await prisma.folder.create({
        data: {
          id: rootFolderId,
          name: `${company.name} Root Folder`,
          companyId: newCompany.id,
        },
      });
      return prisma.company.update({
        where: { id: newCompany.id },
        data: { rootFolderId: rootFolder.id },
      });
    });
  }

  updateById(companyId: string, update: Partial<CompanyEntity>) {
    const updateData = update;

    if (updateData.structure in CompanyStructureEnum) {
      updateData.otherStructure = null;
    } else {
      updateData.otherStructure = updateData.structure;
      updateData.structure = null;
    }

    if (updateData.currentStage in CurrentStage) {
      updateData.otherStage = null;
    } else {
      updateData.currentStage = null;
      updateData.otherStage = updateData.currentStage;
    }

    return this.prisma.company.update({
      where: {
        id: companyId,
      },
      data: updateData,
    });
  }

  async upsertCompanyStates(companyId: string, states?: string[]) {
    if (!states) {
      return;
    }
    const existingStates = await this.prisma.companyStateLocation.findMany({
      where: { companyId },
      select: { state: true },
    });

    const existingStateSet = new Set(
      existingStates.map((record) => record.state),
    );
    const newStateSet = new Set(states);

    const statesToInsert = states.filter(
      (state) => !existingStateSet.has(state),
    );
    const statesToDelete = existingStates
      .filter((record) => !newStateSet.has(record.state))
      .map((record) => record.state);

    await this.prisma.$transaction([
      this.prisma.companyStateLocation.createMany({
        data: statesToInsert.map((state) => ({
          companyId,
          state,
        })),
      }),
      this.prisma.companyStateLocation.deleteMany({
        where: {
          companyId,
          state: { in: statesToDelete },
        },
      }),
    ]);
  }

  async upsertCompanyCountries(companyId: string, countries?: string[]) {
    if (!countries) {
      return;
    }
    const existingCountries = await this.prisma.companyCountryLocation.findMany(
      {
        where: { companyId },
        select: { country: true },
      },
    );

    const existingCountrySet = new Set(
      existingCountries.map((record) => record.country),
    );
    const newCountrySet = new Set(countries);

    const countriesToInsert = countries.filter(
      (country) => !existingCountrySet.has(country),
    );
    const countriesToDelete = existingCountries
      .filter((record) => !newCountrySet.has(record.country))
      .map((record) => record.country);

    await this.prisma.$transaction([
      this.prisma.companyCountryLocation.createMany({
        data: countriesToInsert.map((country) => ({
          companyId,
          country,
        })),
      }),
      this.prisma.companyCountryLocation.deleteMany({
        where: {
          companyId,
          country: { in: countriesToDelete },
        },
      }),
    ]);
  }

  deleteById(companyId: string) {
    return this.prisma.company.delete({
      where: {
        id: companyId,
      },
    });
  }

  getById(companyId: string, select?: Prisma.CompanySelect) {
    return this.prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select,
    });
  }

  async countCompanies(filters: CompanyFilterParamsDto) {
    const queryBuilder = new PrismaQueryBuilder<
      CompanyFilterParamsDto,
      Prisma.CompanyWhereInput
    >(companyFilterConfig);
    let filterConditions = queryBuilder.buildWhere(filters);

    filterConditions = this.additionalsFilters(filters, filterConditions);

    return this.prisma.company.count({ where: filterConditions });
  }

  async getCompanies(
    pagination: PaginationParams,
    filters: CompanyFilterParamsDto,
    orderBy: Prisma.CompanyOrderByWithRelationInput,
    select?: Prisma.CompanyFindManyArgs['select'],
  ) {
    const queryBuilder = new PrismaQueryBuilder<
      CompanyFilterParamsDto,
      Prisma.CompanyWhereInput
    >(companyFilterConfig);
    const skip = calcPagination(pagination.page, pagination.limit);
    let filterConditions = queryBuilder.buildWhere(filters);

    filterConditions = this.additionalsFilters(filters, filterConditions);

    // console.log({ filterConditions });

    return this.prisma.company.findMany<{
      where: Prisma.CompanyWhereInput;
      select: Prisma.CompanySelect;
      skip: number;
      take: number;
      orderBy: Prisma.CompanyOrderByWithRelationInput;
    }>({
      where: filterConditions,
      select,
      skip,
      take: pagination.limit ? Number(pagination.limit) : undefined,
      orderBy,
    });
  }

  private additionalsFilters(
    filters: CompanyFilterParamsDto,
    filterConditions: Prisma.CompanyWhereInput,
  ) {
    if (filters.tableType === GetAllTabEnum.PROSPECT) {
      filterConditions = {
        ...filterConditions,
        services: { none: {} },
      };
    }
    if (filters.tableType === GetAllTabEnum.DISSOLUTION) {
      filterConditions = {
        ...filterConditions,
        services: { some: { service: CompanyServicesEnum.DISSOLUTION } },
      };
    }
    if (filters.tableType === GetAllTabEnum.CHATBOT) {
      filterConditions = {
        ...filterConditions,
        services: { some: { service: CompanyServicesEnum.AI_CHATBOT } },
      };
    }

    if (filters.hasReqChatbotLawyer) {
      if (filters.hasReqChatbotLawyer === HasReqChatbotLawyerEnum.yes) {
        filterConditions = {
          ...filterConditions,
          ChatCompany: {
            lawyerReqStatus: {
              in: [
                ChatbotLawyerReqStatusEnum.requested,
                ChatbotLawyerReqStatusEnum.in_process,
                ChatbotLawyerReqStatusEnum.done,
              ],
            },
          },
        };
      }
      if (filters.hasReqChatbotLawyer === HasReqChatbotLawyerEnum.no) {
        filterConditions = {
          ...filterConditions,
          ChatCompany: {
            lawyerReqStatus: {
              in: [ChatbotLawyerReqStatusEnum.none],
            },
          },
        };
      }
    }

    if (filters.search) {
      filterConditions = {
        ...filterConditions,

        OR: [
          {
            name: { contains: filters.search, mode: 'insensitive' },
          },

          //TODO user asignado
          //{},
        ],
      };
    }

    return filterConditions;
  }

  async reassignCompanies(companyIds: string[], staffUserId: string) {
    return this.prisma.company.updateMany({
      where: {
        id: {
          in: companyIds,
        },
      },
      data: {
        assignedAdminId: staffUserId,
      },
    });
  }

  async addServiceToCompany(data: Prisma.CompanyServicesCreateManyInput[]) {
    await this.prisma.companyServices.createMany({ data });
  }

  async upsertService(
    companyId: string,
    service: CompanyServicesEnum,
    enabled: boolean,
  ) {
    await this.prisma.companyServices.upsert({
      where: {
        companyId_service: { companyId, service },
      },
      update: { enabled },
      create: { companyId, service, enabled },
    });
  }

  getSubsidiaries(companyId: string, select?: Prisma.CompanySelect) {
    return this.prisma.company.findMany({
      where: { parentCompanyId: companyId },
      select,
    });
  }

  async saveCompanyIntellectualProperty(
    data: Prisma.CompanyIntellectualPropertyCreateInput,
    companyId: string,
  ) {
    await this.prisma.companyIntellectualProperty.create({
      data,
    });
  }
}
