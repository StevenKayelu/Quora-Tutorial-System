export interface User {
  id: string;
  firstName: string;
  lastName: string;
  gender?: string;
  email: string;
  mobile: number;
  image: string;
  role: string;
  roleValue: number;
}

export type RefreshToken = {
  refreshToken: string;
  accessToken: string;
  user: User;
  authenticated: boolean;
};
