export class RegisterAccountDto {
  username: string;
  email?: string;
  password: string;
}

export interface UpdateAccountDto extends RegisterAccountDto {
  id: number;
  bio: string;
  name: string;
}

export interface UpdatePasswordDto {
  id: string;
  password: string;
}
