import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { CONVERSATION_STATUS } from '../../src/common/constants/common.constant';

describe('TravelOrchestrator (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const uniqueSuffix = Date.now();
    const user = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `tester_${uniqueSuffix}@gmail.com`,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        fullName: 'Tester',
      });

    accessToken = user.body.accessToken;
  });

  describe('/travel/conversation (POST)', () => {
    it('Should request more information if the budget is missing.', async () => {
      const payload = {
        message: 'Tôi muốn đi Hà Nội 3 ngày',
      };

      const response = await request(app.getHttpServer())
        .post('/travel/conversation')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)

      expect(response.body.status).toBe(CONVERSATION_STATUS.ASKING_MORE_INFO);
      expect(response.body.missingFields).toContain('budget');
    }, 30000);

    it('Should detect invalid locations', async () => {
      const payload = {
        message: 'Tôi muốn đi du lịch ở Quý Dương, Việt Nam',
      };

      const response = await request(app.getHttpServer())
        .post('/travel/conversation')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)

      expect(response.body.status).toBe(CONVERSATION_STATUS.ASKING_MORE_INFO);
      expect(response.body.missingFields).toContain('destination');
    }, 30000);

    it('Should return a plan when information is complete', async () => {
      const payload = {
        message: 'Tôi muốn đi du lịch ở Đà Nẵng, Việt Nam trong 3 ngày với sở thích ẩm thực và ngân sách 5 triệu đồng.',
      };

      const response = await request(app.getHttpServer())
        .post('/travel/conversation')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(payload)

      expect(response.body.status).toBe(CONVERSATION_STATUS.PLAN_READY);
    }, 30000);
  });

  afterAll(async () => {
    await app.close();
  });
});