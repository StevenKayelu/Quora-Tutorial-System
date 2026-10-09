export interface User {
  id: string;
  userId?: string; // u_user_id (7-digit display ID)
  uUserId?: string;
  firstName: string;
  lastName: string;
  gender?: string;
  email: string;
  mobile?: string;
  image?: string;
  role: string;
  roleValue: number;
}

export type RefreshToken = {
  refreshToken: string;
  accessToken: string;
  user: User;
  authenticated: boolean;
};
