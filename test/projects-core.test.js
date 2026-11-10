const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../projects-core.js");
const nadezhno = require("../nadezhno-core.js");

const mct = () => core.mergeProjects([]).find((p) => p.id === "mycreatortax");
const nz = () => core.mergeProjects([]).find((p) => p.id === "nadezhno");

test("mergeProjects returns every preset and keeps stored edits", () => {
  const list = core.mergeProjects([{ id: "nadezhno", mentionRate: 0.1 }, { id: "side", name: "Side project" }]);
  assert.deepEqual(list.map((p) => p.id), ["mycreatortax", "nadezhno", "wish-village", "pfotengedanken", "side"]);
  assert.equal(list[1].mentionRate, 0.1);
  assert.equal(list[1].url, "https://nadezhno.siri2moon.com/");
  assert.equal(list[4].platforms.zalo, "none");
});

test("a project imported before it became a preset is merged into the preset, not listed twice", () => {
  const list = core.mergeProjects([{ id: "wish-village", name: "Wish Village", mentionRate: 0.05 }]);
  assert.equal(list.filter((p) => p.id === "wish-village").length, 1);
  const wv = list.find((p) => p.id === "wish-village");
  assert.equal(wv.preset, true);
  assert.equal(wv.mentionRate, 0.05);
});

test("a preset's YouTube channel list fills the subscribe list and keeps zero mention rates", () => {
  const pg = core.mergeProjects([]).find((p) => p.id === "pfotengedanken");
  assert.equal(pg.language, "de");
  assert.equal(pg.mentionRate, 0);
  const d = core.scopedDefaults(pg);
  assert.equal(d.youtubeSubscribeChannelsText.split("\n")[0], "https://www.youtube.com/@Hundeverstehenn");
  assert.equal(d.youtubeSubscribeChannelsText.split("\n").length, pg.youtubeChannels.length);
  assert.equal(core.scopedDefaults(mct()).youtubeSubscribeChannelsText, "");
  const imported = core.normalizeProject({ name: "X", youtubeChannels: ["https://www.youtube.com/@a", "not a url"] });
  assert.deepEqual(imported.youtubeChannels, ["https://www.youtube.com/@a"]);
});

