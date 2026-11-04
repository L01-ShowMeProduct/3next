import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';

/**
 * Test e2e chạy trên PostgreSQL thật. Cần biến TEST_DATABASE_URL trỏ tới một database RIÊNG cho test
 * (mỗi test xóa sạch dữ liệu trong đó). Không có biến này thì bộ test này được bỏ qua.
 *   docker compose up -d db
 *   TEST_DATABASE_URL=postgres://next:next@localhost:5432/next3_test npm test
 */
const TEST_DB = process.env.TEST_DATABASE_URL;
const describeDb = TEST_DB ? describe : describe.skip;
if (!TEST_DB) console.warn('Bỏ qua test e2e: chưa đặt TEST_DATABASE_URL (xem backend/README.md).');

// Chốt an toàn: test xóa sạch dữ liệu, nên không bao giờ chạy trên database dev hay production.
if (TEST_DB) {
  const dbName = new URL(TEST_DB).pathname.replace(/^\//, '');
  if (!/test/i.test(dbName) || TEST_DB === process.env.DATABASE_URL) {
    throw new Error(`TEST_DATABASE_URL phải trỏ tới database riêng có chữ "test" trong tên, đang là "${dbName}".`);
  }
}

async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error'] });
  configureApp(app);
  await app.init();
  return app;
}

