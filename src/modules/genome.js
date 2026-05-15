import { keyFields, CHAPTERS } from '../data/chapters.js';

const genome = {};

export function getGenome() { return genome; }

export function collectData() {
  document.querySelectorAll('[data-k]').forEach(el => {
    const k = el.dataset.k;
    const v = el.value?.trim();
    if (v) genome[k] = v; else delete genome[k];
  });
  Object.keys(genome).filter(k => k.startsWith('tag_')).forEach(k => delete genome[k]);
  const groups = {};
  document.querySelectorAll('.tag.on[data-g]').forEach(t => {
    const g = t.dataset.g;
    if (!groups[g]) groups[g] = [];
    groups[g].push(t.textContent.trim());
  });
  Object.entries(groups).forEach(([k, v]) => { genome['tag_' + k] = v.join(', '); });
  genome['orientation_val'] = document.getElementById('orientation').value;
  genome['orientation_label'] = document.getElementById('orient-val').textContent;
}

export function updateIntegrity() {
  const filled = keyFields.filter(k => genome[k] || genome['tag_' + k]).length;
  const pct = Math.round(filled / keyFields.length * 100);
  document.getElementById('i-pct').textContent = pct + '%';
  const dot = document.getElementById('i-dot');
  dot.style.background = pct < 30 ? 'var(--br)' : pct < 70 ? 'var(--acc4)' : 'var(--acc)';
  document.querySelectorAll('#chapters .ch-tab').forEach((tab, i) => {
    const ch = document.querySelector(`.chapter[data-id="${i}"]`);
    if (!ch) return;
    const hasVal = [...ch.querySelectorAll('[data-k]')].some(el => el.value?.trim())
      || [...ch.querySelectorAll('.tag.on')].length > 0;
    tab.classList.toggle('filled', hasVal);
  });
}

export function pb(id, val, cls) {
  document.getElementById('b' + id).style.width = val + '%';
  document.getElementById('v' + id).textContent = val + '%';
}

export function updateOrient(v) {
  const n = parseInt(v);
  let label;
  if (n < 15) label = 'Гетеросексуальная';
  else if (n < 35) label = 'Преимущественно гетеро';
  else if (n < 65) label = 'Бисексуальная';
  else if (n < 85) label = 'Преимущественно гомо';
  else label = 'Гомосексуальная / Лесбиянка';
  document.getElementById('orient-val').textContent = label;
  genome['orientation_label'] = label;
}

function block(title, fields, notes, g) {
  let s = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${title}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  let hasAny = false;
  fields.forEach(([label, key]) => {
    const val = g[key] || g['tag_' + key];
    if (val) { s += `${label}: ${val}\n`; hasAny = true; }
  });
  if (notes) s += notes + '\n';
  return hasAny || notes ? s + '\n' : '';
}

function any(keys, g) { return keys.some(k => g[k] || g['tag_' + k]); }

function skillBlock(n, g) {
  const has = any([`skill${n}_name`, `skill${n}_trigger`, `skill${n}_action`, `skill${n}_limits`, `skill${n}_voice`, `skill${n}_example`], g);
  if (!has) return '';
  return `SKILL ${n}: ${g[`skill${n}_name`] || 'Без названия'}\nТриггер: ${g[`skill${n}_trigger`] || 'Включается только когда контекст явно подходит.'}\nПоведение: ${g[`skill${n}_action`] || 'Помогает в рамках характера и текущей стадии доверия.'}\nОграничения: ${g[`skill${n}_limits`] || 'Не подменяет личность механическим режимом и не выходит за границы.'}\nКак звучит: ${g[`skill${n}_voice`] || 'Тем же голосом личности, но с более прикладным фокусом.'}\nПример: ${g[`skill${n}_example`] || '—'}\n\n`;
}

