import { loadDotEnv } from '../src/config/dotenv';

// Cho phép đặt TEST_DATABASE_URL trong backend/.env, khỏi phải gõ lại mỗi lần chạy npm test.
loadDotEnv();
