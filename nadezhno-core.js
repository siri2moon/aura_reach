/**
 * nadezhno-core.js — logic thuần cho tab "Nadezhno" (quảng bá https://nadezhno.siri2moon.com).
 *
 * Nhận diện bài hỏi xin "контакт проверенный" trong group người Nga ở Việt Nam, đoán thành phố + danh mục,
 * và soạn bình luận tiếng Nga có link tới danh mục thật trên Nadezhno. Không đụng DOM, không gọi mạng,
 * nên dùng được ở service worker (importScripts), trang app.html (<script>) và Node (test).
 */
(function (root) {
  const ORIGIN = "https://nadezhno.siri2moon.com";
  const BOT = "nadezhno_bot";

  // id khớp bảng cities của nadezhno_bot (migrations 0002/0005).
  const CITIES = [
    { id: "da-nang", name_ru: "Дананг", name_vi: "Đà Nẵng", re: /дананг|da\s?nang|đà\s?nẵng/iu },
    { id: "hoi-an", name_ru: "Хойан", name_vi: "Hội An", re: /хой\s?ан|hoi\s?an|hội\s?an/iu },
    { id: "hue", name_ru: "Хюэ", name_vi: "Huế", re: /хюэ|(?<!\p{L})hue(?!\p{L})|huế/iu },
    { id: "nha-trang", name_ru: "Нячанг", name_vi: "Nha Trang", re: /нячанг|nha\s?trang/iu },
    { id: "phu-quoc", name_ru: "Фукуок", name_vi: "Phú Quốc", re: /фукуок|фу\s?куок|phu\s?quoc|phú\s?quốc/iu },
    { id: "ho-chi-minh", name_ru: "Хошимин", name_vi: "Hồ Chí Minh", re: /хошимин|сайгон|ho\s?chi\s?minh|saigon|hcmc/iu },
    { id: "hanoi", name_ru: "Ханой", name_vi: "Hà Nội", re: /ханой|ha\s?noi|hanoi|hà\s?nội/iu },
  ];

  // id khớp bảng categories. Bỏ "visa" có chủ đích: CLAUDE.md của nadezhno cấm mọi thứ kiểu "visa qua người quen".
  // Thứ tự quan trọng khi hai danh mục khớp cùng vị trí (vd. "ремонт байка" → repair trước bike).
  const CATEGORIES = [
    { id: "dentist", name_ru: "Стоматология", re: /стоматолог|зубн|дантист|(?<!\p{L})зуб/iu },
    { id: "repair", name_ru: "Ремонт байков", re: /ремонт\S*\s+(байк|скутер|мопед|мото)|мастерск|механик|починить\s+(байк|скутер)/iu },
    { id: "nails", name_ru: "Маникюр", re: /маникюр|педикюр|ногт|ноготоч/iu },
    { id: "hair", name_ru: "Парикмахер / барбер", re: /парикмахер|барбер|стрижк|подстрич|окрашиван|покрасить\s+волос/iu },
    { id: "kids", name_ru: "Сады и школы", re: /детск\S*\s+сад|садик|(?<!\p{L})школ|няню|няня|няни/iu },
    { id: "doctor", name_ru: "Врачи и клиники", re: /врач|доктор|клиник|больниц|госпитал|педиатр|терапевт|анализ/iu },
    { id: "transfer", name_ru: "Трансфер и такси", re: /трансфер|такси|водител|из\s+аэропорта|в\s+аэропорт/iu },
    { id: "hotel", name_ru: "Отели и гестхаусы", re: /(?<!\p{L})отел|гостиниц|хостел|гестхаус|резорт|где\s+остановиться/iu },
    { id: "housing", name_ru: "Аренда жилья", re: /квартир|жиль[ёеяю]|кондо(?!\p{L})|кондоминиум|апартамент|вилл[ауы]|комнат[уы]|риелтор|риэлтор|снять\s+дом/iu },
    { id: "bike", name_ru: "Аренда байка", re: /байк|скутер|мопед|мотобайк/iu },
    { id: "food", name_ru: "Кофе и еда", re: /кафе|ресторан|кофейн|где\s+поесть|поесть|завтрак|русск\S*\s+кухн|борщ|пельмен/iu },
  ];

  // Người đăng đang HỎI (xin gợi ý), không phải đang rao.
  const REQUEST_RE =
    /ищу|ищем|посоветуйте|посоветуете|подскажите|порекомендуйте|кто\s+знает|кто-нибудь|нужен|нужна|нужно|нужны|где\s+(можно|найти|лучше|есть|хорош)|контакт|рекомендац|проверенн|\?/iu;

  // Bỏ qua: quảng cáo/rao vặt, và các chủ đề bất hợp pháp ở VN (đổi tiền, USDT, visa qua người quen).
  const SKIP_RE =
    /обмен|обменя|курс\s+(донг|рубл|доллар)|usdt|крипт|p2p|наличн\S*\s+за|перевод\S*\s+денег|виз[аыу]|визаран|бордерран|сдаю|сдам|продаю|продам|предлагаю|реклам|акци[яи]|скидк|пишите\s+в\s+(лс|личк)|наши\s+услуги/iu;

  function cityById(id) {
    return CITIES.find((c) => c.id === id) || null;
  }

  function categoryById(id) {
    return CATEGORIES.find((c) => c.id === id) || null;
  }

  function earliest(list, text) {
    let best = null;
    for (const item of list) {
      const m = item.re.exec(text);
      if (m && (!best || m.index < best.index)) best = { item, index: m.index };
    }
    return best ? best.item : null;
  }

  /**
   * Bài này có phải câu hỏi xin gợi ý mà Nadezhno trả lời được không.
   * Trả về { cityId, categoryId, cityFromText } hoặc { skip: "lý do" }.
   */
  function classifyPost(text, { defaultCity = "" } = {}) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (clean.length < 15) return { skip: "bài quá ngắn" };
    if (!/[а-яё]/i.test(clean)) return { skip: "không phải tiếng Nga" };
    if (SKIP_RE.test(clean)) return { skip: "rao vặt hoặc chủ đề không hỗ trợ" };
    if (!REQUEST_RE.test(clean)) return { skip: "không phải câu hỏi xin gợi ý" };
    const category = earliest(CATEGORIES, clean);
    if (!category) return { skip: "không thuộc danh mục nào của Nadezhno" };
    const city = earliest(CITIES, clean);
    const cityId = city ? city.id : defaultCity;
    if (!cityId) return { skip: "không rõ thành phố" };
    return { cityId, categoryId: category.id, cityFromText: Boolean(city) };
  }

  /** Đã có ai (hoặc chính mình) để link Nadezhno trong bình luận chưa. */
  function alreadyMentioned(comments) {
    return (comments || []).some((c) => /nadezhno|надёжно во вьетнаме|надежно во вьетнаме/i.test(String(c || "")));
  }

  const CYRILLIC = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l",
    м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh",
    щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };

  // Bản sao slugify() trong nadezhno_bot/apps/app/src/worker/seo/rules.ts, để link /place/<id>-<slug> khỏi bị 301.
  function slugify(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/đ/g, "d")
      .replace(/[а-яё]/g, (ch) => (ch in CYRILLIC ? CYRILLIC[ch] : ""))
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/, "");
  }

  function placeUrl(listing) {
    const slug = slugify(listing.name);
    return `${ORIGIN}/place/${listing.id}${slug ? `-${slug}` : ""}`;
  }

  function categoryUrl(cityId, categoryId, linkMode) {
    if (linkMode === "telegram") return `https://t.me/${BOT}?startapp=c_${cityId}_${categoryId}`;
    return `${ORIGIN}/${cityId}/${categoryId}`;
  }

  function listingsApiUrl(cityId, categoryId) {
    const q = new URLSearchParams({ city: cityId, category: categoryId, sort: "best" });
    return `${ORIGIN}/api/listings?${q}`;
  }

  function plural(n, [one, few, many]) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  /** "Tên (★4.8, 3 отзыва, говорят по-русски)": chỉ dùng rating từ review của chính Nadezhno, không bịa thêm. */
  function listingLine(l) {
    const facts = [];
    if (l.review_count > 0 && l.rating != null) {
      facts.push(`★${Number(l.rating).toFixed(1)}, ${l.review_count} ${plural(l.review_count, ["отзыв", "отзыва", "отзывов"])}`);
    }
    if (l.speaks_russian) facts.push("говорят по-русски");
    return facts.length ? `${l.name} (${facts.join(", ")})` : l.name;
  }

  /** Lấy tối đa 3 chỗ, ưu tiên chỗ đã có review rồi giữ thứ tự "best" của API. */
  function pickListings(listings, n = 3) {
    const list = Array.isArray(listings) ? listings : [];
    const reviewed = list.filter((l) => l.review_count > 0);
    const rest = list.filter((l) => !(l.review_count > 0));
    return [...reviewed, ...rest].slice(0, n);
  }

  const OPENERS = ["", "Если ещё актуально: ", "Может пригодиться: ", "Добрый день! "];
  const INTROS = [
    (cat, city) => `в каталоге «Надёжно во Вьетнаме» есть раздел «${cat}» по городу ${city}, с отзывами наших`,
    (cat, city) => `собрали контакты «${cat}» в городе ${city} с отзывами русскоязычных, посмотрите`,
    (cat, city) => `посмотрите раздел «${cat}» (${city}) в «Надёжно во Вьетнаме», там отзывы экспатов`,
  ];
  const CLOSERS = [
    "Если уже были у кого-то из них, оставьте отзыв, это очень помогает другим.",
    "Если знаете хорошее место, которого там нет, добавьте, пожалуйста.",
    "Будем рады вашему отзыву после визита.",
  ];
  const DISCLOSURE = "(Это мой проект, без регистрации и бесплатно.)";

  function pick(list, rnd) {
    return list[Math.floor(rnd() * list.length) % list.length];
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  /** Bình luận theo mẫu, có biến thể để không lặp nguyên văn giữa các bài. */
  function buildTemplateDraft({ cityId, categoryId, listings, linkMode = "web", rnd = Math.random }) {
    const city = cityById(cityId);
    const cat = categoryById(categoryId);
    if (!city || !cat) return "";
    const url = categoryUrl(cityId, categoryId, linkMode);
    const opener = pick(OPENERS, rnd);
    const intro = pick(INTROS, rnd)(cat.name_ru, city.name_ru);
    const head = opener.endsWith(": ") ? `${opener}${intro}` : `${opener}${capitalize(intro)}`;
    const top = pickListings(listings);
    const lines = [`${head}: ${url}`];
    if (top.length) lines.push(`Например: ${top.map(listingLine).join("; ")}.`);
    lines.push(pick(CLOSERS, rnd));
    lines.push(DISCLOSURE);
    return lines.join("\n");
  }

  const DEFAULT_AI_PROMPT = `Ты автор бесплатного каталога «Надёжно во Вьетнаме» (контакты, которые советуют русскоязычные экспаты, с их отзывами). Ты отвечаешь в группе Facebook человеку, который спросил совет.

Правила:
- Пиши по-русски, 2–4 коротких предложения, как живой человек, вежливо и по делу.
- Ответь именно на его вопрос: зацепись за одну деталь из поста (район, срок, бюджет, ребёнок и т.п.), если она есть.
- Упоминай только места из списка ниже, максимум три. Не выдумывай цены, часы работы, адреса, скидки и личный опыт. Рейтинг называй только если он дан.
- Вставь ссылку ровно один раз, ровно как дана.
- В конце честно и коротко скажи, что это твой проект (например: «это мой проект»).
- Без хэштегов, без капса, без кучи восклицательных знаков и эмодзи (максимум один).
- Не обещай «лучший», «самый надёжный», «гарантия».

Верни только текст комментария, без кавычек и пояснений.`;

  function buildAiUserMessage({ postText, cityId, categoryId, listings, linkMode = "web" }) {
    const city = cityById(cityId);
    const cat = categoryById(categoryId);
    const url = categoryUrl(cityId, categoryId, linkMode);
    const top = pickListings(listings);
    return [
      "Пост в группе:",
      String(postText || "").slice(0, 1500),
      "",
      `Город: ${city ? city.name_ru : cityId}`,
      `Раздел каталога: ${cat ? cat.name_ru : categoryId}`,
      `Ссылка на раздел: ${url}`,
      "Места из каталога (только их можно упоминать):",
      ...(top.length ? top.map((l) => `- ${listingLine(l)}`) : ["- (список пуст, просто дай ссылку на раздел)"]),
    ].join("\n");
  }

  /** Dọn output AI: bỏ ngoặc bọc ngoài, bảo đảm có đúng link. */
  function finalizeAiDraft(text, { cityId, categoryId, linkMode = "web" }) {
    let out = String(text || "")
      .trim()
      .replace(/^["«“']+|["»”']+$/g, "")
      .trim();
    if (!out) return "";
    const url = categoryUrl(cityId, categoryId, linkMode);
    if (!out.includes(url)) out = `${out}\n${url}`;
    return out;
  }

  function todayKey(now = new Date()) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /**
   * Có được điền sẵn thêm bình luận không: giới hạn mỗi ngày và giãn cách giữa hai lần trong cùng một group.
   * fills = { date, count, byGroup: { [groupUrl]: ts } }.
   */
  function fillAllowed(fills, { groupUrl, dailyLimit, groupGapHours, now = Date.now() }) {
    const f = fills && fills.date === todayKey(new Date(now)) ? fills : { count: 0 };
    if ((f.count || 0) >= dailyLimit) {
      return { ok: false, error: `Hôm nay đã điền ${f.count}/${dailyLimit} bình luận. Mai làm tiếp để tài khoản an toàn.` };
    }
    const last = fills?.byGroup?.[groupUrl] || 0;
    const gapMs = groupGapHours * 3600 * 1000;
    if (last && now - last < gapMs) {
      const mins = Math.ceil((gapMs - (now - last)) / 60000);
      return { ok: false, error: `Group này vừa có bình luận Nadezhno. Đợi thêm khoảng ${mins} phút.` };
    }
    return { ok: true };
  }

  function recordFill(fills, { groupUrl, now = Date.now() }) {
    const date = todayKey(new Date(now));
    const same = fills && fills.date === date;
    return {
      date,
      count: (same ? fills.count || 0 : 0) + 1,
      byGroup: { ...(fills?.byGroup || {}), [groupUrl]: now },
    };
  }

  // Từ khoá gợi ý để tìm nhóm người Nga ở Việt Nam trên Facebook (ô "Tìm nhóm theo từ khoá").
  const GROUP_SEARCH_KEYWORDS = [
    "Русские во Вьетнаме",
    "Русские в Нячанге",
    "Нячанг",
    "Русские в Дананге",
    "Дананг",
    "Хойан",
    "Фукуок",
    "Русские в Сайгоне",
    "Ханой русские",
    "Вьетнам барахолка",
  ];

  const VIETNAM_RE =
    /вьетнам|нячанг|дананг|хой\s?ан|хюэ|фукуок|фу\s?куок|сайгон|хошимин|ханой|муйне|далат|вунгтау|vietnam|nha\s?trang|da\s?nang|hoi\s?an|phu\s?quoc|saigon|ho\s?chi\s?minh|hanoi|mui\s?ne|dalat/iu;

  /**
   * Nhóm này có hợp với Nadezhno không, chỉ dựa vào tên: cần tiếng Nga và nhắc Việt Nam/thành phố.
   * 2 = rất hợp, 1 = có thể (một trong hai), 0 = không.
   */
  function groupRelevance(name) {
    const text = String(name || "");
    const russian = /[а-яё]/i.test(text);
    const vietnam = VIETNAM_RE.test(text);
    if (russian && vietnam) return 2;
    if (russian || vietnam) return 1;
    return 0;
  }

  function parseGroupUrls(text) {
    const out = [];
    for (const line of String(text || "").split(/\r?\n/)) {
      const raw = line.trim();
      if (!raw) continue;
      let url;
      try {
        url = new URL(raw.startsWith("http") ? raw : `https://www.facebook.com/groups/${raw}`);
      } catch {
        continue;
      }
      const m = url.pathname.match(/\/groups\/([^/?#]+)/);
      if (!m || !/facebook\.com$/i.test(url.hostname)) continue;
      const clean = `https://www.facebook.com/groups/${m[1]}/`;
      if (!out.includes(clean)) out.push(clean);
    }
    return out;
  }

  const api = {
    ORIGIN,
    CITIES,
    CATEGORIES,
    DEFAULT_AI_PROMPT,
    cityById,
    categoryById,
    classifyPost,
    alreadyMentioned,
    slugify,
    placeUrl,
    categoryUrl,
    listingsApiUrl,
    listingLine,
    pickListings,
    buildTemplateDraft,
    buildAiUserMessage,
    finalizeAiDraft,
    todayKey,
    fillAllowed,
    recordFill,
    parseGroupUrls,
    GROUP_SEARCH_KEYWORDS,
    groupRelevance,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NadezhnoCore = api;
})(typeof self !== "undefined" ? self : globalThis);
