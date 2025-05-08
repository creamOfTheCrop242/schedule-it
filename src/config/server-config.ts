import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Account } from 'src/accounts/entities/account.entity';
import { EmailVerification } from 'src/auth/entities/email-verification.entity';

export const serverConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: 'ca05jlh7b75ehs.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com',
  port: 5432,
  username: 'ucfg16jm822s4s',
  password: 'p5f0593d772bbacbe748799023ff83f722aaa38ff6f04b133ba2fefa66bccead0',
  database: 'd545hntbpt0jsf',
  entities: [Account, EmailVerification],
  synchronize: true,
  url: 'postgres://ucfg16jm822s4s:p5f0593d772bbacbe748799023ff83f722aaa38ff6f04b133ba2fefa66bccead0@ca05jlh7b75ehs.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d545hntbpt0jsf',
  ssl: { rejectUnauthorized: false },
};
