import { Test, TestingModule } from '@nestjs/testing';
import { StaffUserService } from './staff-user.service';

describe('StaffUserService', () => {
  let service: StaffUserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StaffUserService],
    }).compile();

    service = module.get<StaffUserService>(StaffUserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
