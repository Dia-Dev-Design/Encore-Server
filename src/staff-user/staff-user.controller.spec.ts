import { Test, TestingModule } from '@nestjs/testing';
import { StaffUserController } from './staff-user.controller';

describe('StaffUserController', () => {
  let controller: StaffUserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffUserController],
    }).compile();

    controller = module.get<StaffUserController>(StaffUserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