describeDb('3Next API (e2e, PostgreSQL)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    process.env.SEED_DEMO_DATA = 'false';
    process.env.NODE_ENV = 'test';
    app = await createApp();
  });

  beforeEach(async () => {
    await app.get(DataSource).query('TRUNCATE "tasks", "captures", "refresh_tokens", "users" RESTART IDENTITY CASCADE');
  });

  afterAll(async () => {
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  interface Session {
    accessToken: string;
    refreshToken: string;
    userId: string;
  }

  let counter = 0;
  async function signUp(email = `user${++counter}@test.vn`, password = 'matkhau123'): Promise<Session> {
    const res = await http().post('/auth/register').send({ email, password }).expect(201);
    return { accessToken: res.body.accessToken, refreshToken: res.body.refreshToken, userId: res.body.user.id };
  }

  /** Gọi API với access token của một phiên. */
  const as = (s: Session) => ({
    get: (url: string) => http().get(url).set('Authorization', `Bearer ${s.accessToken}`),
    post: (url: string) => http().post(url).set('Authorization', `Bearer ${s.accessToken}`),
    patch: (url: string) => http().patch(url).set('Authorization', `Bearer ${s.accessToken}`),
    delete: (url: string) => http().delete(url).set('Authorization', `Bearer ${s.accessToken}`),
  });

  describe('Health và Swagger', () => {
    it('GET /health không cần đăng nhập và báo database ok', async () => {
      const res = await http().get('/health').expect(200);
      expect(res.body).toMatchObject({ status: 'ok', service: '3next-backend', database: 'ok' });
    });

    it('Swagger JSON có đủ Auth, Tasks, Captures và khai báo Bearer', async () => {
      const res = await http().get('/docs-json').expect(200);
      const tags = [
        ...res.body.paths['/auth/login'].post.tags,
        ...res.body.paths['/tasks'].get.tags,
        ...res.body.paths['/captures'].get.tags,
      ];
      expect(tags).toEqual(expect.arrayContaining(['Auth', 'Tasks', 'Captures']));
      expect(res.body.components.securitySchemes.bearer).toBeDefined();
    });
  });

  describe('Auth', () => {
    it('đăng ký trả cặp token, /auth/me trả đúng user, không lộ mật khẩu', async () => {
      const res = await http()
        .post('/auth/register')
        .send({ email: '  Khoa@HCMUT.edu.vn ', password: 'matkhau123', displayName: 'Khoa' })
        .expect(201);
      expect(res.body).toMatchObject({ expiresIn: 900, user: { email: 'khoa@hcmut.edu.vn', displayName: 'Khoa' } });
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
      expect(JSON.stringify(res.body)).not.toContain('password');

      const me = await http().get('/auth/me').set('Authorization', `Bearer ${res.body.accessToken}`).expect(200);
      expect(me.body.email).toBe('khoa@hcmut.edu.vn');
    });

    it('trùng email (không phân biệt hoa thường) trả 409, dữ liệu sai trả 400', async () => {
      await signUp('a@test.vn');
      await http().post('/auth/register').send({ email: 'A@Test.VN', password: 'matkhau123' }).expect(409);
      await http().post('/auth/register').send({ email: 'khong-phai-email', password: 'matkhau123' }).expect(400);
      await http().post('/auth/register').send({ email: 'b@test.vn', password: 'ngan' }).expect(400);
    });

    it('đăng nhập đúng thì được token, sai mật khẩu hay email không tồn tại đều 401 cùng thông báo', async () => {
      await signUp('login@test.vn', 'matkhau123');
      const ok = await http().post('/auth/login').send({ email: 'LOGIN@test.vn', password: 'matkhau123' }).expect(200);
      expect(ok.body.accessToken).toEqual(expect.any(String));

      const wrongPass = await http().post('/auth/login').send({ email: 'login@test.vn', password: 'saimatkhau' }).expect(401);
      const noUser = await http().post('/auth/login').send({ email: 'ai@test.vn', password: 'matkhau123' }).expect(401);
      expect(wrongPass.body.message).toBe(noUser.body.message);
    });

    it('chặn request không có hoặc có token sai', async () => {
      await http().get('/tasks').expect(401);
      await http().get('/tasks/top').expect(401);
      await http().post('/captures').send({ text: 'mai nộp bài' }).expect(401);
      await http().get('/tasks').set('Authorization', 'Bearer abc.def.ghi').expect(401);
      const s = await signUp();
      // refresh token không dùng thay access token được
      await http().get('/tasks').set('Authorization', `Bearer ${s.refreshToken}`).expect(401);
    });

    it('refresh đổi sang token mới, dùng lại token cũ thì thu hồi mọi phiên', async () => {
      const s = await signUp();
      const r1 = await http().post('/auth/refresh').send({ refreshToken: s.refreshToken }).expect(200);
      expect(r1.body.refreshToken).not.toBe(s.refreshToken);
      await http().get('/tasks').set('Authorization', `Bearer ${r1.body.accessToken}`).expect(200);

      // dùng lại token cũ: coi như bị lộ
      await http().post('/auth/refresh').send({ refreshToken: s.refreshToken }).expect(401);
      // token mới cũng bị thu hồi theo, buộc đăng nhập lại
      await http().post('/auth/refresh').send({ refreshToken: r1.body.refreshToken }).expect(401);
    });

    it('refresh token giả hoặc sai định dạng trả 401', async () => {
      const s = await signUp();
      const [id] = s.refreshToken.split('.');
      await http().post('/auth/refresh').send({ refreshToken: `${id}.giamaothuthoi` }).expect(401);
      await http().post('/auth/refresh').send({ refreshToken: 'khong-co-dau-cham-gi-ca' }).expect(401);
    });

    it('đăng xuất một thiết bị không ảnh hưởng thiết bị khác, logout-all thu hồi hết', async () => {
      const phone = await signUp('multi@test.vn');
      const laptop = await http().post('/auth/login').send({ email: 'multi@test.vn', password: 'matkhau123' }).expect(200);

      await http().post('/auth/logout').send({ refreshToken: phone.refreshToken }).expect(204);
      await http().post('/auth/refresh').send({ refreshToken: phone.refreshToken }).expect(401);
      const stillOk = await http().post('/auth/refresh').send({ refreshToken: laptop.body.refreshToken }).expect(200);

      await http().post('/auth/logout-all').set('Authorization', `Bearer ${stillOk.body.accessToken}`).expect(204);
      await http().post('/auth/refresh').send({ refreshToken: stillOk.body.refreshToken }).expect(401);
    });
  });

  describe('Tasks', () => {
    it('tạo, đọc, sửa, hoàn thành và xóa một task', async () => {
      const s = await signUp();
      const created = await as(s)
        .post('/tasks')
        .send({ title: 'Nộp báo cáo', deadline: '2026-11-20T16:59:00.000Z', priority: 'high' })
        .expect(201);
      const id = created.body.id;
      expect(created.body).toMatchObject({
        title: 'Nộp báo cáo',
        deadline: '2026-11-20T16:59:00.000Z',
        priority: 'high',
        status: 'todo',
        completedAt: null,
      });

      await as(s).get(`/tasks/${id}`).expect(200);

      const updated = await as(s).patch(`/tasks/${id}`).send({ title: 'Nộp báo cáo cuối', deadline: null }).expect(200);
      expect(updated.body.title).toBe('Nộp báo cáo cuối');
      expect(updated.body.deadline).toBeNull();

      const done = await as(s).post(`/tasks/${id}/complete`).expect(200);
      expect(done.body.status).toBe('done');
      expect(done.body.completedAt).not.toBeNull();

      const reopened = await as(s).patch(`/tasks/${id}`).send({ status: 'todo' }).expect(200);
      expect(reopened.body.completedAt).toBeNull();

      await as(s).delete(`/tasks/${id}`).expect(204);
      await as(s).get(`/tasks/${id}`).expect(404);
    });

    it('lọc danh sách theo status và priority', async () => {
      const s = await signUp();
      const a = await as(s).post('/tasks').send({ title: 'A', priority: 'high' }).expect(201);
      await as(s).post('/tasks').send({ title: 'B', priority: 'low' }).expect(201);
      await as(s).post(`/tasks/${a.body.id}/complete`).expect(200);

      const done = await as(s).get('/tasks').query({ status: 'done' }).expect(200);
      expect(done.body.map((t: { title: string }) => t.title)).toEqual(['A']);
      const low = await as(s).get('/tasks').query({ priority: 'low' }).expect(200);
      expect(low.body.map((t: { title: string }) => t.title)).toEqual(['B']);
    });

    it('từ chối dữ liệu không hợp lệ', async () => {
      const s = await signUp();
      await as(s).post('/tasks').send({}).expect(400);
      await as(s).post('/tasks').send({ title: 'X', priority: 'urgent' }).expect(400);
      await as(s).post('/tasks').send({ title: 'X', deadline: 'ngày mai' }).expect(400);
      await as(s).post('/tasks').send({ title: 'X', hack: true }).expect(400);
      // không cho client tự gán task cho user khác
      await as(s).post('/tasks').send({ title: 'X', userId: '3f2b8c1e-5a7d-4c2e-9b1a-0d6f4e8a7c21' }).expect(400);
      await as(s).get('/tasks').query({ status: 'xong' }).expect(400);
    });

    it('trả 400 với id sai định dạng và 404 khi không tồn tại', async () => {
      const s = await signUp();
      await as(s).get('/tasks/abc').expect(400);
      await as(s).get('/tasks/3f2b8c1e-5a7d-4c2e-9b1a-0d6f4e8a7c21').expect(404);
    });

    it('GET /tasks/top trả về Top 3 chưa xong, kèm lý do, và bỏ việc đã hoàn thành', async () => {
      const s = await signUp();
      const inH = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
      const urgent = await as(s).post('/tasks').send({ title: 'Gấp', deadline: inH(3), priority: 'high' }).expect(201);
      await as(s).post('/tasks').send({ title: 'Vừa', deadline: inH(30) }).expect(201);
      await as(s).post('/tasks').send({ title: 'Xa', deadline: inH(200), priority: 'low' }).expect(201);
      await as(s).post('/tasks').send({ title: 'Không hạn' }).expect(201);

      const top = await as(s).get('/tasks/top').expect(200);
      expect(top.body).toHaveLength(3);
      expect(top.body[0].task.title).toBe('Gấp');
      expect(top.body[0].reason).toContain('Xếp trước vì');
      expect(top.body[0].score).toBeGreaterThanOrEqual(top.body[1].score);

      await as(s).post(`/tasks/${urgent.body.id}/complete`).expect(200);
      const after = await as(s).get('/tasks/top').expect(200);
      expect(after.body.map((r: { task: { title: string } }) => r.task.title)).not.toContain('Gấp');

      const limited = await as(s).get('/tasks/top').query({ limit: 1 }).expect(200);
      expect(limited.body).toHaveLength(1);
      await as(s).get('/tasks/top').query({ limit: 50 }).expect(400);
    });
  });

  describe('Cô lập dữ liệu giữa các tài khoản', () => {
    it('user B không thấy, không sửa, không xóa được task của user A', async () => {
      const a = await signUp();
      const b = await signUp();
      const task = await as(a).post('/tasks').send({ title: 'Việc riêng của A', priority: 'high' }).expect(201);
      const id = task.body.id;

      expect((await as(b).get('/tasks').expect(200)).body).toHaveLength(0);
      expect((await as(b).get('/tasks/top').expect(200)).body).toHaveLength(0);
      await as(b).get(`/tasks/${id}`).expect(404);
      await as(b).patch(`/tasks/${id}`).send({ title: 'Bị sửa' }).expect(404);
      await as(b).post(`/tasks/${id}/complete`).expect(404);
      await as(b).delete(`/tasks/${id}`).expect(404);

      const still = await as(a).get(`/tasks/${id}`).expect(200);
      expect(still.body).toMatchObject({ title: 'Việc riêng của A', status: 'todo' });
    });

    it('user B không đọc, không xác nhận, không bỏ qua được capture của user A', async () => {
      const a = await signUp();
      const b = await signUp();
      const cap = await as(a).post('/captures').send({ text: 'mai nộp bài' }).expect(201);

      expect((await as(b).get('/captures').expect(200)).body).toHaveLength(0);
      await as(b).get(`/captures/${cap.body.id}`).expect(404);
      await as(b).post(`/captures/${cap.body.id}/confirm`).send({}).expect(404);
      await as(b).delete(`/captures/${cap.body.id}`).expect(404);

      expect((await as(a).get(`/captures/${cap.body.id}`).expect(200)).body.status).toBe('pending');
    });
  });

  describe('Captures', () => {
    it('gửi câu, nhận task nháp, xác nhận thì task được lưu', async () => {
      const s = await signUp();
      const cap = await as(s)
        .post('/captures')
        .send({ text: 'Thứ 6 nộp báo cáo môn Mobile, mai họp nhóm lúc 9 giờ, mua sách ở Fahasa', source: 'voice' })
        .expect(201);
      expect(cap.body.status).toBe('pending');
      expect(cap.body.source).toBe('voice');
      expect(cap.body.drafts).toHaveLength(3);

      // chưa xác nhận thì chưa có task nào
      expect((await as(s).get('/tasks').expect(200)).body).toHaveLength(0);

      const confirmed = await as(s).post(`/captures/${cap.body.id}/confirm`).send({}).expect(200);
      expect(confirmed.body.capture.status).toBe('confirmed');
      expect(confirmed.body.tasks).toHaveLength(3);
      expect(confirmed.body.tasks[0].captureId).toBe(cap.body.id);
      expect(confirmed.body.capture.taskIds).toEqual(confirmed.body.tasks.map((t: { id: string }) => t.id));
      expect((await as(s).get('/tasks').expect(200)).body).toHaveLength(3);
    });

    it('xác nhận với danh sách đã sửa thay vì task AI tách', async () => {
      const s = await signUp();
      const cap = await as(s).post('/captures').send({ text: 'mai nộp bài, mua sách' }).expect(201);
      const confirmed = await as(s)
        .post(`/captures/${cap.body.id}/confirm`)
        .send({ tasks: [{ title: 'Nộp bài tập lớn', priority: 'high' }] })
        .expect(200);
      expect(confirmed.body.tasks).toHaveLength(1);
      expect(confirmed.body.tasks[0].title).toBe('Nộp bài tập lớn');
    });

    it('không xác nhận hai lần (409) và bỏ qua capture thì không tạo task', async () => {
      const s = await signUp();
      const a = await as(s).post('/captures').send({ text: 'mai nộp bài' }).expect(201);
      await as(s).post(`/captures/${a.body.id}/confirm`).send({}).expect(200);
      await as(s).post(`/captures/${a.body.id}/confirm`).send({}).expect(409);
      await as(s).delete(`/captures/${a.body.id}`).expect(409);

      const b = await as(s).post('/captures').send({ text: 'mai họp nhóm' }).expect(201);
      const discarded = await as(s).delete(`/captures/${b.body.id}`).expect(200);
      expect(discarded.body.status).toBe('discarded');
      await as(s).post(`/captures/${b.body.id}/confirm`).send({}).expect(409);
      expect((await as(s).get('/tasks').expect(200)).body).toHaveLength(1);
    });

    it('hai request xác nhận cùng lúc: chỉ một cái thành công, không tạo task trùng', async () => {
      const s = await signUp();
      const cap = await as(s).post('/captures').send({ text: 'mai nộp bài, thứ 6 họp nhóm' }).expect(201);
      const results = await Promise.all(
        Array.from({ length: 4 }, () => as(s).post(`/captures/${cap.body.id}/confirm`).send({})),
      );
      const codes = results.map((r) => r.status).sort();
      expect(codes).toEqual([200, 409, 409, 409]);
      expect((await as(s).get('/tasks').expect(200)).body).toHaveLength(2);
    });

    it('trả 422 khi không tách được việc nào, 400 khi dữ liệu sai', async () => {
      const s = await signUp();
      await as(s).post('/captures').send({ text: ' . , ; ' }).expect(422);
      await as(s).post('/captures').send({}).expect(400);
      await as(s).post('/captures').send({ text: 'mai họp', source: 'email' }).expect(400);
    });

    it('liệt kê, lọc theo status và đọc chi tiết', async () => {
      const s = await signUp();
      const a = await as(s).post('/captures').send({ text: 'mai nộp bài' }).expect(201);
      await as(s).post('/captures').send({ text: 'mai họp nhóm' }).expect(201);
      await as(s).post(`/captures/${a.body.id}/confirm`).send({}).expect(200);

      expect((await as(s).get('/captures').expect(200)).body).toHaveLength(2);
      const pending = await as(s).get('/captures').query({ status: 'pending' }).expect(200);
      expect(pending.body).toHaveLength(1);
      await as(s).get(`/captures/${a.body.id}`).expect(200);
      await as(s).get('/captures/3f2b8c1e-5a7d-4c2e-9b1a-0d6f4e8a7c21').expect(404);
    });

    it('luồng đầy đủ: capture, xác nhận, Top 3, hoàn thành', async () => {
      const s = await signUp();
      const cap = await as(s).post('/captures').send({ text: 'mai họp nhóm lúc 9 giờ, thứ 6 nộp báo cáo' }).expect(201);
      await as(s).post(`/captures/${cap.body.id}/confirm`).send({}).expect(200);

      const top = await as(s).get('/tasks/top').expect(200);
      expect(top.body.length).toBe(2);
      expect(top.body[0].task.title).toBe('Họp nhóm');

      await as(s).post(`/tasks/${top.body[0].task.id}/complete`).expect(200);
      const next = await as(s).get('/tasks/top').expect(200);
      expect(next.body.map((r: { task: { title: string } }) => r.task.title)).toEqual(['Nộp báo cáo']);
    });
  });

  describe('Lưu bền vững', () => {
    it('khởi động lại server vẫn giữ tài khoản, task, và đăng nhập lại được (đổi thiết bị)', async () => {
      const s = await signUp('persist@test.vn');
      await as(s).post('/tasks').send({ title: 'Còn nguyên sau restart', priority: 'high' }).expect(201);

      await app.close();
      app = await createApp();

      const login = await http().post('/auth/login').send({ email: 'persist@test.vn', password: 'matkhau123' }).expect(200);
      const tasks = await http().get('/tasks').set('Authorization', `Bearer ${login.body.accessToken}`).expect(200);
      expect(tasks.body.map((t: { title: string }) => t.title)).toEqual(['Còn nguyên sau restart']);
    });
  });
});
