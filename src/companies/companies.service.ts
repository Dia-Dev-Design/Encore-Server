import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompaniesRepository } from './companies.repository';
import { CompanyFilterParamsDto } from './dto/company-filter-params';
import { GetCompaniesDto, Company } from './dto/get-companies.dto';
import { StaffUserRepository } from 'src/user/repositories/staff-service-user.repository';
import {
  CompanyIntellectualPropertyTypeEnum,
  CompanyServicesEnum,
  CompanyStructureEnum,
  GetAllTabEnum,
} from './enums/comapanies.enum';
import { TasksRepository } from '../tasks/repository/task.repository';
import { ChatbotLawyerReqStatusEnum } from '../chatbot/enums/chatbot.enum';
import { SortOrderEnum } from '../utils/enums/utils.enums';
import {
  CompanySortObject,
  CompanySortOptions,
} from './enums/companies-sort.enum';
import {
  ChatCompany,
  CompanyStructure,
  Prisma,
  UserCompanyRole,
} from '@prisma/client';

import {
  ChangeCompanyClientTypeDto,
  ReassignCompaniesDto,
} from './dto/edit-companies.dto';
import { CompanyMeetingParamsDto } from './dto/company-meeting-params';
import { GetMeetingsDto, MeetingDto } from './dto/get-meetings.dto';
import { MeetingsRepository } from 'src/meetings/meetings.repository';
import { MeetingsPlatform } from 'src/meetings/enums/meetings-platform.enum';
import { ActivateDeactivateServiceDto } from './dto/activate-deactivate-service.dto';
import { BasicCompanyInfoDto } from './dto/get-company-info.dto';
import { StateIsoCode } from 'src/registration/dto/step1.dto';
import { SubsidiaryDto } from './dto/get-subsidiaries.dto';
import {
  CompanyIntakeCallDto,
  IntakeCallResDto,
} from './dto/company-intake-call.dto';
import { USStates } from '../utils/data/states';
import { countries } from '../utils/data/country';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { TasksService } from '../tasks/services/tasks.service';

interface UserCompanyWithUser {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  companyId: string;
  userId: string;
  role: UserCompanyRole;
  User: {
    phoneNumber: string;
    email: string;
    name: string;
  };
}

@Injectable()
export class CompaniesService {
  constructor(
    private readonly companiesRepository: CompaniesRepository,
    private readonly staffUserRepository: StaffUserRepository,
    private readonly taskRepository: TasksRepository,
    private readonly taskServide: TasksService,
    private readonly meetingsRepository: MeetingsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getCompanyById(companyId: string) {
    const company = await this.companiesRepository.getById(companyId);
    return company;
  }

  async getCompanies(
    filters: CompanyFilterParamsDto,
  ): Promise<GetCompaniesDto> {
    const { page, limit, tableType } = filters;

    // switch (filters.tableType) {
    //   case GetAllTabEnum.PROSPECT:
    //     filters.hasCompletedSetup = true;
    //     filters.hasBeenEvaluated = false;
    //     break;
    //   case GetAllTabEnum.DISSOLUTION:
    //     filters.hasCompletedSetup = true;
    //     filters.hasBeenEvaluated = true;
    //     break;
    //   case GetAllTabEnum.CHATBOT:
    //     //TODO: implement chatbot filter
    //     break;
    // }

    const companies = await this.companiesRepository.getCompanies(
      { page, limit },
      filters,
      this.getOrderBy(filters.sortOption, filters.sortOrder),
      {
        id: true,
        name: true,
        currentStage: true,
        status: true,
        otherStage: true,
        hasPaidTheFee: true,
        AssignedAdmin: true,
        CompanyStateLocation: {
          select: {
            state: true,
          },
        },
        ChatCompany: {
          include: { ChatThread: true },
        },
        services: true,
        createdAt: true,
        updatedAt: true,
      },
    );
    const totalItems = await this.companiesRepository.countCompanies(filters);
    const totalPages = Math.ceil(totalItems / limit);

    const mappedCompanies: Company[] = [];
    for (const company of companies) {
      const assignedTo = company.AssignedAdmin
        ? { id: company.AssignedAdmin.id, name: company.AssignedAdmin.name }
        : null;

      //chatbot

      const chatbot = this.getChatBot(company.ChatCompany);

      mappedCompanies.push({
        id: company.id,
        key: company.id,
        name: company.name,
        status: company.status,
        currentStage: company.currentStage,
        assignedTo,
        //TODO: find out how to get the progress ? total tasks / completed tasks ?
        progress: Math.random() * 100,
        states: company.CompanyStateLocation.map((state) => state.state),
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        services: company.services.map((e) => e.service),
        //TODO complete related task to the company. Review step-task relation(?
        task:
          tableType === GetAllTabEnum.DISSOLUTION
            ? await this.taskRepository.findLastTaskByCompanyId(company.id)
            : null,

        //chatbotData
        ...chatbot,
      });
    }

    return {
      data: mappedCompanies,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
        offset: page,
      },
    };
  }

