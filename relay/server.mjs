import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 4010);
const RELAY_API_KEY = process.env.RELAY_API_KEY || '';
const RELAY_MODE = process.env.RELAY_MODE || 'mock';
const RELAY_NETWORK = process.env.RELAY_NETWORK || 'Pi Testnet';
const RELAY_CONTRACT_ADDRESS = process.env.RELAY_CONTRACT_ADDRESS || 'pi-testnet-prototype-contract';
const RELAY_RPC_URL = process.env.RELAY_RPC_URL || 'https://rpc.testnet.minepi.com';
const RELAY_CHECK_RPC = String(process.env.RELAY_CHECK_RPC || 'true').toLowerCase() === 'true';
const LOG_PATH = path.join(__dirname, 'data', 'mint-log.json');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

function unauthorized(res) {
  sendJson(res, 401, { error: 'Unauthorized relay request.' });
}

function getBearerToken(req) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return '';
  return header.slice('Bearer '.length).trim();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Request too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function buildTxHash(seed) {
  return '0x' + crypto.createHash('sha256').update(seed).digest('hex');
}

function buildTokenId(artworkId) {
  return `${artworkId}-${Date.now()}`;
}

async function rpcHealth() {
  const response = await fetch(RELAY_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

function appendLog(entry) {
  let existing = [];
  if (fs.existsSync(LOG_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8')); } catch {}
  }
  existing.push(entry);
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(existing, null, 2));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/health' && req.method === 'GET') {
      let rpc = null;
      if (RELAY_CHECK_RPC) {
        try { rpc = await rpcHealth(); } catch (error) { rpc = { ok: false, error: error instanceof Error ? error.message : 'RPC check failed.' }; }
      }
      return sendJson(res, 200, {
        ok: true,
        relayMode: RELAY_MODE,
        relayNetwork: RELAY_NETWORK,
        relayContractAddress: RELAY_CONTRACT_ADDRESS,
        relayRpcUrl: RELAY_RPC_URL,
        rpc,
      });
    }

    if (req.url === '/mint' && req.method === 'POST') {
      if (RELAY_API_KEY && getBearerToken(req) !== RELAY_API_KEY) return unauthorized(res);
      const body = await readBody(req);
      const artworkId = Number(body.artworkId || 0);
      if (!artworkId) return sendJson(res, 400, { error: 'artworkId is required.' });

      let rpc = null;
      if (RELAY_CHECK_RPC) {
        try {
          rpc = await rpcHealth();
        } catch (error) {
          return sendJson(res, 502, { error: error instanceof Error ? error.message : 'RPC health check failed.' });
        }
      }

      if (RELAY_MODE === 'manual') {
        return sendJson(res, 501, {
          error: 'Relay is in manual mode. Switch RELAY_MODE=mock to test the app flow, or add a real contract sender here later.',
          rpc,
        });
      }

      const submittedAt = new Date();
      const tokenId = buildTokenId(artworkId);
      const txHash = buildTxHash(`${artworkId}:${submittedAt.toISOString()}:${Math.random()}`);
      const mintReference = typeof body.paymentIdentifier === 'string' && body.paymentIdentifier.trim()
        ? body.paymentIdentifier.trim()
        : `relay-${artworkId}-${Date.now()}`;

      const result = {
        network: RELAY_NETWORK,
        contractAddress: RELAY_CONTRACT_ADDRESS,
        tokenId,
        txHash,
        mintReference,
        submittedAt: submittedAt.toISOString(),
        confirmedAt: submittedAt.toISOString(),
        provider: 'relay-mock',
        rpc,
      };

      appendLog({ createdAt: submittedAt.toISOString(), request: body, result });
      return sendJson(res, 200, result);
    }

    sendJson(res, 404, { error: 'Not found.' });
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : 'Unexpected relay error.' });
  }
});

server.listen(PORT, () => {
  console.log(`Pi prototype relay listening on http://localhost:${PORT}`);
  console.log(`Mode: ${RELAY_MODE}`);
  console.log(`RPC: ${RELAY_RPC_URL}`);
});
