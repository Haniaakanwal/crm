const FM_CONFIG = {
  baseUrl: 'https://fm.idiosol.com',
  database: 'Practice',
  layout: 'ApiLog',
  scriptName: 'DapiCALL',
  credentials: {
    username: 'DAPI',
    password: 'dapi',
  },
};

// 1. CREATE SESSION
export async function createSession() {
  const url = `${FM_CONFIG.baseUrl}/fmi/data/v1/databases/${FM_CONFIG.database}/sessions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:
        'Basic ' +
        btoa(
          `${FM_CONFIG.credentials.username}:${FM_CONFIG.credentials.password}`
        ),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.messages?.[0]?.message || 'Session failed');
  }

  return data.response.token;
}

// 2. CALL SCRIPT
export async function callScript(token, payload) {
  const param =
    typeof payload === 'string' ? payload : JSON.stringify(payload);

  const url = `${FM_CONFIG.baseUrl}/fmi/data/v1/databases/${FM_CONFIG.database}/layouts/${FM_CONFIG.layout}/script/${FM_CONFIG.scriptName}?script.param=${encodeURIComponent(
    param
  )}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.messages?.[0]?.message || 'Script failed');
  }

  return data?.response?.scriptResult;
}

// 3. DELETE SESSION (logout)
export async function deleteSession(token) {
  try {
    await fetch(
      `${FM_CONFIG.baseUrl}/fmi/data/v1/databases/${FM_CONFIG.database}/sessions/${token}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (err) {
    console.error('Logout failed:', err);
  }
}

// 4. LOGIN FLOW (IMPORTANT)
export async function loginFileMaker(payload) {
  const token = await createSession();
  const result = await callScript(token, payload);

  return { token, result };
}
export async function runFileMakerScript(scriptParam = '') {
  const token = await createSession();

  try {
    const result = await callScript(token, scriptParam);
    return result;
  } finally {
    await deleteSession(token);
  }
}