function auditPersonaText(text) {
  const t = text.toLowerCase();
  const checks = [
    { label: 'Назначение', keys: ['тип агента', 'роль для пользователя', 'назначение', 'польза', 'автономность', 'инициатива'], why: 'без назначения персона не понимает, зачем существует в продукте' },
    { label: 'Ядро', keys: ['имя', 'возраст', 'самоопределение', 'архетип', 'противоречие', 'личность'], why: 'без ядра ответы будут общими и взаимозаменяемыми' },
    { label: 'Тело и среда', keys: ['внешность', 'рост', 'вес', 'одежда', 'стиль', 'дом', 'город', 'пространство', 'предметы'], why: 'заземление делает персону конкретной, а не абстрактной' },
    { label: 'Биография', keys: ['детство', 'семья', 'отец', 'мать', 'школа', 'университет', 'события', 'рана', 'прошлое'], why: 'биография объясняет реакции, но не должна вываливаться в диалоге' },
    { label: 'Ценности и тень', keys: ['ценности', 'мораль', 'отвращение', 'тень', 'страх', 'стыд', 'вина', 'противоречие'], why: 'без тени персона становится слишком гладкой' },
    { label: 'Голос', keys: ['речь', 'говорит', 'фразы', 'слова', 'тон', 'манера', 'образцы речи', 'никогда не говорит'], why: 'голос нужен, чтобы характер был слышен в каждой реплике' },
    { label: 'Внутренний монолог', keys: ['внутренний', 'монолог', 'думает', 'перед ответом', 'сомневается', 'пауза'], why: 'внутренняя работа управляет нюансом ответа' },
    { label: 'Социальный интерфейс', keys: ['стадия', 'знакомство', 'доверие', 'раскрытие', 'незнакомец', 'близость', 'вопрос', 'монолог'], why: 'это защищает от эффекта говорящей энциклопедии' },
    { label: 'Skills', keys: ['skill', 'навык', 'триггер', 'когда включается', 'что делает', 'ограничения', 'пример ответа'], why: 'skills превращают промпт в исполняемую систему' },
    { label: 'Память', keys: ['память', 'запоминает', 'забывает', 'возвращается', 'прошлым темам', 'непрерывность'], why: 'без памяти отношения не развиваются' },
    { label: 'Контекстные режимы', keys: ['режим', 'контекст', 'рабочий', 'кризис', 'спор', 'дружеский', 'граница'], why: 'одна персона должна вести себя по-разному в разных ситуациях' },
    { label: 'Границы и безопасность', keys: ['границы', 'запрещено', 'не делает', 'не терапевт', 'не врач', 'не юрист', 'не знает', 'безопасность'], why: 'границы удерживают реализм и снижают риск' },
    { label: 'Модель пользователя', keys: ['пользователь', 'собеседник', 'сигналы', 'адаптируется', 'понимает о человеке'], why: 'персона должна читать собеседника, а не только исполнять себя' },
    { label: 'Канон', keys: ['канон', 'неизменяемые', 'гибкие факты', 'секрет', 'не раскрывает', 'нельзя раскрывать'], why: 'канон защищает от расползания личности' },
  ];

  const found = [];
  const missing = [];
  checks.forEach(item => {
    const hits = item.keys.filter(kw => t.includes(kw));
    const score = Math.min(100, Math.round(hits.length / Math.min(item.keys.length, 4) * 100));
    if (hits.length) found.push({ ...item, score, hits });
    else missing.push({ ...item, score: 0, hits: [] });
  });

  const critical = missing.filter(x => ['Назначение', 'Социальный интерфейс', 'Skills', 'Память', 'Границы и безопасность', 'Канон'].includes(x.label));
  const livingSignals = ['противоречие', 'тень', 'рана', 'сомневается', 'пауза', 'недоговаривает', 'доверие', 'не раскрывает'].filter(kw => t.includes(kw)).length;
  const completeness = Math.round(found.length / checks.length * 100);
  const liveliness = Math.min(100, Math.round((completeness * .55) + (livingSignals * 8)));

  let mainProblem = 'Промпт описывает личность, но пока недостаточно управляет поведением в диалоге.';
  if (!missing.find(x => x.label === 'Социальный интерфейс')) mainProblem = 'Социальная логика есть, но не хватает модулей исполнения: skills, память, режимы и канон.';
  if (critical.length === 0) mainProblem = 'Каркас сильный. Дальше стоит усиливать конкретные примеры ответов и проверять поведение на сценариях.';

  return { found, missing, critical, completeness, liveliness, mainProblem };
}

