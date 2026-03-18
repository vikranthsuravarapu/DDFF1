import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || 'ddff-uploads';

export async function uploadProofPhoto(file: Express.Multer.File): Promise<string> {
  if (process.env.NODE_ENV !== 'production' || !process.env.GCS_BUCKET_NAME) {
    // In local development save to disk as before
    return `/uploads/proofs/${file.filename || file.originalname}`;
  }
  const bucket = storage.bucket(bucketName);
  const ext = file.originalname.substring(file.originalname.lastIndexOf('.'));
  const filename = `proofs/${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
  const blob = bucket.file(filename);
  await blob.save(file.buffer, {
    contentType: file.mimetype,
    metadata: { cacheControl: 'public, max-age=31536000' }
  });
  await blob.makePublic();
  return `https://storage.googleapis.com/${bucketName}/${filename}`;
}
