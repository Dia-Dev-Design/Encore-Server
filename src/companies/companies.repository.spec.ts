import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesRepository } from './companies.repository';

describe('CompaniesService', () => {
  let service: CompaniesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompaniesRepository],
    }).compile();

    service = module.get<CompaniesRepository>(CompaniesRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
