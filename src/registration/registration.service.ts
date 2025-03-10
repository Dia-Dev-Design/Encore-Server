import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompaniesRepository } from 'src/companies/companies.repository';
import { StateIsoCode, Step1Dto } from './dto/step1.dto';
import { Step2Dto } from './dto/step2.dto';
import { CompaniesService } from 'src/companies/companies.service';
import { Step3Dto } from './dto/step3.dto';
import { UserEntity } from 'src/user/entities/user.entity';
import { UserRepository } from 'src/user/repositories/user.repository';
import { CompanyStructureEnum } from '../companies/enums/comapanies.enum';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly companiesRepository: CompaniesRepository,
    private readonly usersRepository: UserRepository,
    private readonly companiesService: CompaniesService,
  ) {}

  async registerStep1(user: UserEntity, step1Dto: Step1Dto) {
    const company = await this.companiesRepository.createWithUser(
      {
        name: step1Dto.companyName,
        industryId: step1Dto.industryId,
        hasCompletedSetup: false,
        hasBeenEvaluated: false,
      },
      user,
    );

    const companyStates = await this.companiesRepository.upsertCompanyStates(
      company.id,
      step1Dto.states,
    );

    const companyCountries =
      await this.companiesRepository.upsertCompanyCountries(
        company.id,
        step1Dto.otherCountries,
      );

    await this.usersRepository.update(user.id, {
      name: step1Dto.fullname,
      phoneNumber: step1Dto.phone,
    });

    return {
      company,
      companyStates,
      companyCountries,
    };
  }

  async getStep1(user: UserEntity, companyId: string): Promise<Step1Dto> {
    console.log('getStep1', user, companyId);
    const company = await this.companiesRepository.getByOwnerAndId(
      user,
      companyId,
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const companyCountries =
      await this.companiesRepository.getCompanyCountries(companyId);

    const companyStates =
      await this.companiesRepository.getCompanyStates(companyId);

    return {
      fullname: company.User.name,
      phone: company.User.phoneNumber,
      companyName: company.Company.name,
      industryId: company.Company.industryId,
      otherCountries: companyCountries.map((country) => country.country),
      states: companyStates.map((state) => state.state) as StateIsoCode[],
    };
  }

  async registerStep2(companyId: string, step2Dto: Step2Dto) {
    //TODO
    //: Promise<Step2Dto>
    const company = await this.companiesService.getCompanyById(companyId);

    const { employeesStates, employeesCountries, ...rest } = step2Dto;

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company.hasCompletedSetup) {
      throw new BadRequestException('Company has already completed setup');
    }

    const updatedCompany = await this.companiesRepository.updateById(
      companyId,
      {
        ...rest,
      },
    );

    await this.companiesRepository.upsertEmployeeStateLocations(
      companyId,
      employeesStates,
    );

    await this.companiesRepository.upsertEmployeeCountryLocations(
      companyId,
      employeesCountries,
    );

    return {
      ...updatedCompany,
    };
  }

  async getStep2(user: UserEntity, companyId: string): Promise<Step2Dto> {
    const company = await this.companiesRepository.getByOwnerAndId(
      user,
      companyId,
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const employeesStates =
      await this.companiesRepository.getEmployeeStateLocations(companyId);

    const employeeOtherCountries =
      await this.companiesRepository.getEmployeeCountryLocations(companyId);

    return {
      structure:
        company.Company.structure ?? (company.Company.otherStructure as any),
      hasRaisedCapital: company.Company.hasRaisedCapital,
      hasW2Employees: company.Company.hasW2Employees,
      employeesStates: employeesStates.map(
        (state) => state.state,
      ) as StateIsoCode[],
      employeesCountries: employeeOtherCountries.map(
        (country) => country.country,
      ),
    };
  }

  async registerStep3(companyId: string, step3Dto: Step3Dto) {
    const company = await this.companiesService.getCompanyById(companyId);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company.hasCompletedSetup) {
      throw new BadRequestException('Company has already completed setup');
    }

    //TODO fix status - stage

    await this.companiesService.setUpAfterPayment(companyId);

    return this.companiesRepository.updateById(companyId, {
      ...step3Dto,
      hasCompletedSetup: true,
    });
  }

  async getStep3(user: UserEntity, companyId: string): Promise<Step3Dto> {
    const company = await this.companiesRepository.getByOwnerAndId(
      user,
      companyId,
    );

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return {
      currentStage:
        company.Company.currentStage ?? (company.Company.otherStage as any),
    };
  }
}
