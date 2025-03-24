import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import jwt from 'jsonwebtoken';

export const User = createParamDecorator(async (_, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  if (!req.user && req.headers.authorization) {
    const auth = req.headers.authorization.split('Bearer ')[1];
    const authDecoded: any = jwt.decode(auth);
    console.log('this is auth and auth decoded=========>', auth, authDecoded);
    return authDecoded?.payload;
  }

  return req.user;
});