  private getChatBot(chatbot: ChatCompany) {
    if (!chatbot) {
      return {
        chatbotStatus: ChatbotLawyerReqStatusEnum.none,
        chatbotDate: null,
        chatbotLastTopic: 'No topic yet',
        chatbotHasRequest: false,
      };
    }

    const chatbotStatus =
      chatbot.lawyerReqStatus || ChatbotLawyerReqStatusEnum.none;
    const chatbotDate = chatbot.createdAt;
    const chatbotHasRequest = [
      ChatbotLawyerReqStatusEnum.done.toString(),
      ChatbotLawyerReqStatusEnum.in_process.toString(),
      ChatbotLawyerReqStatusEnum.requested.toString(),
    ].some((status) => status === chatbotStatus);

    let chatbotLastTopic = 'No topic yet';
    if (chatbot['ChatThread']) {
      chatbotLastTopic = chatbot['ChatThread'][0]?.title || 'No topic yet';
    }

    return { chatbotStatus, chatbotDate, chatbotLastTopic, chatbotHasRequest };
  }
  private getOrderBy(
    sortType: CompanySortOptions,
    sortOrder: SortOrderEnum,
  ): Prisma.CompanyOrderByWithRelationInput {
    if (
      [
        CompanySortOptions.location,
        CompanySortOptions.taskDescription,
        CompanySortOptions.progress,
      ].includes(sortType)
    ) {
      return {
        createdAt: sortOrder,
      };
    }

    if (sortType === CompanySortOptions.assignedToName) {
      return { AssignedAdmin: { name: sortOrder } };
    }

    //chatbot
    if (sortType === CompanySortOptions.chatbotDate) {
      return { ChatCompany: { createdAt: sortOrder } };
    }
    if (sortType === CompanySortOptions.chatbotStatus) {
      return { ChatCompany: { lawyerReqStatus: sortOrder } };
    }
    /* TODO with raw sql (rewrite all)
      - chatbot topic
      - chatbot has request lawyer
      - company state (location)
      - task description
      - progress (dissolution plan - complete tasks)
    */

    const sortObj: Prisma.CompanyOrderByWithRelationInput = {};
    sortObj[CompanySortObject[sortType]] = sortOrder;

    return sortObj;
  }

  async reassignCompanies(payload: ReassignCompaniesDto) {
    payload.companyIds = [...new Set(payload.companyIds)];

    const staffUser = await this.staffUserRepository.findById(
      payload.staffUserId,
    );
    if (!staffUser) {
      throw new NotFoundException('Staff user not found');
    }

    await this.companiesRepository.reassignCompanies(
      payload.companyIds,
      payload.staffUserId,
    );

    return {
      message: 'Companies successfully reassigned',
      reassignedCount: payload.companyIds.length,
    };
  }

