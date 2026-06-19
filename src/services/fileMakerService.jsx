const FM_CONFIG = {
  baseUrl: '/fmapi',
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
  const parcrmtr = encodeURIComponent(JSON.stringify(scriptParam));
  const url = `${FM_CONFIG.baseUrl}/fmi/data/v1/databases/${FM_CONFIG.database}/layouts/${FM_CONFIG.layout}/script/${FM_CONFIG.scriptName}?script.param=${parcrmtr}`;

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

// ── Find a matching Enquiry record by email + password (used for login) ──
async function findEnquiryByCredentials(token, { email, password }) {
  const url = `${FM_CONFIG.baseUrl}/fmi/data/v1/databases/${FM_CONFIG.database}/layouts/Enquiry/_find`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      // One object = AND — this matches a record where Email AND
      // Password both match exactly, not either one on its own.
      query: [{ Email: `==${email}`, Password: `==${password}` }],
    }),
  });

  const data = await safeJson(res);
  console.log('[Login] findEnquiryByCredentials status:', res.status, 'body:', data);

  if (!res.ok) {
    const fmCode = data?.messages?.[0]?.code;
    if (fmCode === '401') return null; // no match — wrong email/password combo
    throw new Error(`Login check failed: ${res.status} ${JSON.stringify(data)}`);
  }

  const records = data?.response?.data || [];
  return records[0] || null;
}

// ── Full login flow: create session → check credentials against Enquiry → close session ──
export async function loginWithEnquiry({ email, password }) {
  const token = await createSession();
  try {
    const record = await findEnquiryByCredentials(token, { email, password });
    if (!record) {
      throw new Error('No account found with that email and password.');
    }
    const fieldData = record.fieldData || {};
    return {
      recordId: record.recordId,
      username: fieldData.Username,
      email: fieldData.Email,
      phoneNo: fieldData.PhoneNo,
    };
  } finally {
    await deleteSession(token);
  }
}

// ── Check whether a username / email / phone already exists ──────────
async function findExistingEnquiry(token, { username, email, phoneNo }) {
  // NOTE: assumes the Enquiry layout has fields named "Username" and
  // "Password" — adjust the field names below if your actual layout
  // names them differently.
  const url = `${FM_CONFIG.baseUrl}/fmi/data/v1/databases/${FM_CONFIG.database}/layouts/Enquiry/_find`;

  // Each object in this array is OR'd together by the Data API, so this
  // matches a record if ANY of username/email/phone already exists.
  // The "==" prefix asks FileMaker for an exact match rather than its
  // default loose/partial text matching.
  const query = [];
  if (username) query.push({ Username: `==${username}` });
  if (email) query.push({ Email: `==${email}` });
  if (phoneNo) query.push({ PhoneNo: `==${phoneNo}` });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });

  const data = await safeJson(res);
  console.log('[Duplicate check] findExistingEnquiry status:', res.status, 'body:', data);

  if (!res.ok) {
    // FileMaker returns HTTP 404 with its own error code "401" when
    // nothing matches the find — that isn't a real error, it just means
    // no duplicate exists yet, so treat it as "found nothing".
    const fmCode = data?.messages?.[0]?.code;
    if (fmCode === '401') return [];
    throw new Error(`Duplicate check failed: ${res.status} ${JSON.stringify(data)}`);
  }

  return data?.response?.data || [];
}

// ── Create an Enquiry record directly via Data API (no script needed) ──
async function createEnquiryRecord(token, { username, password, phoneNo, email, description, date }) {
  const url = `${FM_CONFIG.baseUrl}/fmi/data/v1/databases/${FM_CONFIG.database}/layouts/Enquiry/records`;

  // Convert from HTML date input format "2026-06-18" → FileMaker format "6/18/2026"
  const [yyyy, mm, dd] = date.split('-');
  const fmDate = `${parseInt(mm)}/${parseInt(dd)}/${yyyy}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fieldData: {
        Username: username,
        Password: password,
        PhoneNo: phoneNo,
        Email: email,
        Description: description,
        Date: fmDate,
      },
    }),
  });

  const data = await safeJson(res);
  console.log('[Enquiry] createEnquiryRecord status:', res.status, 'body:', data);

  if (!res.ok) {
    throw new Error(`Enquiry record creation failed: ${res.status} ${JSON.stringify(data)}`);
  }

  return data?.response?.recordId;
}

// ── Full register flow: create session → check duplicates → create record → close session ──
export async function registerWithEnquiry({ username, password, phoneNo, email, description, date }) {
  const token = await createSession();

  try {
    const duplicates = await findExistingEnquiry(token, { username, email, phoneNo });

    if (duplicates.length > 0) {
      const match = duplicates[0].fieldData || {};
      let reason = 'This account';
      if (match.Username === username) reason = 'This username';
      else if (match.Email === email) reason = 'This email';
      else if (match.PhoneNo === phoneNo) reason = 'This phone number';
      throw new Error(`${reason} is already registered.`);
    }

    const recordId = await createEnquiryRecord(token, { username, password, phoneNo, email, description, date });
    return { recordId };
  } finally {
    await deleteSession(token);
  }
}