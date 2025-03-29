import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from 'src/user/user.module';
import { EmailModule } from 'src/email/email.module';
// import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { StaffJwtStrategy } from './staff-jwt.strategy';
import { JwtAuthGuard } from './auth.guard';
import { StaffJwtAuthGuard } from './staff-auth.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UserModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule, UserModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    // GoogleStrategy,
    JwtStrategy,
    StaffJwtStrategy,
    JwtAuthGuard,
    StaffJwtAuthGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, StaffJwtAuthGuard],
})
export class AuthModule {}

// @Module({
//   imports: [
//     JwtModule.registerAsync({
//       imports: [ConfigModule],
//       useFactory: async (configService: ConfigService) => ({
//         secret: configService.get<string>('JWT_SECRET'),
//         signOptions: { expiresIn: '24h' },
//       }),
//       inject: [ConfigService],
//     }),
//     // ... other imports
//   ],
//   providers: [
//     AuthService,
//     StaffJwtStrategy, // Make sure this is included
//     // ... other providers
//   ],
//   controllers: [AuthController],
//   exports: [AuthService],
// })
// export class AuthModule {}
