# Encore Backend

## Overview

Encore Backend is a Node.js application built with the NestJS framework. It leverages Prisma as an ORM for database interactions and is containerized using Docker.

## Prerequisites

- Docker and Docker Compose installed on your machine.
- Node.js and Yarn for local development (optional if using Docker).

## Running the Project

### Using Docker Compose

The project is set up to run using Docker Compose, which manages both the application and its PostgreSQL database.

1. **Start the services:**

   Run the following command to start the application and the database:

   ```bash
   docker-compose up --build
   ```

   This command will build the Docker images and start the services defined in the `docker-compose.yml` file.

2. **Access the application:**

   The application will be accessible by default at `http://localhost:3000`.

### Dockerfile

The `Dockerfile` is set up with multi-stage builds for both development and production environments.

- **Development Stage:**

  - Installs all dependencies.
  - Generates Prisma client and builds the application.

- **Production Stage:**
  - Installs only production dependencies.
  - Copies the build artifacts from the development stage.
  - Runs database migrations and seeds the database before starting the application.

### Prisma Migrations

Prisma is used for database migrations. To apply migrations, the following command is executed as part of the Docker container startup:

```bash
npx prisma migrate deploy
```

This command will apply all pending migrations to the database.

### Database Seeding

The database is seeded with initial data using the `prisma/seed.ts` file. This is executed as part of the Docker container startup, or can be run manually with the following command:

```bash
yarn seed
```

## Environment Variables

The application uses environment variables to configure database connections and other settings. Please refer to the `.env.example` file for the list of required variables.

## Additional Information

- **Ports:** The application runs by default on port `3000`, and the PostgreSQL database is exposed on port `5432`.

## API Documentation

The API documentation is available at `<your-host>/api/docs`.
