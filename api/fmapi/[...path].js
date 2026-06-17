export default async function handler(req, res) {
  const pathSegments = req.query.path || [];
  const path = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;
  const targetUrl = `https://fm.idiosol.com/${path}`;

  try {
    const headers = {};
    if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
    headers['Content-Type'] = 'application/json';

    const fmRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: (req.method !== 'GET' && req.method !== 'DELETE') ? JSON.stringify(req.body) : undefined,
    });

    const text = await fmRes.text();
    res.status(fmRes.status);

    if (!text) {
      return res.end();
    }

    try {
      res.json(JSON.parse(text));
    } catch {
      res.send(text);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}