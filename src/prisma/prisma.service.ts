import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: ['error', 'warn'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    // Implement retries for the initial connection
    const maxRetries = 3;
    let retryCount = 0;
    let connected = false;

    while (!connected && retryCount < maxRetries) {
      try {
        this.logger.log(
          `Attempting database connection (attempt ${retryCount + 1}/${maxRetries})...`
        );
        await this.$connect();
        this.logger.log('Database connection established successfully');
        connected = true;
      } catch (error) {
        retryCount++;
        this.logger.error(`Database connection failed: ${error.message}`);

        if (retryCount >= maxRetries) {
          this.logger.error('Maximum connection retry attempts reached');
          throw error;
        }

        // Exponential backoff: wait longer between each retry
        const delay = 2000 * Math.pow(2, retryCount - 1);
        this.logger.log(`Retrying connection in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