  async changeCompaniesTypes(payload: ChangeCompanyClientTypeDto) {
    payload.companyIds = [...new Set(payload.companyIds)];

    if (!Object.values(CompanyServicesEnum).includes(payload.serviceType)) {
      throw new NotFoundException('Service not found');
    }

    let companies = await this.companiesRepository.findManyCompannies(
      payload.companyIds,
      {},
    );

    if (payload.companyIds.length !== companies.length) {
      throw new BadRequestException('Company not found');
    }

    //companies without the service
    companies = await this.companiesRepository.findManyCompannies(
      payload.companyIds,
      {
        services: {
          none: { service: { equals: payload.serviceType } },
        },
      },
    );

    const toChange = companies.map((e) => e.id);

    await this.companiesRepository.updateCompanies(toChange, {
      hasPaidTheFee: true,
    });

    const data: Prisma.CompanyServicesCreateManyInput[] = [];
    for (const company of companies) {
      data.push({
        companyId: company.id,
        service: payload.serviceType,
      });

      if (payload.serviceType === CompanyServicesEnum.AI_CHATBOT) {
        const chatCompany = await this.prisma.chatCompany.findFirst({
          where: {
            companyId: company.id,
          },
        });

        if (!chatCompany) {
          await this.prisma.chatCompany.create({
            data: {
              companyId: company.id,
              lawyerReqStatus: ChatbotLawyerReqStatusEnum.none,
            },
          });
        }
      }
    }

    await this.companiesRepository.addServiceToCompany(data);

    return {
      message: 'Companies successfully reassigned',
      reassignedCount: payload.companyIds.length,
    };
  }

