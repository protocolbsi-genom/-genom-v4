// Genom v4 API — Cloudflare Workers (zero dependencies)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function uid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function sha256(pw) {
  const enc = new TextEncoder();
  const d = enc.encode(pw + '::genom-v4-salt');
  const h = await crypto.subtle.digest('SHA-256', d);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function token() {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  for (let i = 0; i < 64; i++) t += c[Math.random() * c.length | 0];
  return t;
}

async function getUser(request, env) {
  const a = request.headers.get('Authorization');
  if (!a || !a.startsWith('Bearer ')) return null;
  const s = await env.DB.prepare(
    'SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now")'
  ).bind(a.slice(7)).first();
  if (!s) return null;
  return env.DB.prepare('SELECT id, email, name FROM users WHERE id = ?').bind(s.user_id).first();
}

function buildPrompt(g) {
  let out = 'Ты — цифровая личность, развёрнутая из генома ниже. Не описывай — воплощай.\n\n';
  if (g.name) out += `Имя: ${g.name}\n`;
  if (g.tag_agent_type) out += `Тип: ${g.tag_agent_type}\n`;
  if (g.agent_role) out += `Роль: ${g.agent_role}\n`;
  if (g.interaction_genre) out += `Жанр: ${g.interaction_genre}\n`;
  if (g.tag_autonomy) out += `Автономность: ${g.tag_autonomy}\n`;
  if (g.gender) out += `Пол: ${g.gender}\n`;
  if (g.age) out += `Возраст: ${g.age}\n`;
  if (g.self_def) out += `\nСамоопределение: "${g.self_def}"\n`;
  if (g.contradiction) out += `Центральное противоречие: ${g.contradiction}\n`;
  if (g.speech_samples) out += `\nОбразцы речи:\n${g.speech_samples}\n`;
  if (g.keywords) out += `Слова-маркеры: ${g.keywords}\n`;
  out += `\nAnti-dump rule: биография, раны, вина — скрытые причины, не материал для пересказа.\n`;
  out += `Раскрывайся постепенно, как живой человек.\n`;
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') return new Response(null, { headers: CORS });

    try {
      // POST /api/register
      if (path === '/api/register' && method === 'POST') {
        const { email, password, name } = await request.json();
        if (!email || !password) return json({ error: 'Email and password required' }, 400);
        if (password.length < 6) return json({ error: 'Password too short' }, 400);
        const e = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (e) return json({ error: 'Email already registered' }, 409);
        const id = uid();
        await env.DB.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?,?,?,?)')
          .bind(id, email, await sha256(password), name || '').run();
        const t = token();
        await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,datetime("now","+30 days"))')
          .bind(t, id).run();
        return json({ user: { id, email, name: name || '' }, token: t }, 201);
      }

      // POST /api/login
      if (path === '/api/login' && method === 'POST') {
        const { email, password } = await request.json();
        if (!email || !password) return json({ error: 'Email and password required' }, 400);
        const u = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
        if (!u) return json({ error: 'User not found' }, 404);
        if (u.password_hash !== await sha256(password)) return json({ error: 'Invalid password' }, 401);
        const t = token();
        await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,datetime("now","+30 days"))')
          .bind(t, u.id).run();
        return json({ user: { id: u.id, email: u.email, name: u.name }, token: t });
      }

      // GET /api/me
      if (path === '/api/me' && method === 'GET') {
        const user = await getUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);
        return json({ user });
      }

      // GET /api/personas
      if (path === '/api/personas' && method === 'GET') {
        const user = await getUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);
        const { results } = await env.DB.prepare(
          'SELECT id, name, updated_at FROM personas WHERE user_id = ? ORDER BY updated_at DESC'
        ).bind(user.id).all();
        return json({ personas: results });
      }

      // POST /api/personas
      if (path === '/api/personas' && method === 'POST') {
        const user = await getUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);
        const { id, name, data } = await request.json();
        if (!name || !data) return json({ error: 'Name and data required' }, 400);
        const now = new Date().toISOString();
        if (id) {
          const ex = await env.DB.prepare('SELECT id FROM personas WHERE id=? AND user_id=?').bind(id, user.id).first();
          if (ex) {
            await env.DB.prepare('UPDATE personas SET name=?, data=?, updated_at=? WHERE id=?')
              .bind(name, JSON.stringify(data), now, id).run();
            return json({ persona: { id, name, updated_at: now } });
          }
        }
        const nid = uid();
        await env.DB.prepare('INSERT INTO personas (id, user_id, name, data) VALUES (?,?,?,?)')
          .bind(nid, user.id, name, JSON.stringify(data)).run();
        return json({ persona: { id: nid, name, updated_at: now } }, 201);
      }

      // DELETE /api/personas/:id
      if (path.startsWith('/api/personas/') && method === 'DELETE') {
        const user = await getUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);
        const pid = path.split('/')[3];
        const r = await env.DB.prepare('DELETE FROM personas WHERE id=? AND user_id=?').bind(pid, user.id).run();
        if (r.meta.changes === 0) return json({ error: 'Not found' }, 404);
        return json({ success: true });
      }

      // POST /api/analyze — OpenRouter AI analysis
      if (path === '/api/analyze' && method === 'POST') {
        const user = await getUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);
        const { text } = await request.json();
        if (!text) return json({ error: 'Text required' }, 400);
        const key = env.OPENROUTER_API_KEY;
        if (!key) return json({ error: 'AI not configured' }, 503);

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': url.origin },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Analyze the text as a personality profile. Identify present and missing v4 genome layers. Be concise.' },
              { role: 'user', content: text },
            ],
            max_tokens: 2000,
          }),
        });
        const result = await res.json();
        return json({ analysis: result.choices?.[0]?.message?.content || 'No analysis' });
      }

      // POST /api/chat — chat with a persona via AI
      if (path === '/api/chat' && method === 'POST') {
        const user = await getUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);
        const { personaId, message } = await request.json();
        if (!personaId || !message) return json({ error: 'Persona ID and message required' }, 400);
        const p = await env.DB.prepare('SELECT data FROM personas WHERE id=? AND user_id=?')
          .bind(personaId, user.id).first();
        if (!p) return json({ error: 'Persona not found' }, 404);
        const g = JSON.parse(p.data);
        const key = env.OPENROUTER_API_KEY;
        if (!key) return json({ error: 'AI not configured' }, 503);

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': url.origin },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: buildPrompt(g) },
              { role: 'user', content: message },
            ],
            max_tokens: 1000,
          }),
        });
        const result = await res.json();
        return json({ reply: result.choices?.[0]?.message?.content || 'No response' });
      }

      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};
