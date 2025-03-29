import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private connectionAttempted = false;

  constructor() {
    // Log the database URL format (without credentials) for troubleshooting
    const dbUrl = process.env.DATABASE_URL || '';
    const sanitizedUrl = this.sanitizeDbUrl(dbUrl);
    console.log(`Initializing database connection to: ${sanitizedUrl}`);

    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not set!');
    }

    /**
     * Database connection pool configuration optimized for Supabase's connection limits
     *
     * Key optimizations:
     * - Single application-wide pool to prevent connection exhaustion
     * - Reasonable max connections to stay under Supabase limits
     * - Slightly larger idle timeout to avoid constant reconnections
     * - Error logging to catch connection issues
     */
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 30,
      min: 5,
      idleTimeoutMillis: 60000, // 60 seconds
      connectionTimeoutMillis: 15000, // 15 seconds
      application_name: 'encore-server',
      statement_timeout: 30000, // 30 seconds
      query_timeout: 30000, // 30 seconds
    });

    // Add detailed error logging
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);

      // Handle specific error types
      if (err.code === 'ECONNREFUSED') {
        console.error('Unable to connect to the database. Please check that:');
        console.error('1. The DATABASE_URL environment variable is correctly set');
        console.error('2. The database server is running and accessible');
        console.error('3. Network settings/firewalls allow the connection');
      } else if (err.code === 'ETIMEDOUT') {
        console.error(
          'Connection to database timed out. The server may be overloaded or unreachable.'
        );
      }
    });

    // Log connection creation and release for debugging
    this.pool.on('connect', () => {
      console.log('Database connection created from pool');
    });

    this.pool.on('acquire', () => {
      console.log('Database connection acquired from pool');
    });

    this.pool.on('remove', () => {
      console.log('Database connection removed from pool');
    });
  }

  async onModuleInit() {
    // Test the connection on startup
    try {
      console.log('Testing database connection...');
      const client = await this.pool.connect();

      // Run a simple query to verify database is fully functional
      const result = await client.query('SELECT NOW() as time');
      console.log(
        `✅ Database connection established successfully. Server time: ${result.rows[0].time}`
      );

      client.release();
      this.connectionAttempted = true;
    } catch (error) {
      this.connectionAttempted = true;
      console.error('❌ Failed to establish database connection:', error);

      // Provide more helpful error messages based on error type
      if (error.code === 'ECONNREFUSED') {
        console.error('Connection refused. Please check:');
        console.error('1. Database URL is correct');
        console.error('2. Database server is running');
        console.error('3. Network/firewall allows the connection');
      } else if (error.code === '28P01') {
        console.error('Authentication failed. Check username and password in DATABASE_URL');
      } else if (error.code === '3D000') {
        console.error('Database does not exist. Check the database name in DATABASE_URL');
      } else if (error.code === '08001') {
        console.error('Could not establish connection. Check host and port in DATABASE_URL');
      }

      throw error; // Fail fast if database connection is not available
    }
  }

  async onModuleDestroy() {
    // Properly close the pool when the application shuts down
    console.log('Closing database connection pool...');
    await this.pool.end();
    console.log('Database connection pool closed');
  }

  /**
   * Get the shared database pool
   */
  getPool(): Pool {
    if (!this.connectionAttempted) {
      console.warn('WARNING: Getting database pool before connection was tested!');
    }
    return this.pool;
  }

  /**
   * Check if the database connection is working
   */
  async checkConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }

  /**
   * Sanitize the database URL for logging (remove credentials)
   */
  private sanitizeDbUrl(url: string): string {
    try {
      // Handle empty URL
      if (!url) return 'No DATABASE_URL provided';

      // Basic check if it's a URL
      if (!url.includes('://')) return 'Invalid DATABASE_URL format';

      // Try to extract just protocol, host and database name
      // Format is typically: postgresql://username:password@host:port/database
      const urlParts = url.split('@');
      if (urlParts.length < 2) return 'postgresql://[redacted]@host/database';

      const protocol = url.split('://')[0];
      const hostPart = urlParts[urlParts.length - 1];

      return `${protocol}://[redacted]@${hostPart}`;
    } catch (error) {
      return 'Error parsing DATABASE_URL';
    }
  }
}
