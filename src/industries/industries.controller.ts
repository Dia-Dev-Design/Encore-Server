import { Controller, Get } from '@nestjs/common';
import { IndustriesService } from './industries.service';
import { IndustryEntity } from './entities/industry.entity';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('industries')
@Controller('industries')
export class IndustriesController {
  constructor(private readonly industriesService: IndustriesService) {}

  @Get()
  @ApiOkResponse({ type: [IndustryEntity] })
  findAll() {
    return this.industriesService.findAll();
  }
}