  async getMeetings(
    companyId: string,
    query: CompanyMeetingParamsDto,
  ): Promise<GetMeetingsDto> {
    const { page, limit, sortOption, sortOrder } = query;

    const meetings = await this.meetingsRepository.getMeetingsByCompanyId(
      companyId,
      { page, limit },
      sortOption,
      sortOrder,
    );

    const totalItems =
      await this.meetingsRepository.countMeetingsByCompanyId(companyId);
    const totalPages = Math.ceil(totalItems / limit);

    const allMeetings =
      await this.meetingsRepository.getAllMeetingsByCompanyId(companyId);

    const mappedMeetings: MeetingDto[] = meetings.map((meeting) => {
      const meetingIndex = allMeetings.findIndex((m) => m.id === meeting.id);
      const meetingType =
        meetingIndex === 0 ? 'First Call' : `Follow Up ${meetingIndex}`;

      return {
        id: meeting.id,
        date: meeting.date,
        joinUrl: meeting.joinUrl,
        time: meeting.date,
        status: meeting.status,
        meetingType: meetingType,
        platform: MeetingsPlatform.GOOGLE_MEET,
      };
    });

    return {
      data: mappedMeetings,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
        offset: page,
      },
    };
  }

  async activateDeactivateService(
    companyId: string,
    payload: ActivateDeactivateServiceDto,
  ) {
    const { service, enabled } = payload;

    await this.companiesRepository.upsertService(companyId, service, enabled);

    return {
      service,
      enabled,
    };
  }

  async getCompanyInfo(companyId: string): Promise<BasicCompanyInfoDto> {
    const company = await this.companiesRepository.getById(companyId, {
      id: true,
      Industry: { select: { name: true, id: true } },
      AssignedAdmin: { select: { name: true, id: true } },
      CompanyStateLocation: { select: { state: true } },
      CompanyCountryLocation: { select: { country: true } },
      UserCompany: {
        where: { role: UserCompanyRole.OWNER },
        select: {
          User: { select: { phoneNumber: true, email: true, name: true } },
        },
      },
      currentStage: true,
      services: true,
      name: true,
      rootFolderId: true,
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    let companyType: GetAllTabEnum;

    if (
      company.services.some(
        (service) => service.service === CompanyServicesEnum.DISSOLUTION,
      )
    ) {
      companyType = GetAllTabEnum.DISSOLUTION;
    } else if (
      company.services.some(
        (service) => service.service === CompanyServicesEnum.AI_CHATBOT,
      )
    ) {
      companyType = GetAllTabEnum.CHATBOT;
    } else {
      companyType = GetAllTabEnum.PROSPECT;
    }

    const mappedCompanyServices = company.services
      ? company?.services?.map((service) => ({
          id: service.id,
          name: service.service as CompanyServicesEnum,
          enabled: service.enabled,
        }))
      : [];

    const allServices = Object.values(CompanyServicesEnum);
    const missingServices = allServices.filter(
      (service) => !mappedCompanyServices.some((s) => s.name === service),
    );
    const missingServicesData = missingServices.map((service) => ({
      id: service,
      name: service,
      enabled: false,
    }));
    const mappedServices = [...mappedCompanyServices, ...missingServicesData];

    const companyInfo: BasicCompanyInfoDto = {
      id: company.id,
      name: company.name,
      type: companyType,
      contactName: (company.UserCompany[0] as unknown as UserCompanyWithUser)
        .User?.name,
      emailAddress: (company.UserCompany[0] as unknown as UserCompanyWithUser)
        .User?.email,
      phone: (company.UserCompany[0] as unknown as UserCompanyWithUser).User
        ?.phoneNumber,
      industryType: {
        id: company.Industry.id,
        name: company.Industry.name,
      },
      states: company.CompanyStateLocation.map(
        (state) => state.state as StateIsoCode,
      ),
      otherCountries: company.CompanyCountryLocation.map(
        (country) => country.country,
      ),
      currentStage: company.currentStage,
      services: mappedServices,
      rootFolderId: company.rootFolderId,
    };

    return companyInfo;
  }

  async getSubsidiaries(companyId: string): Promise<SubsidiaryDto[]> {
    const subsidiaries = await this.companiesRepository.getSubsidiaries(
      companyId,
      {
        id: true,
        name: true,
      },
    );
    return subsidiaries;
  }

  async getIntakeCallformInfo(companyId: string) {
    const company = await this.companiesRepository.getById(companyId, {
      structure: true,
      otherStructure: true,
      hasRaisedCapital: true,
      hasW2Employees: true,
      areEmployeesInBargainingAgreements: true,
      employeesInBargainingAgreementsDetails: true,
      estatePropertyOrEquipmentDetails: true,
      CompanyFinancialDetails: true,
      CompanyIntellectualProperty: true,
      CompanyW2EmployeeStateLocation: true,
      CompanyCountryLocation: true,
    });

    if (!company) throw new NotFoundException('Company not found');

    const pendingIPApplicationDetails =
      company?.CompanyIntellectualProperty?.pendingIPApplicationDetails || null;
    const hasIntellectualProperty =
      company?.CompanyIntellectualProperty?.hasIntellectualProperty || false;

    const estatePropertyOrEquipmentDetails =
      company.estatePropertyOrEquipmentDetails;

    const financialObligationsDetails =
      company?.CompanyFinancialDetails?.financialObligationsDetails || null;
    const intendToHaveAssetDetails =
      company?.CompanyFinancialDetails?.intendToHaveAssetDetails || null;
    const ongoingNegotationsForSaleDetails =
      company?.CompanyFinancialDetails?.ongoingNegotationsForSaleDetails ||
      null;
    const hasReceivedOffersDetails =
      company?.CompanyFinancialDetails?.hasReceivedOffersDetails || null;

    //employees
    let country = null;
    if (company.CompanyCountryLocation.length > 0) {
      country = company.CompanyCountryLocation[0];
    }

    const res: IntakeCallResDto = {
      //A section
      structure: company.structure,
      otherStructure: company.otherStructure,
      hasRaisedCapital: company.hasRaisedCapital,
      hasW2Employees: company.hasW2Employees,
      stateW2Employees:
        company.CompanyW2EmployeeStateLocation[0]?.state || null,
      hasSubsidiaries: company.hasSubsidiaries,
      hasOperationOutsideUS: country ? true : false,
      countryOperationOutsideUS: country?.country || null,
      //B section
      hasIntellectualProperty,
      intellectualProperty:
        company.CompanyIntellectualProperty?.intellectualProperty || [],
      hasPendingIPApplication: pendingIPApplicationDetails ? true : false,
      pendingIPApplicationDetails,
      //C section
      areEmployeesInBargainingAgreements:
        company.areEmployeesInBargainingAgreements,
      employeesInBargainingAgreementsDetails:
        company.employeesInBargainingAgreementsDetails,
      //D section
      hasEstatePropertyOrEquipment: estatePropertyOrEquipmentDetails
        ? true
        : false,
      estatePropertyOrEquipmentDetails,
      //E section
      hasFinancialObligations: financialObligationsDetails ? true : false,
      financialObligationsDetails,

      hasIntendToHaveAsset: intendToHaveAssetDetails ? true : false,
      intendToHaveAssetDetails,
      hasOngoingNegotationsForSale: ongoingNegotationsForSaleDetails
        ? true
        : false,
      ongoingNegotationsForSaleDetails,
      hasReceivedOffers: hasReceivedOffersDetails ? true : false,
      hasReceivedOffersDetails,
    };

    return res;
  }

  async updateIntakeCallForm(payload: CompanyIntakeCallDto, companyId: string) {
    const company = await this.companiesRepository.getById(companyId, {
      structure: true,
      otherStructure: true,
      hasRaisedCapital: true,
      hasW2Employees: true,
      areEmployeesInBargainingAgreements: true,
      employeesInBargainingAgreementsDetails: true,
      estatePropertyOrEquipmentDetails: true,
      CompanyFinancialDetails: true,
      CompanyIntellectualProperty: true,
      CompanyW2EmployeeStateLocation: true,
      CompanyCountryLocation: true,
    });
    if (!company) throw new NotFoundException('Company not found');

    //validations
    this.validateUpdateIntakeCall(payload);

    //Company

    //B section -> B. Intellectual Property

    const dataToSave: Prisma.CompanyUpdateInput = {
      structure: payload.structure,
      otherStructure: payload.otherStructure,
      hasRaisedCapital: payload.hasRaisedCapital,
      hasW2Employees: payload.hasW2Employees,
      hasSubsidiaries: payload.hasSubsidiaries,
      areEmployeesInBargainingAgreements:
        payload.areEmployeesInBargainingAgreements,
      employeesInBargainingAgreementsDetails:
        payload.employeesInBargainingAgreementsDetails,
      estatePropertyOrEquipmentDetails:
        payload.estatePropertyOrEquipmentDetails,
      CompanyIntellectualProperty: {
        upsert: {
          create: {
            hasIntellectualProperty: payload.hasIntellectualProperty,
            intellectualProperty:
              payload.intellectualProperty as unknown as Prisma.JsonArray,
            pendingIPApplicationDetails: payload.pendingIPApplicationDetails,
          },
          update: {
            hasIntellectualProperty: payload.hasIntellectualProperty,
            intellectualProperty:
              payload.intellectualProperty as unknown as Prisma.JsonArray,
          },
        },
      },
      CompanyFinancialDetails: {
        upsert: {
          create: {
            hasReceivedOffersDetails: payload.hasReceivedOffersDetails,
            financialObligationsDetails: payload.finalcianObligationsDetails,
            intendToHaveAssetDetails: payload.intendToHaveAssetDetails,
            ongoingNegotationsForSaleDetails:
              payload.ongoingNegotationsForSaleDetails,
          },
          update: {
            hasReceivedOffersDetails: payload.hasReceivedOffersDetails,
            financialObligationsDetails: payload.finalcianObligationsDetails,
            intendToHaveAssetDetails: payload.intendToHaveAssetDetails,
            ongoingNegotationsForSaleDetails:
              payload.ongoingNegotationsForSaleDetails,
          },
        },
      },
    };

    //w2-employees state
    if (payload.hasW2Employees) {
      const exist = await this.prisma.companyW2EmployeeStateLocation.findFirst({
        where: {
          state: payload.stateW2Employees,
          companyId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      if (!exist) {
        await this.prisma.companyW2EmployeeStateLocation.create({
          data: {
            state: payload.stateW2Employees,
            companyId,
          },
        });
      }
    } else {
      await this.prisma.companyW2EmployeeStateLocation.deleteMany({
        where: { companyId },
      });
    }
    //employees Country
    if (payload.hasOperationOutsideUS) {
      const exist = await this.prisma.companyCountryLocation.findFirst({
        where: {
          country: payload.countryOperationOutsideUS,
          companyId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      if (!exist) {
        await this.prisma.companyCountryLocation.create({
          data: {
            country: payload.countryOperationOutsideUS,
            companyId,
          },
        });
      }
    } else {
      await this.prisma.companyCountryLocation.deleteMany({
        where: { companyId },
      });
    }

    await this.companiesRepository.updateCompany(companyId, dataToSave, {
      CompanyIntellectualProperty: true,
      CompanyFinancialDetails: true,
    });

    await this.taskServide.createTasks(companyId);

    return payload;
  }

  private validateUpdateIntakeCall(payload: CompanyIntakeCallDto) {
    //A. Company Structure and Ownership
    // -> structure
    if (!Object.values(CompanyStructureEnum).includes(payload.structure)) {
      throw new BadRequestException('Invalid Structure type');
    }
    if (payload.structure === CompanyStructureEnum.OTHER) {
      if (!payload.otherStructure) {
        throw new BadRequestException(
          'Theres must be a strcuture for the company',
        );
      }
    } else {
      payload.otherStructure = null;
    }

    // -> w2-employees state
    if (payload.hasW2Employees) {
      const states = USStates.map((e) => e.code);
      if (!states.includes(payload.stateW2Employees)) {
        throw new BadRequestException('Invalid state for the w2-employees');
      }
    }

    // -> employees outsise usa
    if (payload.hasOperationOutsideUS) {
      const countriesList = countries.map((e) => e.code);
      if (!countriesList.includes(payload.countryOperationOutsideUS)) {
        throw new BadRequestException(
          'Invalid country for operation outside USA',
        );
      }
    }

    //B. Intellectual Property
    // -> intellectual property
    if (payload.hasIntellectualProperty) {
      if (
        !payload.intellectualProperty ||
        payload.intellectualProperty.length === 0
      ) {
        throw new BadRequestException('Invalid intellectual property data');
      }
      const types = Object.values(CompanyIntellectualPropertyTypeEnum);
      const valid = payload?.intellectualProperty?.every((elem) => {
        if (!types.includes(elem.type)) return false;
        if (!elem?.registrationNumber) return false;
        if (!elem?.jurisdiction) return false;

        return true;
      });
      if (!valid)
        throw new BadRequestException('Invalid intellectual property data');
    }

    // -> pending ip applications
    if (payload.hasPendingIPApplication) {
      if (!payload.pendingIPApplicationDetails) {
        throw new BadRequestException(
          'Theres must be a details for the pending ip application',
        );
      }
    }

    //C. Employees & contractors
    // ->
    if (payload.hasOperationOutsideUS) {
      if (typeof payload?.areEmployeesInBargainingAgreements === 'boolean') {
        if (
          payload.areEmployeesInBargainingAgreements &&
          !payload.employeesInBargainingAgreementsDetails
        ) {
          throw new BadRequestException(
            'theres must be details for the collective bargaining agreements or unions',
          );
        }
      } else {
        payload.areEmployeesInBargainingAgreements = false;
        payload.employeesInBargainingAgreementsDetails = null;
      }
    } else {
      payload.areEmployeesInBargainingAgreements = false;
      payload.employeesInBargainingAgreementsDetails = null;
    }

    //D. Real Estate and Equipment
    // ->  real estate property or equipment
    if (payload.hasEstatePropertyOrEquipment) {
      if (!payload.estatePropertyOrEquipmentDetails) {
        throw new BadRequestException(
          'Theres must be a details for real estate and equipment',
        );
      }
    }

    //F. Finanials
    // -> financial obligations
    if (payload.hasFinancialObligations) {
      if (!payload.finalcianObligationsDetails) {
        throw new BadRequestException(
          'Theres must be a details for the financial obligations',
        );
      }
    }

    // -> asset sale
    if (payload.hasIntendToHaveAsset) {
      if (!payload.intendToHaveAssetDetails) {
        throw new BadRequestException(
          'Theres must be a details for the financial obligations',
        );
      }
    }

    // -> ongoing negotiations
    if (payload.hasOngoingNegotationsForSale) {
      if (!payload.ongoingNegotationsForSaleDetails) {
        throw new BadRequestException(
          'Theres must be a details for the ongoing negotiations',
        );
      }
    }

    // -> offers
    if (payload.hasReceivedOffers) {
      if (!payload.hasReceivedOffersDetails) {
        throw new BadRequestException(
          'Theres must be a details for any offer, letter on intent',
        );
      }
    }
  }

  // to be called after stripe payment webhook trigger
  async setUpAfterPayment(companyId: string) {
    const company = await this.companiesRepository.getById(companyId);
    if (!company) throw new NotFoundException('Company not found');

    const rootFolderId = uuidv4();

    await this.prisma.$transaction(async (prisma) => {
      const rootFolder = await prisma.folder.create({
        data: {
          id: rootFolderId,
          name: rootFolderId,
          companyId,
        },
      });

      // any other relevant setup

      await prisma.company.update({
        where: { id: companyId },
        data: { rootFolderId, hasPaidTheFee: true },
      });
    });
  }
}
