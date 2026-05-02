import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { LogInsightsService } from 'src/logs/services/log-insights/log-insights.service';
import { LogService } from 'src/logs/services/log/log.service';
import { LogController } from './logs.controller';

describe('LogController', () => {
  let controller: LogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogController],
      providers: [
        { provide: LogService, useValue: {} },
        { provide: LogInsightsService, useValue: {} },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();

    controller = module.get<LogController>(LogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
