import 'server-only';
import * as Minio from 'minio';

/**
 * MinIO (S3) storage client — replaces Supabase Storage.
 *
 * One public bucket (`rottenbrains`) with type prefixes:
 *   profile_pictures/<userId>/<ts>, backdrop_pictures/<userId>/<ts>, dev_blog_images/...
 * Objects are served publicly via the S3 endpoint (bucket has an anonymous
 * GetObject policy), so `publicUrl()` builds a stable, CDN-style URL.
 *
 * NOTE: uploads (PUT) must run from the deployment host, not the dev LXC
 * (which has an MTU quirk that hangs PUT-with-body to MinIO).
 */
function parseEndpoint(): { endPoint: string; port: number; useSSL: boolean } {
  const url = new URL(process.env.MINIO_ENDPOINT || 'http://10.10.20.55:9000');
  const useSSL = url.protocol === 'https:';
  return {
    endPoint: url.hostname,
    port: url.port ? Number(url.port) : useSSL ? 443 : 80,
    useSSL,
  };
}

const globalForMinio = globalThis as unknown as { minio?: Minio.Client };

export const minioClient =
  globalForMinio.minio ??
  new Minio.Client({
    ...parseEndpoint(),
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || '',
  });

if (process.env.NODE_ENV !== 'production') globalForMinio.minio = minioClient;

export const MINIO_BUCKET = process.env.MINIO_BUCKET || 'rottenbrains';

/** Public URL for an object key, using the public (TLS) endpoint when set. */
export function publicUrl(key: string): string {
  const base = (process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT || '').replace(
    /\/$/,
    ''
  );
  return `${base}/${MINIO_BUCKET}/${encodeURI(key)}`;
}

/** Upload a buffer and return its public URL. */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await minioClient.putObject(MINIO_BUCKET, key, body, body.length, {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=3600',
  });
  return publicUrl(key);
}
