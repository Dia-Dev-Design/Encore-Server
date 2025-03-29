// import { Injectable } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
// import { ConfigService } from '@nestjs/config';
// import { UserService } from 'src/user/services/user.service';
// import { JwtService } from '@nestjs/jwt';

// @Injectable()
// export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
//   constructor(
//     private readonly configService: ConfigService,
//     private readonly userService: UserService,
//     private readonly jwtService: JwtService,
//   ) {
//     super({
//       clientID: configService.get('google.clientId'),
//       clientSecret: configService.get('google.clientSecret'),
//       callbackURL: configService.get('google.redirectUrl'),
//       scope: ['email', 'profile'],
//     });
//   }

//   async validate(
//     accessToken: string,
//     refreshToken: string,
//     profile: Profile,
//     done: VerifyCallback,
//   ): Promise<any> {
//     const { name, emails, isAdmin } = profile;
//     const user = {
//       email: emails[0].value,
//       firstName: name.givenName,
//       lastName: name.familyName,
//       isAdmin: isAdmin,
//     };

//     let existingUser = await this.userService.findByEmail(user.email);
//     if (!existingUser) {
//       existingUser = await this.userService.registerUserWithProvider({
//         email: user.email,
//         name: `${user.firstName} ${user.lastName}`,
//         isAdmin: user.isAdmin,
//       });
//     }

//     const jwtToken = this.jwtService.sign({
//       userId: existingUser.id,
//       email: existingUser.email,
//     });

//     done(null, { accessToken: jwtToken });
//   }
// }
