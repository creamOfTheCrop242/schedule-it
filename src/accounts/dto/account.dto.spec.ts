import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { RegisterAccountDto } from './account.dto';

describe('RegisterAccountDto validation', () => {
  it('accepts valid payload', async () => {
    const dto = plainToInstance(RegisterAccountDto, {
      email: 'jalynjones4@yahoo.com',
      name: 'jay',
      password: 'password',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects extra fields (forbidNonWhitelisted)', async () => {
    const dto = plainToInstance(RegisterAccountDto, {
      email: 'jalynjones4@yahoo.com',
      name: 'jay',
      password: 'password',
      extra: 'nope',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    // When forbidNonWhitelisted is on, extra field becomes a validation error.
    expect(errors.length).toBeGreaterThan(0);
  });
});

