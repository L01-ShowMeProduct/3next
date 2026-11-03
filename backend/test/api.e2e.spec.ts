import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CapturesService } from '../src/captures/captures.service';
import { configureApp } from '../src/setup';
import { TasksService } from '../src/tasks/tasks.service';

describe('3Next API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.SEED_DEMO_DATA = 'false';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    app.get(TasksService).clear();
    app.get(CapturesService).clear();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  describe('Health và Swagger', () => {
    it('GET /health', async () => {
      const res = await http().get('/health').expect(200);
      expect(res.body.status).toBe('ok');
    });

    it('Swagger JSON có đủ 2 collection Tasks và Captures', async () => {
      const res = await http().get('/docs-json').expect(200);
      const tags = res.body.paths['/tasks'].get.tags.concat(res.body.paths['/captures'].get.tags);
      expect(tags).toEqual(expect.arrayContaining(['Tasks', 'Captures']));
    });
  });

  describe('Tasks', () => {
    it('tạo, đọc, sửa, hoàn thành và xóa một task', async () => {
      const created = await http()
        .post('/tasks')
        .send({ title: 'Nộp báo cáo', deadline: '2026-11-20T16:59:00.000Z', priority: 'high' })
        .expect(201);
      const id = created.body.id;
      expect(created.body).toMatchObject({ title: 'Nộp báo cáo', priority: 'high', status: 'todo', completedAt: null });

      await http().get(`/tasks/${id}`).expect(200);

      const updated = await http().patch(`/tasks/${id}`).send({ title: 'Nộp báo cáo cuối', deadline: null }).expect(200);
      expect(updated.body.title).toBe('Nộp báo cáo cuối');
      expect(updated.body.deadline).toBeNull();

      const done = await http().post(`/tasks/${id}/complete`).expect(200);
      expect(done.body.status).toBe('done');
      expect(done.body.completedAt).not.toBeNull();

      await http().delete(`/tasks/${id}`).expect(204);
      await http().get(`/tasks/${id}`).expect(404);
    });

    it('lọc danh sách theo status và priority', async () => {
      const a = await http().post('/tasks').send({ title: 'A', priority: 'high' }).expect(201);
      await http().post('/tasks').send({ title: 'B', priority: 'low' }).expect(201);
      await http().post(`/tasks/${a.body.id}/complete`).expect(200);

      const done = await http().get('/tasks').query({ status: 'done' }).expect(200);
      expect(done.body.map((t: { title: string }) => t.title)).toEqual(['A']);
      const low = await http().get('/tasks').query({ priority: 'low' }).expect(200);
      expect(low.body.map((t: { title: string }) => t.title)).toEqual(['B']);
    });

    it('từ chối dữ liệu không hợp lệ', async () => {
      await http().post('/tasks').send({}).expect(400);
      await http().post('/tasks').send({ title: 'X', priority: 'urgent' }).expect(400);
      await http().post('/tasks').send({ title: 'X', deadline: 'ngày mai' }).expect(400);
      await http().post('/tasks').send({ title: 'X', hack: true }).expect(400);
      await http().get('/tasks').query({ status: 'xong' }).expect(400);
    });

    it('trả 400 với id sai định dạng và 404 khi không tồn tại', async () => {
      await http().get('/tasks/abc').expect(400);
      await http().get('/tasks/3f2b8c1e-5a7d-4c2e-9b1a-0d6f4e8a7c21').expect(404);
    });

    it('GET /tasks/top trả về Top 3 chưa xong, kèm lý do, và bỏ việc đã hoàn thành', async () => {
      const inH = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
      const urgent = await http().post('/tasks').send({ title: 'Gấp', deadline: inH(3), priority: 'high' }).expect(201);
      await http().post('/tasks').send({ title: 'Vừa', deadline: inH(30) }).expect(201);
      await http().post('/tasks').send({ title: 'Xa', deadline: inH(200), priority: 'low' }).expect(201);
      await http().post('/tasks').send({ title: 'Không hạn' }).expect(201);

      const top = await http().get('/tasks/top').expect(200);
      expect(top.body).toHaveLength(3);
      expect(top.body[0].task.title).toBe('Gấp');
      expect(top.body[0].reason).toContain('Xếp trước vì');
      expect(top.body[0].score).toBeGreaterThanOrEqual(top.body[1].score);

      await http().post(`/tasks/${urgent.body.id}/complete`).expect(200);
      const after = await http().get('/tasks/top').expect(200);
      expect(after.body.map((r: { task: { title: string } }) => r.task.title)).not.toContain('Gấp');

      const limited = await http().get('/tasks/top').query({ limit: 1 }).expect(200);
      expect(limited.body).toHaveLength(1);
      await http().get('/tasks/top').query({ limit: 50 }).expect(400);
    });
  });

  describe('Captures', () => {
    it('gửi câu, nhận task nháp, xác nhận thì task được lưu', async () => {
      const cap = await http()
        .post('/captures')
        .send({ text: 'Thứ 6 nộp báo cáo môn Mobile, mai họp nhóm lúc 9 giờ, mua sách ở Fahasa', source: 'voice' })
        .expect(201);
      expect(cap.body.status).toBe('pending');
      expect(cap.body.source).toBe('voice');
      expect(cap.body.drafts).toHaveLength(3);

      // chưa xác nhận thì chưa có task nào
      expect((await http().get('/tasks').expect(200)).body).toHaveLength(0);

      const confirmed = await http().post(`/captures/${cap.body.id}/confirm`).send({}).expect(200);
      expect(confirmed.body.capture.status).toBe('confirmed');
      expect(confirmed.body.tasks).toHaveLength(3);
      expect(confirmed.body.tasks[0].captureId).toBe(cap.body.id);
      expect((await http().get('/tasks').expect(200)).body).toHaveLength(3);
    });

    it('xác nhận với danh sách đã sửa thay vì task AI tách', async () => {
      const cap = await http().post('/captures').send({ text: 'mai nộp bài, mua sách' }).expect(201);
      const confirmed = await http()
        .post(`/captures/${cap.body.id}/confirm`)
        .send({ tasks: [{ title: 'Nộp bài tập lớn', priority: 'high' }] })
        .expect(200);
      expect(confirmed.body.tasks).toHaveLength(1);
      expect(confirmed.body.tasks[0].title).toBe('Nộp bài tập lớn');
    });

    it('không xác nhận hai lần (409) và bỏ qua capture thì không tạo task', async () => {
      const a = await http().post('/captures').send({ text: 'mai nộp bài' }).expect(201);
      await http().post(`/captures/${a.body.id}/confirm`).send({}).expect(200);
      await http().post(`/captures/${a.body.id}/confirm`).send({}).expect(409);
      await http().delete(`/captures/${a.body.id}`).expect(409);

      const b = await http().post('/captures').send({ text: 'mai họp nhóm' }).expect(201);
      const discarded = await http().delete(`/captures/${b.body.id}`).expect(200);
      expect(discarded.body.status).toBe('discarded');
      await http().post(`/captures/${b.body.id}/confirm`).send({}).expect(409);
      expect((await http().get('/tasks').expect(200)).body).toHaveLength(1);
    });

    it('trả 422 khi không tách được việc nào, 400 khi dữ liệu sai', async () => {
      await http().post('/captures').send({ text: ' . , ; ' }).expect(422);
      await http().post('/captures').send({}).expect(400);
      await http().post('/captures').send({ text: 'mai họp', source: 'email' }).expect(400);
    });

    it('liệt kê, lọc theo status và đọc chi tiết', async () => {
      const a = await http().post('/captures').send({ text: 'mai nộp bài' }).expect(201);
      await http().post('/captures').send({ text: 'mai họp nhóm' }).expect(201);
      await http().post(`/captures/${a.body.id}/confirm`).send({}).expect(200);

      expect((await http().get('/captures').expect(200)).body).toHaveLength(2);
      const pending = await http().get('/captures').query({ status: 'pending' }).expect(200);
      expect(pending.body).toHaveLength(1);
      await http().get(`/captures/${a.body.id}`).expect(200);
      await http().get('/captures/3f2b8c1e-5a7d-4c2e-9b1a-0d6f4e8a7c21').expect(404);
    });

    it('luồng đầy đủ: capture, xác nhận, Top 3, hoàn thành', async () => {
      const cap = await http().post('/captures').send({ text: 'mai họp nhóm lúc 9 giờ, thứ 6 nộp báo cáo' }).expect(201);
      await http().post(`/captures/${cap.body.id}/confirm`).send({}).expect(200);

      const top = await http().get('/tasks/top').expect(200);
      expect(top.body.length).toBe(2);
      expect(top.body[0].task.title).toBe('Họp nhóm');

      await http().post(`/tasks/${top.body[0].task.id}/complete`).expect(200);
      const next = await http().get('/tasks/top').expect(200);
      expect(next.body.map((r: { task: { title: string } }) => r.task.title)).toEqual(['Nộp báo cáo']);
    });
  });
});
