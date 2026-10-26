/**
 * projects-core.js — "dự án đang quảng bá". Logic thuần, dùng chung cho service worker
 * (importScripts), trang app.html (<script>) và test Node (require).
 *
 * Mỗi dự án mô tả sản phẩm, đối tượng, từ khoá tìm bài / tìm nhóm và cách được phép nhắc tới nó.
 * Khi chọn một dự án:
 *   - các ô "project-scoped" (nguồn bài, từ khoá, bộ lọc nội dung, chủ đề đăng bài...) được đổi sang
 *     bộ giá trị của dự án đó (xem SCOPED_KEYS, scopedDefaults);
 *   - mọi lời gọi AI viết bình luận / bài đăng được nối thêm buildPromptBlock().
 */
(function (root) {
  const PLATFORMS = ["facebook", "threads", "x", "youtube", "instagram", "tiktok", "zalo", "maps"];

  // Mức phù hợp của nền tảng với dự án: quyết định thứ tự trong sidebar và việc AI có viết theo dự án hay không.
  const FIT = { high: 3, medium: 2, low: 1, none: 0 };

  const LANGUAGE_NAMES = { en: "tiếng Anh", ru: "tiếng Nga", vi: "tiếng Việt" };

  const PRESETS = [
    {
      id: "mycreatortax",
      name: "MyCreatorTax",
      url: "https://mycreatortax.com",
      live: true,
      color: "#0f766e",
      language: "en",
      market: "Mỹ",
      pitch:
        "Công cụ miễn phí ước tính thuế 2026 cho creator và freelancer nhận 1099 ở Mỹ: thuế liên bang, self-employment tax, thuế bang, lịch nộp theo quý (1040-ES), danh sách khoản khấu trừ, xuất PDF/CSV cho CPA. Tính ngay trên trình duyệt, số liệu không rời máy người dùng.",
      audience:
        "YouTuber, streamer Twitch/Kick, creator TikTok/Reels, influencer Instagram, creator OnlyFans/Patreon, podcaster, freelancer dev/designer nhận 1099 tại Mỹ.",
      persona:
        "A US-based self-employed creator who learned self-employment taxes the hard way and now helps other creators make sense of them. Casual, specific, never preachy.",
      facts: [
        "Self-employment tax is 15.3% of 92.35% of net profit (12.4% Social Security up to the $184,500 wage base in 2026, plus 2.9% Medicare); half of it is deductible.",
        "Quarterly estimated payments (Form 1040-ES) for 2026 are due April 15, June 15, September 15 and January 15, 2027.",
        "Safe harbor: pay 90% of this year's tax or 100% of last year's (110% if AGI was over $150k) to avoid the underpayment penalty.",
        "No quarterly payments are required if you expect to owe less than $1,000 after withholding.",
        "The 20% QBI deduction applies to most creators and freelancers and many creator tax guides leave it out.",
        "2026 standard deduction: $16,100 single, $32,200 married filing jointly.",
        "You don't owe self-employment tax if net self-employment earnings are under $400.",
      ],
      links: [
        { label: "Trang chủ / máy tính thuế", url: "https://mycreatortax.com" },
        { label: "Lịch nộp thuế theo quý", url: "https://mycreatortax.com/quarterly-tax-due-dates" },
        { label: "YouTuber", url: "https://mycreatortax.com/youtuber-tax-calculator" },
        { label: "Twitch/Kick streamer", url: "https://mycreatortax.com/twitch-streamer-tax-calculator" },
        { label: "TikTok/Reels creator", url: "https://mycreatortax.com/tiktok-creator-tax-calculator" },
        { label: "Instagram influencer", url: "https://mycreatortax.com/influencer-tax-calculator" },
        { label: "OnlyFans/Patreon", url: "https://mycreatortax.com/onlyfans-creator-tax-calculator" },
        { label: "Podcaster", url: "https://mycreatortax.com/podcaster-tax-calculator" },
        { label: "Freelance developer", url: "https://mycreatortax.com/freelance-developer-tax-calculator" },
        { label: "Freelance designer", url: "https://mycreatortax.com/freelance-designer-tax-calculator" },
      ],
      disclosure: "I built it",
      mentionRate: 0.25,
      postMentionRate: 0.4,
      postKeywords: [
        "creator taxes",
        "1099 taxes",
        "self employment tax",
        "quarterly estimated taxes",
        "how much to set aside for taxes",
        "youtube income taxes",
        "influencer taxes",
        "freelance taxes",
      ],
      youtubeKeywords: [
        "youtuber taxes explained",
        "content creator taxes 2026",
        "self employment tax explained",
        "quarterly estimated taxes 1099",
        "influencer taxes",
        "how much do youtubers pay in taxes",
      ],
      hashtags: ["creatortaxes", "1099taxes", "selfemployedtaxes", "freelancetaxes", "contentcreatortips", "taxtipsforcreators"],
      groupKeywords: [
        "YouTube creators",
        "Small YouTubers",
        "Content creators USA",
        "Twitch streamers",
        "TikTok creators",
        "Freelancers USA",
        "1099 contractors",
        "Self employed tax help",
      ],
      groupAudienceRe:
        "creator|youtub|streamer|twitch|kick|tiktok|influencer|podcast|freelanc|1099|self.?employ|onlyfans|patreon|ugc|contractor|gig",
      groupTopicRe: "tax|irs|usa|\\bus\\b|america|business|money|income|grow|support|help|tips",
      filterPrompt:
        "Chỉ tương tác khi nội dung nói về tiền, thu nhập hoặc thuế của creator / freelancer / người tự kinh doanh ở Mỹ: thuế 1099, self-employment tax, nộp thuế theo quý, khoản khấu trừ (write-off), nên để dành bao nhiêu tiền thuế, thu nhập từ YouTube/TikTok/Twitch/OnlyFans/sponsor, có nên thuê CPA. Bỏ qua nội dung ngoài nước Mỹ, chính trị, tin tức chung, quảng cáo, và bài không liên quan tới tiền hay thuế của người tự kinh doanh.",
      topicFilterPrompt:
        "Nhận nội dung về kiếm tiền, thu nhập, tài chính hoặc thuế của creator / freelancer / người tự kinh doanh (ưu tiên ở Mỹ), kể cả bài chia sẻ kinh nghiệm hay mẹo làm creator kiếm tiền. Không cần là câu hỏi, chỉ cần đúng chủ đề. Bỏ qua chính trị, tin tức chung, nội dung động lực / làm giàu chung chung và bài chỉ quảng cáo.",
      postTopics: [
        "The 15.3% self-employment tax surprise most new creators hit in their first year",
        "Why first-year creators should set aside 25-30% of every sponsor payment",
        "Quarterly estimated taxes: the 4 dates and the safe harbor rule in one post",
        "The QBI deduction: a 20% write-off most creator tax guides forget",
        "Write-offs creators actually qualify for (and the 50% meals rule)",
        "What to hand your CPA so tax season takes an hour, not a weekend",
      ],
      avoid: [
        "Never give personal tax advice or promise a refund; say you're not a CPA when it matters.",
        "Never mention the tool in posts about grief, health, politics or anything off-topic.",
      ],
      platforms: { x: "high", threads: "high", youtube: "high", facebook: "medium", tiktok: "medium", instagram: "medium", zalo: "none", maps: "none" },
    },
    {
      id: "nadezhno",
      name: "Nadezhno",
      url: "https://nadezhno.siri2moon.com/",
      live: true,
      color: "#b45309",
      language: "ru",
      market: "Việt Nam (cộng đồng nói tiếng Nga)",
      pitch:
        "«Надёжно во Вьетнаме»: danh bạ dịch vụ tin cậy cho người nói tiếng Nga ở Việt Nam (thuê nhà, thuê xe máy, nha sĩ, cắt tóc, khách sạn, ăn uống, đưa đón...) kèm review của chính cộng đồng. Có Telegram bot @nadezhno_bot để tìm ngay trong chat.",
      audience:
        "Người nói tiếng Nga (Nga, Belarus, Kazakhstan...) sống hoặc du lịch dài ngày tại Nha Trang, Đà Nẵng, Hội An, Phú Quốc, Sài Gòn, Hà Nội.",
      persona:
        "Русскоязычный экспат, который несколько лет живёт во Вьетнаме, знает проверенные места и охотно помогает новичкам. Пишет просто, по делу, без рекламного тона.",
      facts: [
        "Nadezhno собирает проверенные места с отзывами экспатов: жильё, аренда байков, стоматологи, парикмахеры, отели, еда, трансферы.",
        "Каталог открывается на сайте и в Telegram-боте @nadezhno_bot; в любом чате можно написать «@nadezhno_bot стоматолог».",
        "Города: Нячанг, Дананг, Хойан, Хюэ, Фукуок, Сайгон, Ханой.",
      ],
      links: [
        { label: "Trang chủ", url: "https://nadezhno.siri2moon.com/" },
        { label: "Telegram bot", url: "https://t.me/nadezhno_bot" },
      ],
      disclosure: "это мой проект",
      mentionRate: 0.3,
      postMentionRate: 0.5,
      postKeywords: [
        "Нячанг посоветуйте",
        "Дананг посоветуйте",
        "Вьетнам где снять квартиру",
        "аренда байка Вьетнам",
        "стоматолог Вьетнам",
        "Фукуок посоветуйте",
        "зимовка во Вьетнаме",
      ],
      youtubeKeywords: ["жизнь во Вьетнаме", "Нячанг 2026", "Дананг переезд", "Фукуок отдых", "зимовка во Вьетнаме"],
      hashtags: ["нячанг", "дананг", "вьетнам", "фукуок", "русскиевовьетнаме", "хойан"],
      // Giống NadezhnoCore.GROUP_SEARCH_KEYWORDS / groupRelevance; sửa ở đây nếu đổi bên đó.
      groupKeywords: [
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
      ],
      groupAudienceRe: "[а-яё]",
      groupTopicRe:
        "вьетнам|нячанг|дананг|хой\\s?ан|хюэ|фукуок|фу\\s?куок|сайгон|хошимин|ханой|муйне|далат|вунгтау|vietnam|nha\\s?trang|da\\s?nang|hoi\\s?an|phu\\s?quoc|saigon|ho\\s?chi\\s?minh|hanoi|mui\\s?ne|dalat",
      filterPrompt:
        "Chỉ tương tác khi nội dung bằng tiếng Nga (hoặc của người nói tiếng Nga) về cuộc sống / du lịch ở Việt Nam và đang hỏi xin gợi ý dịch vụ hoặc địa chỉ tin cậy: thuê nhà, thuê xe máy, nha sĩ, bác sĩ, cắt tóc, làm móng, khách sạn, quán ăn, đưa đón sân bay, sửa xe. Bỏ qua đổi tiền / USDT, visa, rao vặt, chính trị và nội dung không liên quan tới Việt Nam.",
      topicFilterPrompt:
        "Nhận nội dung về cuộc sống, du lịch, ăn ở, nhà cửa hoặc dịch vụ tại Việt Nam (Nha Trang, Đà Nẵng, Phú Quốc, Hội An, Sài Gòn, Hà Nội, Mũi Né…), viết bằng tiếng Nga hoặc nhắm tới người nói tiếng Nga. Không cần là câu hỏi, bài review, ảnh du lịch có chú thích về địa điểm ở Việt Nam đều được. Bỏ qua đổi tiền / USDT, visa, rao vặt, chính trị, nội dung động lực / làm giàu chung chung và bài không dính gì tới Việt Nam.",
      postTopics: [
        "Как найти надёжного стоматолога во Вьетнаме и не переплатить",
        "Аренда байка в Нячанге: на что смотреть перед тем, как платить",
        "Где искать квартиру на 3-6 месяцев в Дананге без риелторских наценок",
        "Проверенные места в Хойане, которые советуют сами экспаты",
        "Чек-лист для первой недели во Вьетнаме",
      ],
      avoid: [
        "Не касаться обмена валюты, USDT, P2P и виз: это незаконно или вне темы проекта.",
        "Не придумывать места и рейтинги: упоминать только то, что есть на Nadezhno.",
      ],
      platforms: { facebook: "high", threads: "medium", instagram: "medium", tiktok: "medium", youtube: "low", x: "low", zalo: "none", maps: "none" },
    },
  ];

  // Các ô cài đặt đổi theo dự án. Khi chuyển dự án, background lưu bộ giá trị hiện tại vào
  // projectScoped[cũ] rồi nạp projectScoped[mới] (hoặc scopedDefaults nếu chưa có).
  const SCOPED_KEYS = [
    "threadsSourcesText",
    "threadsFilterPrompt",
    "threadsPostTopicsText",
    "threadsPostTemplatesText",
    "threadsReplySourcesText",
    "threadsReplyFilterPrompt",
    "threadsFollowTargetsText",
    "xSourcesText",
    "xFilterPrompt",
    "xPostTopicsText",
    "xPostTemplatesText",
    "xReplySourcesText",
    "xReplyFilterPrompt",
    "xFollowTargetsText",
    "youtubeKeywordsText",
    "youtubeSubscribeChannelsText",
    "instagramSourcesText",
    "instagramFollowTargetsText",
    "tiktokSourcesText",
    "tiktokFollowTargetsText",
    "postsText",
    "postTopicsText",
    "instagramFilterPrompt",
    "commentsText",
    "joinUrlsText",
    "groupSearchKeywords",
  ];

  const EDITABLE_FIELDS = [
    "name",
    "url",
    "color",
    "language",
    "market",
    "pitch",
    "audience",
    "persona",
    "facts",
    "links",
    "disclosure",
    "mentionRate",
    "postMentionRate",
    "softMentionRate",
    "postKeywords",
    "youtubeKeywords",
    "hashtags",
    "groupKeywords",
    "filterPrompt",
    "topicFilterPrompt",
    "postTopics",
    "avoid",
    "platforms",
  ];

  function presetById(id) {
    return PRESETS.find((p) => p.id === id) || null;
  }

  function clamp01(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(1, Math.max(0, n));
  }

  function list(value) {
    if (Array.isArray(value)) return value.map((v) => (typeof v === "string" ? v.trim() : v)).filter(Boolean);
    return String(value || "")
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter(Boolean);
  }

  function slugify(text) {
    return (
      String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || `project-${Date.now().toString(36)}`
    );
  }

  /** Chuẩn hoá một dự án (preset hoặc người dùng tự thêm) thành đủ field, không lỗi khi thiếu. */
  function normalizeProject(raw) {
    const base = presetById(raw?.id) || {};
    const p = { ...base, ...(raw || {}) };
    const platforms = {};
    for (const name of PLATFORMS) {
      const fit = p.platforms?.[name];
      platforms[name] = fit in FIT ? fit : name === "zalo" || name === "maps" ? "none" : "medium";
    }
    return {
      id: String(p.id || slugify(p.name)),
      name: String(p.name || "Dự án mới").trim(),
      url: String(p.url || "").trim(),
      live: Boolean(p.live),
      color: /^#[0-9a-f]{6}$/i.test(p.color || "") ? p.color : "#4f46e5",
      language: LANGUAGE_NAMES[p.language] ? p.language : "en",
      market: String(p.market || "").trim(),
      pitch: String(p.pitch || "").trim(),
      audience: String(p.audience || "").trim(),
      persona: String(p.persona || "").trim(),
      facts: list(p.facts),
      links: (Array.isArray(p.links) ? p.links : [])
        .map((l) => ({ label: String(l?.label || "").trim(), url: String(l?.url || "").trim() }))
        .filter((l) => /^https?:\/\//i.test(l.url)),
      disclosure: String(p.disclosure || "").trim(),
      mentionRate: clamp01(p.mentionRate, 0.25),
      postMentionRate: clamp01(p.postMentionRate, 0.4),
      softMentionRate: clamp01(p.softMentionRate, 0.35),
      postKeywords: list(p.postKeywords),
      youtubeKeywords: list(p.youtubeKeywords),
      hashtags: list(p.hashtags).map((t) => t.replace(/^#/, "")),
      groupKeywords: list(p.groupKeywords),
      groupAudienceRe: String(p.groupAudienceRe || ""),
      groupTopicRe: String(p.groupTopicRe || ""),
      filterPrompt: String(p.filterPrompt || "").trim(),
      topicFilterPrompt: String(p.topicFilterPrompt || "").trim(),
      postTopics: list(p.postTopics),
      avoid: list(p.avoid),
      platforms,
      preset: Boolean(presetById(p.id)),
    };
  }

  /** Danh sách dự án = preset (đè bằng chỉnh sửa đã lưu) + dự án tự thêm. */
  function mergeProjects(stored) {
    const saved = Array.isArray(stored) ? stored : [];
    const byId = new Map(saved.filter((p) => p && p.id).map((p) => [p.id, p]));
    const out = PRESETS.map((preset) => normalizeProject({ ...preset, ...(byId.get(preset.id) || {}), id: preset.id }));
    for (const p of saved) {
      if (p?.id && !presetById(p.id) && !p.deleted) out.push(normalizeProject(p));
    }
    return out;
  }

  function fitOf(project, platform) {
    return project?.platforms?.[platform] || "none";
  }

  /** AI có viết theo dự án trên nền tảng này không. Zalo/Maps mặc định không. */
  function appliesTo(project, platform) {
    return Boolean(project) && FIT[fitOf(project, platform)] > 0;
  }

  /** Nền tảng xếp theo độ phù hợp giảm dần, giữ thứ tự gốc khi bằng nhau. */
  function rankPlatforms(project) {
    return PLATFORMS.map((name, i) => ({ name, fit: fitOf(project, name), i }))
      .sort((a, b) => FIT[b.fit] - FIT[a.fit] || a.i - b.i)
      .map(({ name, fit }) => ({ name, fit }));
  }

  function searchUrl(platform, keyword) {
    const q = encodeURIComponent(String(keyword || "").trim());
    if (!q) return "";
    switch (platform) {
      case "threads":
        return `https://www.threads.com/search?q=${q}&serp_type=default`;
      case "x":
        return `https://x.com/search?q=${q}&f=live`;
      case "tiktok":
        return `https://www.tiktok.com/search/video?q=${q}`;
      case "instagram":
        return `https://www.instagram.com/explore/tags/${encodeURIComponent(String(keyword).replace(/^#/, "").replace(/\s+/g, ""))}/`;
      default:
        return "";
    }
  }

  function joinTemplates(items) {
    return list(items).join("\n**\n");
  }

  /** Giá trị mặc định của các ô project-scoped, suy ra từ hồ sơ dự án. */
  function scopedDefaults(project) {
    const p = normalizeProject(project);
    const search = (platform, words) => words.slice(0, 8).map((w) => searchUrl(platform, w)).filter(Boolean).join("\n");
    const out = {};
    for (const key of SCOPED_KEYS) out[key] = "";
    Object.assign(out, {
      threadsSourcesText: search("threads", p.postKeywords),
      threadsFilterPrompt: p.filterPrompt,
      threadsPostTopicsText: joinTemplates(p.postTopics),
      // Trả lời bình luận cũng tìm bài theo từ khoá dự án thay vì lướt bảng tin chung.
      threadsReplySourcesText: search("threads", p.postKeywords),
      threadsReplyFilterPrompt: p.filterPrompt,
      xSourcesText: search("x", p.postKeywords),
      xFilterPrompt: p.filterPrompt,
      xPostTopicsText: joinTemplates(p.postTopics),
      xReplySourcesText: search("x", p.postKeywords),
      xReplyFilterPrompt: p.filterPrompt,
      postTopicsText: joinTemplates(p.postTopics),
      youtubeKeywordsText: (p.youtubeKeywords.length ? p.youtubeKeywords : p.postKeywords).join("\n"),
      instagramSourcesText: search("instagram", p.hashtags),
      instagramFilterPrompt: topicFilter(p),
      tiktokSourcesText: search("tiktok", p.postKeywords),
      groupSearchKeywords: p.groupKeywords.join("\n"),
    });
    return out;
  }

  /**
   * Tiêu chí lọc rộng: chỉ cần đúng chủ đề, không đòi bài phải là câu hỏi. Dùng cho Instagram (bài
   * chủ yếu là ảnh + chú thích) và để chọn người follow. filterPrompt của Threads / X thường hẹp hơn
   * ("đang hỏi xin gợi ý…") nên gần như mọi bài Instagram đều trượt.
   */
  function topicFilter(project) {
    const p = normalizeProject(project);
    if (p.topicFilterPrompt) return p.topicFilterPrompt;
    const base = p.filterPrompt || `Nhận nội dung thuộc chủ đề của ${p.name}${p.pitch ? `: ${p.pitch}` : ""}.`;
    return `${base}\nKhông bắt buộc bài phải là câu hỏi hay xin gợi ý: chỉ cần đúng chủ đề và đúng đối tượng.`;
  }

  function safeRegExp(source) {
    if (!source) return null;
    try {
      return new RegExp(source, "iu");
    } catch {
      return null;
    }
  }

  /**
   * Điểm hợp của một nhóm Facebook với dự án theo tên nhóm: 2 = đúng đối tượng và đúng chủ đề,
   * 1 = khớp một trong hai, 0 = không khớp. Dự án tự thêm không có regex thì so theo từ khoá tìm nhóm.
   */
  function groupRelevance(project, name) {
    const text = String(name || "");
    const audience = safeRegExp(project?.groupAudienceRe);
    const topic = safeRegExp(project?.groupTopicRe);
    if (audience || topic) {
      const a = audience ? audience.test(text) : false;
      const t = topic ? topic.test(text) : false;
      if (a && t) return 2;
      return a || t ? 1 : 0;
    }
    const lower = text.toLowerCase();
    const phrases = list(project?.groupKeywords).map((k) => k.toLowerCase());
    if (phrases.some((k) => lower.includes(k))) return 2;
    const words = new Set(phrases.flatMap((k) => k.split(/\s+/)).filter((w) => w.length >= 4));
    return [...words].some((w) => lower.includes(w)) ? 1 : 0;
  }

  // Nền tảng mà link trong bình luận không bấm được: chỉ ghi tên miền dạng chữ.
  const PLAIN_LINK_PLATFORMS = new Set(["instagram", "tiktok", "youtube"]);
  // Nền tảng lọc spam gắt với bình luận có tên miền (YouTube tự giữ lại / ẩn với người khác, chỉ tác giả
  // còn thấy): lượt nhắc đầy đủ hạ xuống nhắc khéo, không bao giờ ghi tên miền.
  const SOFT_ONLY_PLATFORMS = new Set(["youtube"]);

  function plainUrl(url) {
    return String(url || "")
      .replace(/^https?:\/\/(www\.)?/i, "")
      .replace(/\/$/, "");
  }

  /**
   * Khối hướng dẫn nối vào cuối system prompt của mọi job AI viết nội dung.
   * @param {object} project
   * @param {{platform?: string, kind?: "comment"|"post"|"reply", mention?: boolean|"full"|"soft"|"none"}} opts
   *   mention: lượt này nhắc dự án tới đâu (background tung bằng mentionMode). true = "full", false = "none";
   *   "soft" = ẩn ý mình đang làm một dự án (công cụ, kênh…) về chủ đề này, không tên, không link.
   */
  function buildPromptBlock(project, opts = {}) {
    const p = normalizeProject(project);
    const kind = opts.kind || "comment";
    const platform = opts.platform || "";
    const plainLink = PLAIN_LINK_PLATFORMS.has(platform);
    const langName = LANGUAGE_NAMES[p.language] || "tiếng Anh";
    const linkLines = projectLinkLines(p, platform);

    const lines = [
      "",
      "=== DỰ ÁN ĐANG QUẢNG BÁ — ưu tiên cao hơn mọi chỉ dẫn phía trên nếu mâu thuẫn ===",
      `Dự án: ${p.name}${p.url ? ` (${p.url})` : ""}`,
      p.pitch && `Dự án là gì: ${p.pitch}`,
      p.audience && `Người cần dự án: ${p.audience}`,
      p.persona && `Vai của bạn khi viết: ${p.persona}`,
      `Ngôn ngữ: viết đúng ngôn ngữ của nội dung gốc; nếu không rõ thì viết ${langName}. Khi nội dung gốc không phải tiếng Việt, bỏ qua mọi yêu cầu về tiếng Việt, teencode hay giọng người Việt ở trên, nhưng vẫn giữ giọng người thật, ngắn gọn.`,
    ];
    if (p.facts.length) {
      lines.push("Kiến thức dùng khi góp ý (chỉ dùng khi đúng chủ đề, không bịa thêm số liệu hay tên địa điểm):");
      for (const f of p.facts) lines.push(`- ${f}`);
    }

    if (kind === "post") {
      lines.push(
        `Bài đăng này là của chính bạn: chia sẻ một mẹo hoặc kiến thức cụ thể thuộc chủ đề của ${p.name} mà ${p.audience ? "đúng đối tượng trên" : "người đọc"} dùng được ngay.`
      );
    } else if (kind === "reply") {
      lines.push("Bạn đang trả lời người bình luận dưới bài của chính mình: bám đúng điều họ nói, giúp họ một bước cụ thể.");
    } else {
      lines.push(
        `Mục tiêu: để lại góp ý có ích thật, gắn với chủ đề của ${p.name}, để người đọc thấy bạn hiểu chuyện. Nếu nội dung gốc không dính gì tới chủ đề này thì cứ bình luận tự nhiên theo nội dung, đừng lái sang dự án.`
      );
    }

    const mode = opts.mention === true ? "full" : opts.mention || "none";
    if (mode === "full") {
      lines.push(
        `Lượt này ĐƯỢC PHÉP nhắc tới ${p.name} đúng một lần, kèm đúng MỘT link trong danh sách dưới. Nhắc tên mà không có link là sai. Nói rõ đây là dự án của bạn${p.disclosure ? ` (ví dụ "${p.disclosure}")` : ""}. Đặt ở cuối, một câu, như gợi ý của người quen, không giọng quảng cáo. Chỉ bỏ cả câu này khi nội dung gốc hoàn toàn không dính gì tới chủ đề của dự án.`,
        plainLink
          ? "Nền tảng này không bấm được link: chỉ ghi tên miền dạng chữ, không có https://. Chép nguyên văn một đường dẫn hợp nhất:"
          : "Chép nguyên văn một link hợp nhất với nội dung:",
        ...linkLines
      );
    } else if (mode === "soft") {
      lines.push(
        `Lượt này KHÔNG ghi tên ${p.name}, không link, không tên miền, không kêu gọi.`,
        `Nếu nội dung gốc đúng chủ đề của dự án, được thêm thoáng qua một ý rằng bạn đang tự làm đúng loại dự án ở dòng "Dự án là gì" về chủ đề này (công cụ: "mình đang làm một tool tính đúng cái này"; kênh / nội dung: "mình cũng đang làm phim tài liệu về đúng cảnh này" — viết bằng ngôn ngữ của bình luận), như chuyện bên lề của người trong nghề, để người đọc tò mò hỏi thêm hoặc vào trang cá nhân. Không mô tả tính năng, không khen sản phẩm. Nội dung gốc không liên quan thì bỏ ý này.`
      );
    } else {
      lines.push(`Lượt này KHÔNG nhắc tên, link hay ám chỉ ${p.name}. Chỉ góp ý chuyên môn hoặc kể trải nghiệm.`);
    }

    for (const rule of p.avoid) lines.push(`Không được: ${rule}`);
    lines.push("Vẫn chỉ trả về đúng nội dung cần đăng, không giải thích.");
    return lines.filter(Boolean).join("\n");
  }

  function projectLinkLines(p, platform) {
    const plainLink = PLAIN_LINK_PLATFORMS.has(platform);
    return p.links.length
      ? p.links.map((l) => `- ${l.label}: ${plainLink ? plainUrl(l.url) : l.url}`)
      : [`- ${plainLink ? plainUrl(p.url) : p.url}`];
  }

  /**
   * Dòng nối vào CUỐI tin nhắn user ở lượt nhắc đầy đủ. Khối biến thể trong tin nhắn user hay có
   * "CTA: KHÔNG … ko để link"; nằm sau system prompt nên AI nghe theo nó và bỏ link của dự án.
   * Dòng này đứng cuối cùng để ghi đè lại.
   */
  function mentionDirective(project, opts = {}) {
    const p = normalizeProject(project);
    return [
      "### NHẮC DỰ ÁN LƯỢT NÀY (ưu tiên hơn dòng CTA ở trên)",
      `- Kết thúc bằng đúng 1 câu ngắn nhắc ${p.name}, nói rõ là dự án của bạn${p.disclosure ? ` ("${p.disclosure}")` : ""}, kèm đúng 1 link chép nguyên văn từ danh sách:`,
      ...projectLinkLines(p, opts.platform || ""),
      "- Câu này phải gắn với điều vừa nói ở trên, nghe như gợi ý của người quen, không giọng quảng cáo.",
    ].join("\n");
  }

  /** Bình luận / bài có chứa một trong các link (hoặc tên miền) của dự án không. */
  function containsProjectLink(project, text) {
    const p = normalizeProject(project);
    const lower = String(text || "").toLowerCase();
    const hosts = [p.url, ...p.links.map((l) => l.url)]
      .filter(Boolean)
      .map((u) => plainUrl(u).toLowerCase().split("/")[0]);
    return hosts.some((h) => h && lower.includes(h));
  }

  /** Xác suất nhắc dự án theo loại nội dung. random truyền vào để test được. */
  function shouldMention(project, kind, random = Math.random) {
    return mentionMode(project, kind, random) === "full";
  }

  /**
   * Mức nhắc dự án của một lượt: "full" (tên + link) theo mentionRate / postMentionRate, kế đến "soft"
   * (ẩn ý, không tên, không link) theo softMentionRate, còn lại "none". Bài đăng của chính mình không
   * có mức "soft". Trả lời bình luận dùng nửa tỉ lệ cho cả hai mức. Bình luận trên SOFT_ONLY_PLATFORMS
   * không bao giờ "full".
   */
  function mentionMode(project, kind, random = Math.random, platform = "") {
    const p = normalizeProject(project);
    const scale = kind === "reply" ? 0.5 : 1;
    const full = (kind === "post" ? p.postMentionRate : p.mentionRate) * scale;
    const soft = kind === "post" ? 0 : p.softMentionRate * scale;
    const r = random();
    if (r < full) return SOFT_ONLY_PLATFORMS.has(platform) && kind !== "post" ? "soft" : "full";
    if (r < full + soft) return "soft";
    return "none";
  }

  /**
   * Đọc file JSON xuất từ extension (một dự án hoặc mảng dự án) để nhập lại.
   * Dùng cho dự án riêng tư: hồ sơ nằm trong file trên máy, không cần sửa PRESETS (repo công khai).
   * Trả về danh sách dự án đã chuẩn hoá, mỗi dự án có id; ném lỗi tiếng Việt nếu file sai.
   */
  function parseProjectImport(text) {
    let data;
    try {
      data = JSON.parse(String(text || ""));
    } catch {
      throw new Error("File không phải JSON hợp lệ.");
    }
    const items = Array.isArray(data) ? data : [data];
    if (!items.length) throw new Error("File không có dự án nào.");
    return items.map((raw, i) => {
      if (!raw || typeof raw !== "object" || !String(raw.name || "").trim()) {
        throw new Error(`Dự án thứ ${i + 1} trong file thiếu tên (name).`);
      }
      const project = { id: String(raw.id || slugify(raw.name)) };
      for (const field of EDITABLE_FIELDS) if (field in raw) project[field] = raw[field];
      const normalized = normalizeProject(project);
      delete normalized.preset;
      return normalized;
    });
  }

  /** Hồ sơ dự án ở dạng file JSON để sao lưu hoặc chuyển máy; nhập lại bằng parseProjectImport. */
  function projectExport(project) {
    const p = normalizeProject(project);
    const out = { id: p.id };
    for (const field of EDITABLE_FIELDS) out[field] = p[field];
    return JSON.stringify(out, null, 2) + "\n";
  }

  const api = {
    PLATFORMS,
    FIT,
    LANGUAGE_NAMES,
    PRESETS,
    SCOPED_KEYS,
    EDITABLE_FIELDS,
    presetById,
    normalizeProject,
    mergeProjects,
    fitOf,
    appliesTo,
    rankPlatforms,
    searchUrl,
    scopedDefaults,
    groupRelevance,
    buildPromptBlock,
    shouldMention,
    mentionMode,
    topicFilter,
    mentionDirective,
    containsProjectLink,
    slugify,
    parseProjectImport,
    projectExport,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ProjectsCore = api;
})(typeof self !== "undefined" ? self : globalThis);
