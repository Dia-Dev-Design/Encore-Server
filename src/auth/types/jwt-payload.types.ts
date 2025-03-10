export interface UserJwtPayload {
  id: string;
  email: string;
  iat: number;
  exp: number;
}

export interface StaffJwtPayload {
  id: string;
  email: string;
  iat: number;
  exp: number;
}
