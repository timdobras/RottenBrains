import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const QUEUE = process.env.STREAM_QUEUE || 'stream-extract';
const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
const queue = new Queue(QUEUE, { connection });
const events = new QueueEvents(QUEUE, { connection });
await events.waitUntilReady();

console.log('enqueuing extract job (movie 27205)...');
const job = await queue.add('extract', { type: 'movie', id: '27205' }, { removeOnComplete: 100, removeOnFail: 50 });
try {
  const result = await job.waitUntilFinished(events, 60000);
  console.log('✅ RESULT:', JSON.stringify(result).slice(0, 220));
} catch (e) {
  console.log('❌ job failed:', e.message);
}
await queue.close();
await events.close();
await connection.quit();
process.exit(0);
