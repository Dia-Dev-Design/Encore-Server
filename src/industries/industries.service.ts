import { Injectable } from '@nestjs/common';
import { IndustriesRepository } from './industries.repositoty';

@Injectable()
export class IndustriesService {
  constructor(private industryRepository: IndustriesRepository) {}
  findAll() {
    return this.industryRepository.findAll();
  }
}
