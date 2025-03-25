export interface UserJwtPayload {
  id: string;
  email: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
}

export interface StaffJwtPayload {
  id: string;
  email: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
}
