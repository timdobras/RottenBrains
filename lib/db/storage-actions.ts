'use server';

import { prisma } from '@/lib/prisma';
import { putObject } from '@/lib/storage/minio';
import { logger } from '@/lib/logger';

/**
 * Server-action ports of the image uploads in `clientQueries.ts`
 * (`uploadProfilePicture` / `uploadBackdropPicture`). Same signatures, so call
 * sites only swap the import. Supabase Storage → MinIO; the `users` row update
 * goes through Prisma. Returns `true`/`false` exactly like the originals.
 */

const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

async function uploadImage(
  file: File,
  userId: string | undefined,
  prefix: 'profile_pictures' | 'backdrop_pictures',
  column: 'image_url' | 'backdrop_url'
): Promise<boolean> {
  if (!userId) {
    logger.error('User not found or not authenticated');
    return false;
  }
  if (!VALID_MIME_TYPES.includes(file.type)) {
    logger.error(`Unsupported MIME type: ${file.type}`);
    return false;
  }
  try {
    const key = `${prefix}/${userId}/${Date.now()}`;
    const body = Buffer.from(await file.arrayBuffer());
    const url = await putObject(key, body, file.type);
    const data = column === 'image_url' ? { image_url: url } : { backdrop_url: url };
    await prisma.users.update({ where: { id: userId }, data });
    return true;
  } catch (error) {
    logger.error(`Error uploading ${prefix}:`, error);
    return false;
  }
}

export async function uploadProfilePicture(
  file: File,
  userId: string | undefined
): Promise<boolean> {
  return uploadImage(file, userId, 'profile_pictures', 'image_url');
}

export async function uploadBackdropPicture(
  file: File,
  userId: string | undefined
): Promise<boolean> {
  return uploadImage(file, userId, 'backdrop_pictures', 'backdrop_url');
}