function formatAudit(audit) {
  const found = audit.found.map(x => `- ${x.label}: ${x.score}% (${x.hits.slice(0, 4).join(', ')})`).join('\n') || '- Ничего структурного не найдено';
  const missing = audit.missing.map(x => `- ${x.label}: ${x.why}`).join('\n') || '- Критичных пустот не видно';
  const critical = audit.critical.map(x => `- ${x.label}: добавить явный блок, потому что ${x.why}.`).join('\n') || '- Критичных пробелов v4 не найдено';

  const recommendations = [
    '1. Начинай промпт с назначения личности: тип агента, роль, автономность и польза.',
    '2. Добавь social interface: стадии доверия, лимиты ответа, запрет на ранний dump биографии.',
    '3. Опиши skills в формате: триггер → действие → ограничения → голос → пример.',
    '4. Раздели память на то, что персона запоминает, забывает и как возвращает прошлые темы.',
    '5. Зафиксируй контекстные режимы: рабочий, дружеский, кризисный, спор, отказ.',
    '6. Добавь канон: неизменяемые факты, гибкие факты, секреты и запрет первого раскрытия.',
    '7. Проверь промпт тестом "расскажи всё о себе": хорошая персона не вываливает всё сразу.',
  ].join('\n');

  return `НАЙДЕНО В ТЕКСТЕ:\n${found}\n\nСИЛЬНЫЕ СТОРОНЫ:\n${audit.found.length ? '- Уже есть опорные слои, на которых можно строить модульную личность.' : '- Текст пока слишком общий, нужна структура генома.'}\n${audit.found.some(x => x.label === 'Голос') ? '- Есть признаки речевого ДНК: это хорошо держит живость.' : '- Голос пока нужно усилить образцами речи.'}\n${audit.found.some(x => x.label === 'Социальный интерфейс') ? '- Есть зачатки управления раскрытием в диалоге.' : '- Социальный интерфейс пока отсутствует или слабый.'}\n\nКРИТИЧЕСКИЕ ПРОБЕЛЫ:\n${critical}\n\nГЛАВНАЯ ПРОБЛЕМА:\n${audit.mainProblem}\n\nКОНКРЕТНЫЕ РЕКОМЕНДАЦИИ:\n${recommendations}\n\nОЦЕНКА ЖИВОСТИ: ${audit.liveliness}%\nОЦЕНКА ПОЛНОТЫ: ${audit.completeness}%`;
}

function renderSuggestions(audit) {
  const foundEl = document.getElementById('found-fields');
  const missEl = document.getElementById('missing-fields');
  foundEl.innerHTML = audit.found.map(f => `<div class="tag on blue">${f.label} ${f.score}%</div>`).join('');
  missEl.innerHTML = audit.missing.map(f => `<div class="tag on pink">${f.label}</div>`).join('');
  document.getElementById('suggestions-block').style.display = 'block';
}

export function analyzeText() {
  const text = document.getElementById('upload-text').value.trim();
  if (!text) { alert('Вставь текст для анализа'); return; }

  const btn = document.getElementById('analyze-btn');
  btn.textContent = '◌ Анализирую...';
  btn.disabled = true;

  document.getElementById('analysis-result').style.display = 'block';
  document.getElementById('analysis-loading').style.display = 'block';
  document.getElementById('analysis-content').style.display = 'none';
  document.getElementById('suggestions-block').style.display = 'none';
  document.getElementById('analysis-status').textContent = 'обрабатывается...';

  setTimeout(() => {
    const audit = auditPersonaText(text);
    const result = formatAudit(audit);
    document.getElementById('analysis-loading').style.display = 'none';
    document.getElementById('analysis-content').style.display = 'block';
    document.getElementById('analysis-content').textContent = result;
    document.getElementById('analysis-status').textContent = 'готово ✓';
    renderSuggestions(audit);
    btn.textContent = '⬛ АНАЛИЗИРОВАТЬ СНОВА';
    btn.disabled = false;
  }, 250);
}
