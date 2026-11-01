/**
 * Zero-dependency S3 Signature V4 downloader for initial dev.db seeding.
 * Runs ONLY on first boot if Litestream does not yet have a replica in the bucket
 * and /data/dev.db does not exist locally.
 *
 * Upload your existing local prisma/dev.db to `seed/dev.db` in your Backblaze B2
 * or Cloudflare R2 bucket, and the container will import it automatically!
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const targetDbPath = process.env.SQLITE_DB_PATH || '/data/dev.db';
const bucket = (process.env.LITESTREAM_REPLICA_BUCKET || '').trim();
const rawEndpoint = (process.env.LITESTREAM_REPLICA_ENDPOINT || '').trim();
const region = (process.env.LITESTREAM_REPLICA_REGION || 'auto').trim();
const accessKeyId = (process.env.LITESTREAM_ACCESS_KEY_ID || '').trim();
const secretAccessKey = (process.env.LITESTREAM_SECRET_ACCESS_KEY || '').trim();
const seedKey = (process.env.INITIAL_SEED_S3_KEY || 'seed/dev.db').replace(/^\/+/, '');

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function encodeS3PathSegment(segment) {
  return encodeURIComponent(segment).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

async function main() {
  if (fs.existsSync(targetDbPath)) {
    console.log(`[Seed] Banco já presente em ${targetDbPath}. Pulando seed inicial.`);
    return;
  }

  if (!bucket || !rawEndpoint || !accessKeyId || !secretAccessKey) {
    console.log('[Seed] Variáveis S3 ausentes; iniciando com novo dev.db vazio.');
    return;
  }

  const endpointUrlStr = /^https?:\/\//i.test(rawEndpoint)
    ? rawEndpoint
    : `https://${rawEndpoint}`;
  const endpointUrl = new URL(endpointUrlStr);

  const encodedBucket = encodeS3PathSegment(bucket);
  const encodedKey = seedKey.split('/').map(encodeS3PathSegment).join('/');
  const basePath = endpointUrl.pathname.replace(/\/+$/, '');
  const canonicalUri = `${basePath}/${encodedBucket}/${encodedKey}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const emptyPayloadHash = sha256Hex('');

  const canonicalHeaders =
    `host:${endpointUrl.host}\n` +
    `x-amz-content-sha256:${emptyPayloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'GET',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    emptyPayloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign, 'utf8')
    .digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const requestUrl = `${endpointUrl.protocol}//${endpointUrl.host}${canonicalUri}`;
  console.log(`[Seed] Verificando carga inicial em s3://${bucket}/${seedKey}...`);

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      'x-amz-content-sha256': emptyPayloadHash,
      'x-amz-date': amzDate,
      Authorization: authorization,
    },
  });

  if (response.status === 404) {
    console.log(`[Seed] Arquivo ${seedKey} não encontrado no bucket. Um novo dev.db será criado pelas migrations.`);
    return;
  }

  if (!response.ok) {
    console.warn(`[Seed] Aviso: resposta HTTP ${response.status} ao buscar ${seedKey}. Prosseguindo sem seed.`);
    return;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const sqliteHeader = buffer.subarray(0, 16).toString('utf8');
  if (!sqliteHeader.startsWith('SQLite format 3')) {
    console.warn('[Seed] O arquivo baixado não possui cabeçalho válido SQLite3. Ignorando por segurança.');
    return;
  }

  fs.mkdirSync(path.dirname(targetDbPath), { recursive: true });
  const tmpPath = `${targetDbPath}.seed.tmp`;
  fs.writeFileSync(tmpPath, buffer);
  fs.renameSync(tmpPath, targetDbPath);
  console.log(`[Seed] Sucesso! dev.db inicial importado (${buffer.length} bytes).`);
}

main().catch((err) => {
  console.warn(`[Seed] Falha não-fatal ao verificar seed inicial: ${err.message}`);
});

