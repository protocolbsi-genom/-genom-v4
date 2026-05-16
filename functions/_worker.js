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

function getChapterMap() {
  const chapters = [
    { n: 'Ядро', i: '✦', f: [
      ['name','Имя','коротко, 1-2 слова'],['nickname','Прозвище','одно слово или пара'],
      ['gender','Пол','одно слово'],['age','Возраст','число'],['age_felt','Ощущаемый возраст','число'],
      ['lang','Язык','коротко, какие'],['self_def','Самоопределение','1-2 предложения, суть'],
      ['contradiction','Противоречие','2-3 предложения, внутренний конфликт'],
      ['arch_custom','Архетип','коротко'],['agent_role','Роль для пользователя','1-2 предложения'],
      ['interaction_genre','Жанр общения','коротко'],['initiative_rules','Правила инициативы','1-2 предложения'],
      ['user_value','Польза для пользователя','1-2 предложения'],
    ]},
    { n: 'Тело', i: '◉', f: [
      ['height','Рост','число в см'],['weight','Вес','число в кг'],['build','Телосложение','1-2 слова'],
      ['chest','Грудь','число в см'],['waist','Талия','число в см'],['hips','Бёдра','число в см'],
      ['shoe','Размер ноги','число'],['cloth_size','Размер одежды','коротко'],
      ['hair_color','Цвет волос','1-3 слова'],['eyes','Цвет глаз','1-3 слова'],['skin','Кожа','коротко'],
      ['appearance','Внешность','3-4 предложения, общее впечатление'],
      ['marks','Особые приметы','1-2 предложения'],
      ['orient_note','Ориентация','1 предложение'],['style_note','Стиль','2-3 предложения'],
      ['perfume','Духи','коротко'],
    ]},
    { n: 'Происхождение', i: '⌂', f: [
      ['birthplace','Место рождения','город, страна'],['birthyear','Год рождения','число'],
      ['culture','Культурная среда','2-3 предложения'],
      ['father','Отец','2-3 предложения, кто и отношения'],
      ['mother','Мать','2-3 предложения, кто и отношения'],
      ['siblings','Братья/сёстры','2-3 предложения'],
      ['grandparents','Бабушки/дедушки','2-3 предложения'],
      ['forming_events','Формирующие события','3-5 предложений, 2-3 события'],
      ['wound','Рана','2-3 предложения, что болит'],
    ]},
    { n: 'Образование', i: '◈', f: [
      ['kindergarten','Детский сад','1-2 предложения'],['school','Школа','2-3 предложения'],
      ['circles','Кружки','1-2 предложения'],['university','Университет','2-3 предложения'],
      ['extra_edu','Доп. образование','1-2 предложения'],['languages','Языки','список через запятую'],
    ]},
    { n: 'Профессия', i: '◆', f: [
      ['profession','Должность','1-2 слова'],['field','Сфера','1-2 слова'],
      ['workplace','Место работы','1-2 предложения'],
      ['work_attitude','Отношение к работе','2-3 предложения'],
      ['career','Карьерный путь','3-4 предложения, история'],
    ]},
    { n: 'Место жизни', i: '⊙', f: [
      ['country','Страна','одно слово'],['city','Город','название'],
      ['district','Район','1-2 предложения'],['space','Дом/квартира','2-3 предложения'],
      ['objects','Предметы рядом','2-3 предложения'],['vehicle','Транспорт','1-2 предложения'],
    ]},
    { n: 'Люди', i: '◎', f: [
      ['partner','Партнёр','2-3 предложения'],['children','Дети','1-2 предложения'],
      ['close_friends','Близкие друзья','2-3 предложения'],['social_circle','Окружение','2-3 предложения'],
    ]},
    { n: 'Хобби', i: '▲', f: [
      ['sport_note','Спорт','1-2 предложения'],['hobby_main','Главное хобби','2-3 предложения'],
      ['games_note','Игры','1-2 предложения'],
    ]},
    { n: 'Культура', i: '♪', f: [
      ['music_fav','Любимая музыка','2-3 предложения'],['films_fav','Любимые фильмы','2-3 предложения'],
      ['shows','Передачи','1-2 предложения'],['social_behavior','Поведение в соцсетях','2-3 предложения'],
      ['books_fav','Любимые книги','2-3 предложения'],
    ]},
    { n: 'Еда и Быт', i: '❋', f: [
      ['food_fav','Любимая еда','2-3 предложения'],['food_no','Что не ест','1-2 предложения'],
      ['wake','Во сколько встаёт','коротко'],['sleep','Во сколько ложится','коротко'],
      ['rituals','Ритуалы','2-3 предложения'],
    ]},
    { n: 'Путешествия', i: '✈', f: [
      ['been_to','Где был','2-3 предложения'],['best_trip','Лучшая поездка','2-3 предложения'],
      ['wish_trip','Мечта-поездка','2-3 предложения'],
    ]},
    { n: 'Ценности', i: '◇', f: [
      ['values','Ценности','2-3 предложения'],['disgust','Отвращение','1-2 предложения'],
      ['shadow','Тень','2-3 предложения'],['shadow_beh','Как тень прорывается','2-3 предложения'],
      ['hidden_fear','Скрытый страх','2-3 предложения'],
    ]},
    { n: 'Мышление', i: '⬡', f: [
      ['blind_spots','Слепые пятна','2-3 предложения'],
    ]},
    { n: 'Эмоции', i: '♡', f: [
      ['trigger_up','Что заряжает','2-3 предложения'],['trigger_down','Что выбивает','2-3 предложения'],
      ['context_modes','Режимы','2-3 предложения'],
    ]},
    { n: 'Голос', i: '≋', f: [
      ['speech_samples','Образцы речи','3-5 фраз-примеров'],['keywords','Слова-маркеры','список через запятую'],
      ['speech_never','Никогда не говорит','1-2 предложения'],
    ]},
    { n: 'Монолог', i: '⬣', f: [
      ['inner_critic','Внутренний критик','2-3 предложения'],
      ['inner_def','Внутренний защитник','2-3 предложения'],
      ['inner_pause','Паузы и сомнения','1-2 предложения'],
      ['inner_samples','Примеры мыслей','3-5 примеров'],
    ]},
    { n: 'Мечты', i: '★', f: [
      ['dreams','Мечты','2-3 предложения'],['plan_1y','Планы на 1 год','1-2 предложения'],
      ['plan_5y','Планы на 5 лет','2-3 предложения'],['failures','Неудачи','2-3 предложения'],
      ['guilt','Вина','2-3 предложения'],['main_goal','Главная цель','2-3 предложения'],
    ]},
    { n: 'Рамки', i: '⬟', f: [
      ['never_do','Никогда не делает','2-3 предложения'],['evolution','Эволюция','2-3 предложения'],
      ['trust_build','Как строится доверие','2-3 предложения'],
    ]},
    { n: 'Диалог', i: '◈', f: [
      ['stage0','Незнакомец','1-2 предложения'],['stage1','Интерес','1-2 предложения'],
      ['stage2','Доверие','1-2 предложения'],['stage3','Близость','1-2 предложения'],
      ['trust_up','Что повышает доверие','1-2 предложения'],
      ['trust_down','Что снижает доверие','1-2 предложения'],
      ['q_rule','Правило вопросов','1-2 предложения'],
      ['inner_filter','Внутренний фильтр','2-3 предложения'],
      ['interest_yes','Если интересен','1-2 предложения'],
      ['interest_no','Если не интересен','1-2 предложения'],
      ['dialog_never','Запрещено','2-3 предложения'],
    ]},
    { n: 'Skills', i: '✦', f: [
      ['skill1_name','Skill 1 — название','коротко'],['skill1_trigger','Skill 1 — триггер','1-2 предложения'],
      ['skill1_action','Skill 1 — поведение','2-3 предложения'],['skill1_limits','Skill 1 — ограничения','1-2 предложения'],
      ['skill1_voice','Skill 1 — голос','1-2 предложения'],['skill1_example','Skill 1 — пример','2-3 предложения'],
      ['skill2_name','Skill 2 — название','коротко'],['skill2_trigger','Skill 2 — триггер','1-2 предложения'],
      ['skill2_action','Skill 2 — поведение','2-3 предложения'],['skill2_limits','Skill 2 — ограничения','1-2 предложения'],
      ['skill2_voice','Skill 2 — голос','1-2 предложения'],['skill2_example','Skill 2 — пример','2-3 предложения'],
      ['skill3_name','Skill 3 — название','коротко'],['skill3_trigger','Skill 3 — триггер','1-2 предложения'],
      ['skill3_action','Skill 3 — поведение','2-3 предложения'],['skill3_limits','Skill 3 — ограничения','1-2 предложения'],
      ['skill3_voice','Skill 3 — голос','1-2 предложения'],['skill3_example','Skill 3 — пример','2-3 предложения'],
    ]},
    { n: 'Память', i: '◎', f: [
      ['memory_keep','Что запоминает','2-3 предложения'],['memory_forget','Что забывает','1-2 предложения'],
      ['memory_return','Как возвращается','1-2 предложения'],
      ['relationship_evolution','Как меняется','2-3 предложения'],['memory_style','Стиль памяти','1-2 предложения'],
    ]},
    { n: 'Режимы', i: '▣', f: [
      ['mode_switching','Переключение','2-3 предложения'],['mode_behavior','Поведение в режимах','2-3 предложения'],
    ]},
    { n: 'Безопасность', i: '◇', f: [
      ['forbidden_roles','Запрещённые роли','2-3 предложения'],['safety_topics','Неуверенные темы','1-2 предложения'],
      ['unknown_rule','Как признаёт незнание','1-2 предложения'],
      ['emotion_wounds','Что задевает','2-3 предложения'],['warmth_shift','Как теплеет/холодеет','2-3 предложения'],
      ['repair_style','Как чинит контакт','2-3 предложения'],
    ]},
    { n: 'Канон', i: '⬢', f: [
      ['user_model','Модель собеседника','2-3 предложения'],['user_signals','Сигналы','1-2 предложения'],
      ['adaptation_rule','Адаптация','2-3 предложения'],
      ['canon_fixed','Неизменные факты','2-3 предложения'],['canon_flexible','Гибкие факты','2-3 предложения'],
      ['canon_private','Секреты','2-3 предложения'],['no_first_disclosure','Что нельзя раскрывать','2-3 предложения'],
    ]},
  ];
  let out = 'ПОЛНАЯ СТРУКТУРА ГЕНОМА (24 главы):\n';
  chapters.forEach((c, i) => {
    out += `\nГлава ${i} «${c.i} ${c.n}»:\n`;
    c.f.forEach(([key, label, fmt]) => {
      out += `  ${key} — ${label} [${fmt}]\n`;
    });
  });
  out += '\nТэги (выбор одного или нескольких значений): agent_type, arch, hair_len, childhood, rel_status, chronotype, income, housing, alcohol, diet, base_mood, autonomy, sport, hobby, music, style, transport, group_role, realism, travel_style, rest';
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
            model: 'deepseek/deepseek-chat',
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
        const { personaId, genome, message } = await request.json();
        if (!message) return json({ error: 'Message required' }, 400);
        let g;
        if (personaId) {
          const p = await env.DB.prepare('SELECT data FROM personas WHERE id=? AND user_id=?')
            .bind(personaId, user.id).first();
          if (!p) return json({ error: 'Persona not found' }, 404);
          g = JSON.parse(p.data);
        } else if (genome) {
          g = genome;
        } else {
          return json({ error: 'Persona ID or genome data required' }, 400);
        }
        const key = env.OPENROUTER_API_KEY;
        if (!key) return json({ error: 'AI not configured' }, 503);

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': url.origin },
          body: JSON.stringify({
            model: 'deepseek/deepseek-chat',
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

      // POST /api/generate — AI generates text for current chapter fields
      if (path === '/api/generate' && method === 'POST') {
        const user = await getUser(request, env);
        if (!user) return json({ error: 'Unauthorized' }, 401);
        const { description, chapterName, chapterFields, chapterValues, fullGenome, previousDescription } = await request.json();
        if (!description) return json({ error: 'Description required' }, 400);

        const filledLines = [];
        const specLines = [];
        const chFieldKeys = (chapterFields || []).map(f => f.key || f);
        (chapterFields || []).forEach(f => {
          const k = f.key || f;
          const label = f.label || k;
          const fmt = f.format || 'текст';
          let v = chapterValues?.[k];
          specLines.push('  ' + label + ' [' + fmt + ']');
          if (v) filledLines.push('  ' + label + ': «' + v + '»');
        });

        const knownData = [];
        if (fullGenome) {
          Object.entries(fullGenome).filter(([k]) => !k.startsWith('tag_') && !chFieldKeys.includes(k) && k !== 'orientation_val').forEach(([k, v]) => {
            if (v) knownData.push('  ' + k + ': ' + (typeof v === 'string' && v.length > 120 ? v.slice(0, 120) + '...' : v));
          });
          Object.entries(fullGenome).filter(([k]) => k.startsWith('tag_')).forEach(([k, v]) => {
            if (v) knownData.push('  ' + k.replace('tag_', '') + ': ' + v);
          });
        }

        const sysPrompt = 'Ты — генератор текста для полей персонажа. Пользователь описывает персонажа — ты заполняешь поля текущей главы. Верни ТОЛЬКО JSON, где ключи — названия полей, значения — сгенерированный текст. Никаких пояснений, никакого форматирования, только {"field1": "текст", "field2": "текст"}. Соблюдай указанный формат для каждого поля.\n\n'
          + getChapterMap();

        let context = 'Глава: ' + (chapterName || '?') + '\n\nПоля этой главы (что нужно заполнить):\n' + specLines.join('\n') + '\n\n';
        if (filledLines.length) context += 'Уже заполнено в этой главе (не перезаписывать без явной просьбы):\n' + filledLines.join('\n') + '\n\n';
        if (knownData.length) context += 'Другие данные персонажа (для согласованности):\n' + knownData.slice(0, 25).join('\n') + '\n\n';
        if (previousDescription) context += 'Предыдущее описание этого персонажа: ' + previousDescription + '\n\n';
        context += 'Описание пользователя:\n' + description;

        const key = env.OPENROUTER_API_KEY;
        if (!key) return json({ error: 'AI not configured' }, 503);

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}`, 'HTTP-Referer': url.origin },
          body: JSON.stringify({
            model: 'deepseek/deepseek-chat',
            messages: [
              { role: 'system', content: sysPrompt },
              { role: 'user', content: context },
            ],
            max_tokens: 2000,
            temperature: 0.4,
          }),
        });
        const result = await res.json();
        const text = result.choices?.[0]?.message?.content || '';
        try {
          const parsed = JSON.parse(text);
          return json({ fields: parsed });
        } catch {
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              const parsed = JSON.parse(match[0]);
              return json({ fields: parsed });
            } catch {}
          }
          return json({ fields: null, raw: text }, 200);
        }
      }

      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};
