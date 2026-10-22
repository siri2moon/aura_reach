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
    "threadsFollowTargetsText",
    "xSourcesText",
    "xFilterPrompt",
    "xPostTopicsText",
    "xPostTemplatesText",
    "xReplySourcesText",
    "xFollowTargetsText",
    "youtubeKeywordsText",
    "youtubeSubscribeChannelsText",
    "instagramSourcesText",
    "instagramFollowTargetsText",
    "tiktokSourcesText",
    "tiktokFollowTargetsText",
    "postsText",
    "postTopicsText",
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
    "postKeywords",
    "youtubeKeywords",
    "hashtags",
    "groupKeywords",
    "filterPrompt",
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
      postKeywords: list(p.postKeywords),
      youtubeKeywords: list(p.youtubeKeywords),
      hashtags: list(p.hashtags).map((t) => t.replace(/^#/, "")),
      groupKeywords: list(p.groupKeywords),
      groupAudienceRe: String(p.groupAudienceRe || ""),
      groupTopicRe: String(p.groupTopicRe || ""),
      filterPrompt: String(p.filterPrompt || "").trim(),
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
      xSourcesText: search("x", p.postKeywords),
      xFilterPrompt: p.filterPrompt,
      xPostTopicsText: joinTemplates(p.postTopics),
      postTopicsText: joinTemplates(p.postTopics),
      youtubeKeywordsText: (p.youtubeKeywords.length ? p.youtubeKeywords : p.postKeywords).join("\n"),
      instagramSourcesText: search("instagram", p.hashtags),
      tiktokSourcesText: search("tiktok", p.postKeywords),
      groupSearchKeywords: p.groupKeywords.join("\n"),
    });
    return out;
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

  function plainUrl(url) {
    return String(url || "")
      .replace(/^https?:\/\/(www\.)?/i, "")
      .replace(/\/$/, "");
  }

  /**
   * Khối hướng dẫn nối vào cuối system prompt của mọi job AI viết nội dung.
   * @param {object} project
   * @param {{platform?: string, kind?: "comment"|"post"|"reply", mention?: boolean}} opts
   *   mention: lượt này có được phép nhắc tới dự án không (background tung xác suất theo mentionRate).
   */
  function buildPromptBlock(project, opts = {}) {
    const p = normalizeProject(project);
    const kind = opts.kind || "comment";
    const platform = opts.platform || "";
    const plainLink = PLAIN_LINK_PLATFORMS.has(platform);
    const langName = LANGUAGE_NAMES[p.language] || "tiếng Anh";
    const linkLines = p.links.length
      ? p.links.map((l) => `- ${l.label}: ${plainLink ? plainUrl(l.url) : l.url}`)
      : [`- ${plainLink ? plainUrl(p.url) : p.url}`];

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

    if (opts.mention) {
      lines.push(
        `Lượt này ĐƯỢC PHÉP nhắc tới ${p.name} đúng một lần, chỉ khi nội dung gốc thật sự đúng nhu cầu mà dự án giải quyết. Nói rõ đây là dự án của bạn${p.disclosure ? ` (ví dụ "${p.disclosure}")` : ""}. Đặt ở cuối, một câu, như gợi ý của người quen, không giọng quảng cáo.`,
        plainLink
          ? "Nền tảng này không bấm được link: chỉ ghi tên miền dạng chữ, không có https://. Chọn đường dẫn hợp nhất:"
          : "Chọn link hợp nhất với nội dung:",
        ...linkLines
      );
    } else {
      lines.push(`Lượt này KHÔNG nhắc tên, link hay ám chỉ ${p.name}. Chỉ góp ý chuyên môn hoặc kể trải nghiệm.`);
    }

    for (const rule of p.avoid) lines.push(`Không được: ${rule}`);
    lines.push("Vẫn chỉ trả về đúng nội dung cần đăng, không giải thích.");
    return lines.filter(Boolean).join("\n");
  }

  /** Xác suất nhắc dự án theo loại nội dung. random truyền vào để test được. */
  function shouldMention(project, kind, random = Math.random) {
    const p = normalizeProject(project);
    const rate = kind === "post" ? p.postMentionRate : kind === "reply" ? p.mentionRate / 2 : p.mentionRate;
    return random() < rate;
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
    slugify,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ProjectsCore = api;
})(typeof self !== "undefined" ? self : globalThis);
