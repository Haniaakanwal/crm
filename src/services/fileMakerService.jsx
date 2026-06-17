const FM_CONFIG = {
  baseUrl: '/api/fmapi',   // ← changed
  database: 'Practice',
  layout: 'ApiLog',
  scriptName: 'DapiCALL',
  username: 'DAPI',
  password: 'dapi',
};

async function safeJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    console.warn('Non-JSON response body:', text.slice(0, 300));
    return { __raw: text };
  }
}


// ── Step 1: Create session ──────────────────────────────────────────
async function createSession() {
  const url = `${FM_CONFIG.baseUrl}/fmi/data/v1/databases/${FM_CONFIG.database}/sessions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${FM_CONFIG.username}:${FM_CONFIG.password}`)}`,
    },
  });

  const data = await safeJson(res);
  console.log('[Step 1] createSession status:', res.status, 'body:', data);

  if (!res.ok) {
    throw new Error(`FileMaker auth failed: ${res.status} ${JSON.stringify(data)}`);
  }

  const token = data?.response?.token;
  if (!token) throw new Error(`No token returned. Response: ${JSON.stringify(data)}`);

  return token;
}

// ── Step 2: Call script ──────────────────────────────────────────────
async function callScript(token, scriptParam = {}) {
  const paramStr = encodeURIComponent(JSON.stringify(scriptParam));
  const url = `${FM_CONFIG.baseUrl}/fmi/data/v1/databases/${FM_CONFIG.database}/layouts/${FM_CONFIG.layout}/script/${FM_CONFIG.scriptName}?script.param=${paramStr}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await safeJson(res);
  console.log('[Step 2] callScript status:', res.status, 'body:', data);

  if (!res.ok) {
    throw new Error(`Script call failed: ${res.status} ${JSON.stringify(data)}`);
  }

  const raw = data?.response?.scriptResult;
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    parsed = raw; // not JSON, return as-is
  }

  console.log('[Step 2] parsed scriptResult:', parsed);
  return parsed;
}

// ── Step 3: Delete session ───────────────────────────────────────────
async function deleteSession(token) {
  const url = `${FM_CONFIG.baseUrl}/fmi/data/v1/databases/${FM_CONFIG.database}/sessions/${token}`;
  try {
    const res = await fetch(url, { method: 'DELETE' });
    const data = await safeJson(res); // safe now — won't throw on empty body
    console.log('[Step 3] deleteSession status:', res.status, 'body:', data);
  } catch (e) {
    console.error('FileMaker logout failed:', e);
  }
}

// ── Generic runner ─────────────────────────────────────────────────
export async function runFileMakerScript(scriptParam = {}) {
  const token = await createSession();
  try {
    return await callScript(token, scriptParam);
  } finally {
    await deleteSession(token);
  }
}

// ── Used by Login.jsx ──────────────────────────────────────────────
export async function loginFileMaker(payload) {
  const token = await createSession();
  let result;
  try {
    result = await callScript(token, payload);
  } finally {
    await deleteSession(token);
  }
  return { token, result };
}