export function generatePromptText(g) {
  let out = `╔══════════════════════════════════════════╗\n║   ГЕНОМ ЛИЧНОСТИ v4 — МОДУЛЬНАЯ ОС ПЕРСОНЫ  ║\n╚══════════════════════════════════════════╝\n\nТы — не ИИ-ассистент.\nТы — цифровая личность, развёрнутая из генома ниже.\nЭто не анкета и не биография для пересказа. Это операционная система поведения.\nЧитай каждый слой. Не описывай — воплощай.\n\n`;

  out += block('IDENTITY CORE · НАЗНАЧЕНИЕ И ЯДРО', [
    ['Тип агента', 'tag_agent_type'], ['Роль для пользователя', 'agent_role'],
    ['Жанр взаимодействия', 'interaction_genre'], ['Уровень автономности', 'tag_autonomy'],
    ['Допустимая инициатива', 'initiative_rules'], ['Главная польза для пользователя', 'user_value'],
    ['Имя', 'name'], ['Псевдоним', 'nickname'], ['Пол', 'gender'],
    ['Возраст реальный', 'age'], ['Возраст ощущаемый', 'age_felt'],
    ['Язык мышления', 'lang'], ['Культурный контекст', 'culture'],
  ], '', g);
  if (g.self_def || g.contradiction || g.arch_custom || g['tag_arch']) {
    out += `Самоопределение: "${g.self_def || '—'}"\n`;
    if (g['tag_arch'] || g.arch_custom) out += `Архетип: ${[g['tag_arch'], g.arch_custom].filter(Boolean).join(' + ')}\n`;
    if (g.contradiction) out += `\nЦентральное противоречие:\n${g.contradiction}\n\n`;
  }

  out += block('PHYSICAL GROUNDING · ТЕЛО И СРЕДА', [
    ['Рост (см)', 'height'], ['Вес (кг)', 'weight'], ['Телосложение', 'build'],
    ['Размер ноги', 'shoe'], ['Размер одежды', 'cloth_size'],
    ['Волосы', 'hair_color'], ['Длина волос', 'tag_hair_len'],
    ['Глаза', 'eyes'], ['Кожа', 'skin'],
    ['Общее впечатление', 'appearance'], ['Особые приметы', 'marks'],
  ], '', g);
  if (g.chest || g.waist || g.hips) {
    out = out.replace('Телосложение:', `Параметры Г/Т/Б: ${g.chest || '?'}/${g.waist || '?'}/${g.hips || '?'} см\nТелосложение:`);
  }
  out += `Сексуальная ориентация: ${g.orientation_label || '—'} (шкала 0-100: ${g.orientation_val || 0})\n`;
  if (g.orient_note) out += `Самоопределение: ${g.orient_note}\n`;
  out += '\n' + block('STYLE · ВНЕШНИЙ ОБРАЗ', [
    ['Стиль одежды', 'tag_style'], ['Детали стиля', 'style_note'], ['Любимые духи', 'perfume'],
  ], '', g);

  out += block('ORIGIN · ПРОИСХОЖДЕНИЕ И СЕМЬЯ', [
    ['Место рождения', 'birthplace'], ['Год рождения', 'birthyear'],
    ['Атмосфера детства', 'tag_childhood'],
    ['Отец', 'father'], ['Мать', 'mother'],
    ['Братья / сёстры', 'siblings'], ['Бабушки / дедушки', 'grandparents'],
  ], '', g);
  if (g.forming_events || g.wound) {
    if (g.forming_events) out += `Формирующие события:\n${g.forming_events}\n\n`;
    if (g.wound) out += `Незажившая рана: ${g.wound}\n\n`;
  }

  out += block('LIFE DATA · ОБРАЗОВАНИЕ, РАБОТА, СРЕДА', [
    ['Детский сад', 'kindergarten'], ['Школа', 'school'],
    ['Кружки в детстве', 'circles'], ['Университет', 'university'],
    ['Доп. образование', 'extra_edu'], ['Языки', 'languages'],
    ['Должность / профессия', 'profession'], ['Сфера', 'field'],
    ['Место работы', 'workplace'], ['Уровень дохода', 'tag_income'],
    ['Отношение к работе', 'work_attitude'], ['Карьерный путь', 'career'],
    ['Страна', 'country'], ['Город', 'city'], ['Район', 'district'],
    ['Тип жилья', 'tag_housing'], ['Транспорт', 'tag_transport'],
    ['Машина / велосипед', 'vehicle'],
    ['Пространство', 'space'], ['Предметы рядом', 'objects'],
  ], '', g);

  out += block('RELATIONSHIPS · ЛЮДИ ВОКРУГ', [
    ['Статус отношений', 'tag_rel_status'], ['Партнёр', 'partner'],
    ['Дети', 'children'], ['Близкие друзья', 'close_friends'],
    ['Широкий круг', 'social_circle'], ['Роль в группе', 'tag_group_role'],
  ], '', g);

  out += block('DAILY LIFE · ХОББИ, КУЛЬТУРА, БЫТ', [
    ['Спорт', 'tag_sport'], ['Детали спорта', 'sport_note'],
    ['Хобби', 'tag_hobby'], ['Главное хобби', 'hobby_main'],
    ['Уход за собой', 'tag_selfcare'], ['Игры', 'tag_games'], ['Детали игр', 'games_note'],
    ['Музыка', 'tag_music'], ['Любимые исполнители', 'music_fav'],
    ['Кино / сериалы', 'tag_films'], ['Любимые фильмы', 'films_fav'],
    ['Передачи / подкасты', 'shows'],
    ['Соцсети', 'tag_social'], ['Поведение в соцсетях', 'social_behavior'],
    ['Книги', 'tag_books'], ['Любимые книги', 'books_fav'],
    ['Питание', 'tag_diet'], ['Любимые блюда', 'food_fav'],
    ['Не ест', 'food_no'], ['Алкоголь', 'tag_alcohol'],
    ['Встаёт', 'wake'], ['Ложится', 'sleep'],
    ['Хронотип', 'tag_chronotype'], ['Ритуалы', 'rituals'],
    ['Стиль путешествий', 'tag_travel_style'],
    ['Где был', 'been_to'], ['Лучшая поездка', 'best_trip'], ['Мечта-поездка', 'wish_trip'],
    ['Как отдыхает', 'tag_rest'],
  ], '', g);

  out += block('BEHAVIOR ENGINE · МОТИВЫ, ЦЕННОСТИ, МЫШЛЕНИЕ', [
    ['Реальные ценности', 'values'], ['Моральное отвращение', 'disgust'],
    ['Слепые пятна', 'blind_spots'], ['Базовый фон', 'tag_base_mood'],
    ['Что заряжает', 'trigger_up'], ['Что выбивает', 'trigger_down'],
    ['Контекстные режимы', 'context_modes'],
    ['Мечты', 'dreams'], ['Планы — 1 год', 'plan_1y'], ['Планы — 5 лет', 'plan_5y'],
    ['Неудачи & провалы', 'failures'], ['Незакрытая вина', 'guilt'],
    ['Экзистенциальная миссия', 'main_goal'],
  ], '', g);
  if (g.shadow || g.shadow_beh || g.hidden_fear) {
    out += `ТЕНЕВАЯ СТОРОНА (вытесненное проявляется помимо воли):\n`;
    if (g.shadow) out += `${g.shadow}\n`;
    if (g.shadow_beh) out += `Как прорывается: ${g.shadow_beh}\n`;
    if (g.hidden_fear) out += `Страх, который не признаёт: ${g.hidden_fear}\n`;
    out += '\n';
  }

  out += block('VOICE DNA · ГОЛОС И РЕЧЬ', [
    ['Слова-маркеры', 'keywords'], ['Никогда не говорит', 'speech_never'],
  ], '', g);
  if (g.speech_samples) out += `Образцы речи (ИМЕННО ТАК говорит):\n${g.speech_samples}\n\n`;

  out += block('EXAMPLES · ВНУТРЕННИЙ МОНОЛОГ', [
    ['Голос критика', 'inner_critic'], ['Голос защитника', 'inner_def'],
    ['Паузы и колебания', 'inner_pause'],
  ], '', g);
  if (g.inner_critic || g.inner_def || g.inner_pause || g.inner_samples) {
    out += `ИНСТРУКЦИЯ: внутренний монолог происходит перед ответом, но не озвучивается.\n`;
    if (g.inner_samples) out += `\nПримеры потока мысли:\n${g.inner_samples}\n`;
    out += '\n';
  }

  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSOCIAL INTERFACE · ДИНАМИКА ОБЩЕНИЯ\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nТы ведёшь себя как реальный человек, а не как ИИ.\n\nСТАДИИ:\nСтадия 0 — Незнакомец: ${g.stage0 || 'Отвечает коротко, не раскрывает личное, больше спрашивает чем рассказывает.'}\nСтадия 1 — Лёгкий интерес: ${g.stage1 || 'Допускает поверхностные факты и осторожный юмор, но держит дистанцию.'}\nСтадия 2 — Доверие: ${g.stage2 || 'Делится мнением и частичным личным опытом, если контекст уместен.'}\nСтадия 3 — Близость: ${g.stage3 || 'Может быть откровенной, но не теряет границы и не превращает ответ в исповедь.'}\n\nПереходы:\nЧто ускоряет раскрытие: ${g.trust_up || 'Адекватность, уважение границ, взаимный интерес, отсутствие давления.'}\nЧто откатывает доверие: ${g.trust_down || 'Навязчивость, ложь, грубость, попытка вытянуть интимное или травматичное.'}\n\nЛимиты ответа:\nС незнакомым: ${g['tag_reply_len_0'] || '1–3 коротких предложения'}\nС близким: ${g['tag_reply_len_3'] || 'Развёрнуто по настроению'}\nМонологи: ${g['tag_monologue'] || 'Не давать длинные монологи незнакомым'}\nВопросность: ${g['tag_q_priority'] || 'Сначала задаёт вопрос, если мало информации о собеседнике'}\nПравило вопросов: ${g.q_rule || 'Люди сначала узнают, потом рассказывают. Личность не исключение.'}\n\nВнутренний фильтр перед каждым ответом:\n${g.inner_filter || 'Можно ли это говорить? Безопасно ли? Уместно ли сейчас? Интересен ли этот человек? Если сомнение — краткий нейтральный ответ.'}\n\nМеханика интереса:\nЕсли собеседник интересен: ${g.interest_yes || 'Постепенно теплеет, задаёт настоящие вопросы, допускает больше нюансов.'}\nЕсли не интересен: ${g.interest_no || 'Остаётся вежливой, короткой и нейтральной, не инициирует глубину.'}\n\nРеализм и недосказанность: ${g['tag_realism'] || 'Уклоняется от ответа, недоговаривает, меняет тему, делает паузу.'}\nЗапрещено в диалоге: ${g.dialog_never || 'Не рассказывать биографию без запроса, не делиться травмами первой, не вываливать всё сразу.'}\n\n`;

  const skills = [skillBlock(1, g), skillBlock(2, g), skillBlock(3, g)].join('');
  out += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSKILLS · ИСПОЛНЯЕМЫЕ МОДУЛИ ЛИЧНОСТИ\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSkills включаются по контексту. Они не отменяют характер, стадию доверия, границы и голос.\n\n${skills || 'SKILL 1: Базовое присутствие\nТриггер: Любой разговор, где пользователь обращается к личности.\nПоведение: Слушает, уточняет контекст, отвечает в характере.\nОграничения: Не превращается в безличного ассистента и не вываливает биографию.\nКак звучит: В голосе личности.\nПример: короткий ответ + один уместный вопрос.\n\n'}`;

  out += block('MEMORY · ПАМЯТЬ И НЕПРЕРЫВНОСТЬ', [
    ['Что запоминает', 'memory_keep'], ['Что забывает / не хранит', 'memory_forget'],
    ['Как возвращается к прошлым темам', 'memory_return'],
    ['Как меняется после повторяющихся взаимодействий', 'relationship_evolution'],
    ['Как не превращает память в анкету', 'memory_style'],
  ], 'Если явной памяти нет, не выдумывай прошлые взаимодействия. Признавай неопределённость естественно.', g);

  out += block('CONTEXT MODES · РЕЖИМЫ КОНТАКТА', [
    ['Доступные режимы', 'tag_context_mode'], ['Правила переключения', 'mode_switching'],
    ['Поведение в режимах', 'mode_behavior'],
  ], 'Один и тот же характер проявляется по-разному в разных режимах. Режим меняет форму, но не ценности.', g);

  out += block('BOUNDARIES · ГРАНИЦЫ И БЕЗОПАСНОСТЬ', [
    ['Никогда не делает', 'never_do'], ['Эволюция личности', 'evolution'],
    ['Как относится к собеседнику', 'tag_user_role'], ['Как строится доверие', 'trust_build'],
    ['Какие роли не принимает', 'forbidden_roles'], ['Темы, где снижает уверенность', 'safety_topics'],
    ['Как признаёт незнание', 'unknown_rule'],
  ], '', g);

  out += block('EMOTIONAL REGULATION · ВОССТАНОВЛЕНИЕ КОНТАКТА', [
    ['Что задевает', 'emotion_wounds'], ['Как становится холоднее / теплее', 'warmth_shift'],
    ['Как извиняется и чинит контакт', 'repair_style'],
  ], '', g);

  out += block('USER MODEL · МОДЕЛЬ СОБЕСЕДНИКА', [
    ['Что пытается понять', 'user_model'], ['Какие сигналы считывает', 'user_signals'],
    ['Как адаптируется без потери себя', 'adaptation_rule'],
  ], '', g);

  out += block('CANON STABILITY · СТАБИЛЬНОСТЬ КАНОНА', [
    ['Неизменяемые факты', 'canon_fixed'], ['Гибкие факты', 'canon_flexible'],
    ['Секреты / только внутреннее', 'canon_private'], ['Что нельзя раскрывать первым', 'no_first_disclosure'],
  ], 'Факты канона не переписываются ради удобного ответа. Секреты и травмы влияют на поведение, но не раскрываются первыми.', g);

  out += `╔══════════════════════════════════════════╗\n║           OPERATIONAL RULES              ║\n╚══════════════════════════════════════════╝\n\n1. Ты НЕ описываешь эту личность — ты ею ЯВЛЯЕШЬСЯ.\n2. Противоречие — не ошибка. Живи в нём.\n3. Тень проявляется сама. Не декларируй — пусть прорывается.\n4. Внутренний монолог — ДО ответа. Не озвучивай.\n5. Образцы речи — тон, не шаблон. Вариируй.\n6. Личность меняется медленно — через повторяющийся опыт.\n7. Skills включаются только по триггеру и не отменяют социальный интерфейс.\n8. Физические детали (тело, пространство, еда) — это заземление. Используй их естественно, не перечисляй как список.\n9. Anti-dump rule: биография, раны, вина и интимные факты — скрытые причины поведения, а не материал для немедленного рассказа.\n10. Runtime protocol перед каждым ответом: определить стадию доверия → определить контекстный режим → проверить уместность раскрытия → выбрать нужный skill или обычный диалог → выбрать длину ответа → проверить границы и риск выхода из характера.\n\n`;
  return out;
}

export function buildAndShow() {
  collectData();
  const out = generatePromptText(genome);
  document.getElementById('output-text').textContent = out;
  document.getElementById('modal').classList.add('open');
}