test("scopedDefaults builds platform search sources from project keywords", () => {
  const d = core.scopedDefaults(mct());
  assert.deepEqual(Object.keys(d).sort(), [...core.SCOPED_KEYS].sort());
  assert.match(d.threadsSourcesText.split("\n")[0], /^https:\/\/www\.threads\.com\/search\?q=creator%20taxes/);
  assert.match(d.xSourcesText, /x\.com\/search\?q=1099%20taxes&f=live/);
  assert.match(d.instagramSourcesText, /instagram\.com\/explore\/tags\/creatortaxes\//);
  assert.match(d.tiktokSourcesText, /tiktok\.com\/search\/video\?q=/);
  assert.equal(d.xFilterPrompt, mct().filterPrompt);
  assert.equal(d.postsText, "");
  // Chủ đề đăng bài tách bằng ** như parseTemplates của background.js.
  assert.equal(d.xPostTopicsText.split("**").length, mct().postTopics.length);
  // Bài đăng nhóm Facebook cũng lấy chủ đề từ hồ sơ dự án.
  assert.equal(d.postTopicsText, d.xPostTopicsText);
  // Trả lời bình luận tìm bài theo từ khoá và lọc theo bộ lọc của dự án, không lướt feed chung.
  assert.equal(d.xReplySourcesText, d.xSourcesText);
  assert.equal(d.threadsReplySourcesText, d.threadsSourcesText);
  assert.equal(d.xReplyFilterPrompt, mct().filterPrompt);
  assert.equal(d.instagramFilterPrompt, core.topicFilter(mct()));
  assert.notEqual(d.instagramFilterPrompt, mct().filterPrompt);
});

test("group relevance for Nadezhno matches nadezhno-core", () => {
  for (const name of ["Русские в Нячанге", "Nha Trang expats", "Москва барахолка", "Cooking club"]) {
    assert.equal(core.groupRelevance(nz(), name), nadezhno.groupRelevance(name), name);
  }
});

test("group relevance for MyCreatorTax", () => {
  assert.equal(core.groupRelevance(mct(), "Small YouTubers Support Group"), 2);
  assert.equal(core.groupRelevance(mct(), "Freelance designers"), 1);
  assert.equal(core.groupRelevance(mct(), "Русские в Нячанге"), 0);
});

test("group relevance for a custom project falls back to its keywords", () => {
  const p = core.normalizeProject({ id: "x", name: "X", groupKeywords: ["vegan recipes"] });
  assert.equal(core.groupRelevance(p, "Best Vegan Recipes 2026"), 2);
  assert.equal(core.groupRelevance(p, "Recipes for dinner"), 1);
  assert.equal(core.groupRelevance(p, "Cars"), 0);
});

test("prompt block switches language and only mentions the project when allowed", () => {
  const on = core.buildPromptBlock(mct(), { platform: "x", mention: true });
  assert.match(on, /DỰ ÁN ĐANG QUẢNG BÁ/);
  assert.match(on, /tiếng Anh/);
  assert.match(on, /ĐƯỢC PHÉP nhắc tới MyCreatorTax/);
  assert.match(on, /https:\/\/mycreatortax\.com\/quarterly-tax-due-dates/);
  assert.match(on, /I built it/);

  const off = core.buildPromptBlock(mct(), { platform: "x", mention: false });
  assert.match(off, /KHÔNG nhắc tên/);
  assert.doesNotMatch(off, /quarterly-tax-due-dates/);
});

test("own posts on a full turn must carry the link, comments may still skip off-topic posts", () => {
  const wv = core.mergeProjects([]).find((p) => p.id === "wish-village");
  const post = core.buildPromptBlock(wv, { platform: "threads", kind: "post", mention: "full" });
  assert.match(post, /bắt buộc có câu đó/);
  assert.doesNotMatch(post, /Chỉ bỏ cả câu này/);
  const comment = core.buildPromptBlock(wv, { platform: "threads", kind: "comment", mention: "full" });
  assert.match(comment, /Chỉ bỏ cả câu này/);
});

test("link fix directive keeps the text and adds one closing sentence with a project link", () => {
  const wv = core.mergeProjects([]).find((p) => p.id === "wish-village");
  const post = core.linkFixDirective(wv, { platform: "threads", kind: "post" });
  assert.match(post, /chưa chèn link của Wish Village/);
  assert.match(post, /"I made it"/);
  assert.match(post, /https:\/\/wishvillage\.live\//);
  assert.doesNotMatch(post, /chuyện buồn/);
  assert.match(core.linkFixDirective(wv, { platform: "facebook", kind: "comment" }), /chuyện buồn/);
  const plain = core.linkFixDirective(wv, { platform: "instagram", kind: "comment" });
  assert.match(plain, /wishvillage\.live/);
  assert.doesNotMatch(plain, /https:\/\//);
});

test("prompt block writes plain domains where links are not clickable", () => {
  const block = core.buildPromptBlock(nz(), { platform: "tiktok", mention: true });
  assert.match(block, /tiếng Nga/);
  assert.match(block, /- Trang chủ: nadezhno\.siri2moon\.com\n/);
  assert.doesNotMatch(block, /: https:\/\//);
});

test("appliesTo skips platforms the project does not target", () => {
  assert.equal(core.appliesTo(mct(), "x"), true);
  assert.equal(core.appliesTo(mct(), "maps"), false);
  assert.equal(core.appliesTo(null, "x"), false);
  assert.deepEqual(core.rankPlatforms(nz()).slice(0, 1), [{ name: "facebook", fit: "high" }]);
});

test("shouldMention follows the rate per kind", () => {
  const p = mct();
  assert.equal(core.shouldMention(p, "comment", () => p.mentionRate - 0.01), true);
  assert.equal(core.shouldMention(p, "comment", () => p.mentionRate), false);
  assert.equal(core.shouldMention(p, "post", () => p.postMentionRate - 0.01), true);
  assert.equal(core.shouldMention(p, "reply", () => p.mentionRate / 2), false);
});

test("mentionMode splits each turn into full, soft and none", () => {
  const p = mct();
  const full = p.mentionRate;
  const soft = p.softMentionRate;
  assert.equal(core.mentionMode(p, "comment", () => full - 0.01), "full");
  assert.equal(core.mentionMode(p, "comment", () => full), "soft");
  assert.equal(core.mentionMode(p, "comment", () => full + soft - 0.01), "soft");
  assert.equal(core.mentionMode(p, "comment", () => full + soft), "none");
  assert.equal(core.mentionMode(p, "post", () => p.postMentionRate), "none");
  assert.equal(core.mentionMode(p, "reply", () => (full + soft) / 2 - 0.01), "soft");
});

test("soft mention hints at the project without name or link", () => {
  const block = core.buildPromptBlock(mct(), { platform: "x", mention: "soft" });
  assert.match(block, /KHÔNG ghi tên MyCreatorTax, không link/);
  assert.match(block, /đang tự làm/);
  assert.doesNotMatch(block, /quarterly-tax-due-dates/);
  assert.doesNotMatch(block, /ĐƯỢC PHÉP nhắc/);
});

test("full mention directive asks for one project link and detects it", () => {
  const d = core.mentionDirective(mct(), { platform: "x" });
  assert.match(d, /ưu tiên hơn dòng CTA/);
  assert.match(d, /https:\/\/mycreatortax\.com/);
  const plain = core.mentionDirective(nz(), { platform: "instagram" });
  assert.match(plain, /nadezhno\.siri2moon\.com/);
  assert.doesNotMatch(plain, /https:\/\//);
  assert.equal(core.containsProjectLink(nz(), "смотри nadezhno.siri2moon.com, это мой проект"), true);
  assert.equal(core.containsProjectLink(nz(), "это мой проект Nadezhno"), false);
});

test("topicFilter uses the broad preset criterion or loosens filterPrompt", () => {
  assert.match(core.topicFilter(nz()), /Không cần là câu hỏi/);
  const custom = core.topicFilter({ id: "x1", name: "Demo", filterPrompt: "Chỉ bài hỏi về A." });
  assert.match(custom, /^Chỉ bài hỏi về A\./);
  assert.match(custom, /Không bắt buộc bài phải là câu hỏi/);
});

test("YouTube comments never get a full mention with a domain", () => {
  const p = nz();
  const r = () => p.mentionRate - 0.01;
  assert.equal(core.mentionMode(p, "comment", r, "youtube"), "soft");
  assert.equal(core.mentionMode(p, "comment", r, "threads"), "full");
  assert.equal(core.mentionMode(p, "comment", () => 0.99, "youtube"), "none");
});

test("projectExport and parseProjectImport round-trip a private project", () => {
  const project = core.normalizeProject({
    id: "side",
    name: "Side project",
    language: "en",
    youtubeKeywords: ["one", "two"],
    platforms: { youtube: "high", x: "none" },
  });
  const [back] = core.parseProjectImport(core.projectExport(project));
  assert.equal(back.id, "side");
  assert.deepEqual(back.youtubeKeywords, ["one", "two"]);
  assert.equal(back.platforms.youtube, "high");
  assert.equal(back.platforms.x, "none");
  assert.equal("preset" in back, false);
});

test("parseProjectImport accepts arrays, fills ids and rejects bad files", () => {
  const list = core.parseProjectImport(JSON.stringify([{ name: "Alpha Beta" }, { id: "b", name: "B" }]));
  assert.deepEqual(list.map((p) => p.id), ["alpha-beta", "b"]);
  assert.throws(() => core.parseProjectImport("not json"), /JSON/);
  assert.throws(() => core.parseProjectImport(JSON.stringify([{ url: "https://x.com" }])), /thiếu tên/);
});

test("parseProjectImport keeps the group scoring regexes of a private project", () => {
  const [p] = core.parseProjectImport(
    JSON.stringify({ name: "Cozy", groupAudienceRe: "meme|gam(e|er|ing)", groupTopicRe: "cozy|christmas" })
  );
  assert.equal(p.groupAudienceRe, "meme|gam(e|er|ing)");
  assert.equal(core.groupRelevance(p, "Cozy Gamers"), 2);
  assert.equal(core.groupRelevance(p, "Funny memes"), 1);
  const [back] = core.parseProjectImport(core.projectExport(p));
  assert.equal(back.groupTopicRe, "cozy|christmas");
});

test("communityRelevance ranks Meta-style community names above plain topic tags", () => {
  const p = core.normalizeProject({ name: "Cozy", groupAudienceRe: "meme|gam(e|er|ing)", groupTopicRe: "cozy" });
  assert.equal(core.communityRelevance(p, "Gaming Threads"), 2);
  assert.equal(core.communityRelevance(p, "Meme Threads"), 2);
  assert.equal(core.communityRelevance(p, "MemesDaily"), 1);
  assert.equal(core.communityRelevance(p, "NBA Threads"), 0);
  assert.equal(core.communityRelevance(p, "ManCity"), 0);
});

test("scopedDefaults seeds Threads community keywords from the group keywords", () => {
  const d = core.scopedDefaults(core.normalizeProject({ name: "Cozy", groupKeywords: ["Cozy games", "Funny memes"] }));
  assert.equal(d.threadsCommunityKeywords, "Cozy games\nFunny memes");
  assert.equal(d.threadsCommunityListText, "");
});

test("membership questions asking for personal data are flagged, normal ones are not", () => {
  for (const q of ["What's your email?", "Phone number for verification", "Please enter your ZIP code", "Số điện thoại của bạn?", "Your full name"]) {
    assert.equal(core.sensitiveMembershipQuestion(q), true, q);
  }
  for (const q of ["Why do you want to join?", "Do you agree to the group rules?", "What's your favorite cozy game?", "Are you from the US?"]) {
    assert.equal(core.sensitiveMembershipQuestion(q), false, q);
  }
});

test("forbidsPromotion spots no-self-promo rules", () => {
  assert.equal(core.forbidsPromotion("No self-promotion or spam. I agree"), true);
  assert.equal(core.forbidsPromotion("Do you agree not to advertise?"), true);
  assert.equal(core.forbidsPromotion("No links allowed in posts"), true);
  assert.equal(core.forbidsPromotion("Be kind and respectful"), false);
  assert.equal(core.forbidsPromotion("What games do you play?"), false);
});

test("preset images come straight from PRESETS so a stored copy never pins an old list", () => {
  assert.deepEqual(core.presetImages("wish-village"), ["project-images/wish-village-plaza.jpg"]);
  assert.deepEqual(core.presetImages("side"), []);
  const stored = core.mergeProjects([{ id: "wish-village", images: ["old.jpg"] }]).find((p) => p.id === "wish-village");
  assert.equal("images" in stored, false);
  const fs = require("node:fs");
  const path = require("node:path");
  for (const file of core.presetImages("wish-village")) assert.ok(fs.existsSync(path.join(__dirname, "..", file)), file);
});

test("images go on every post, and on comments or replies only when they carry the project link", () => {
  assert.equal(core.shouldAttachImage({ kind: "post" }), true);
  assert.equal(core.shouldAttachImage({ kind: "comment" }), false);
  assert.equal(core.shouldAttachImage({ kind: "comment", hasLink: true }), true);
  assert.equal(core.shouldAttachImage({ kind: "reply", hasLink: true }), true);
  assert.equal(core.shouldAttachImage({ kind: "post", noPromo: true }), false);
  assert.equal(core.shouldAttachImage({ kind: "comment", hasLink: true, noPromo: true }), false);
});

test("a post that carries an image is always a full mention, comments keep their rates", () => {
  const wv = core.mergeProjects([]).find((p) => p.id === "wish-village");
  assert.equal(core.mentionMode(wv, "post", () => 0.99, "facebook", { withImage: true }), "full");
  assert.equal(core.mentionMode(wv, "post", () => 0.99, "facebook"), "none");
  assert.equal(core.mentionMode(mct(), "comment", () => 0.99, "facebook", { withImage: true }), "none");
  assert.equal(core.mentionMode(wv, "comment", () => 0.99, "facebook"), "full");
  assert.equal(core.canAttachImages("threads"), true);
  assert.equal(core.canAttachImages("x"), false);
});

test("image stamp shows the bare project domain", () => {
  assert.equal(core.imageStampText(core.mergeProjects([]).find((p) => p.id === "wish-village")), "wishvillage.live");
  assert.equal(core.imageStampText(mct()), "mycreatortax.com");
  assert.equal(core.imageStampText({ id: "x", name: "No site" }), "");
});

test("AI writes only in the project language, whatever the original post is in", () => {
  const wv = core.mergeProjects([]).find((p) => p.id === "wish-village");
  const block = core.buildPromptBlock(wv, { platform: "facebook", mention: "none" });
  assert.match(block, /CHỈ viết bằng tiếng Anh \(English\)/);
  assert.doesNotMatch(block, /viết đúng ngôn ngữ của nội dung gốc/);
  assert.match(core.languageDirective(wv), /Chỉ viết bằng English/);
  assert.match(core.languageDirective(nz()), /русский/);
  assert.match(core.mentionDirective(wv, { platform: "facebook" }), /viết bằng English/);
});

test("wrongLanguage catches Vietnamese or non-Latin text in an English project", () => {
  const wv = core.mergeProjects([]).find((p) => p.id === "wish-village");
  assert.equal(core.wrongLanguage(wv, "Cái chi tiết mọi người hay bỏ qua là ông ấy ngồi ngay trong cabin loader"), true);
  assert.equal(core.wrongLanguage(wv, "हार्वेस्टर खरीदने के बाद"), true);
  assert.equal(core.wrongLanguage(wv, "lol the café scene got me 🎄 I made a tiny snowy village: https://wishvillage.live/"), false);
  assert.equal(core.wrongLanguage(nz(), "Great dentist in Nha Trang"), true);
  assert.equal(core.wrongLanguage(nz(), "Хороший стоматолог в Нячанге"), false);
  const de = { name: "Pfotengedanken", language: "de" };
  assert.equal(core.wrongLanguage(de, "Mein Hund macht das auch jeden Abend, sobald ich ins Bett gehe"), false);
  assert.equal(core.wrongLanguage(de, "My dog does this every single night before bed"), true);
  assert.equal(core.wrongLanguage(de, "Chó nhà tôi cũng vậy"), true);
  assert.equal(core.wrongLanguage(de, "Süß! 🐶"), false);
});
