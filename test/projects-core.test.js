const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../projects-core.js");
const nadezhno = require("../nadezhno-core.js");

const mct = () => core.mergeProjects([]).find((p) => p.id === "mycreatortax");
const nz = () => core.mergeProjects([]).find((p) => p.id === "nadezhno");

test("mergeProjects returns both presets and keeps stored edits", () => {
  const list = core.mergeProjects([{ id: "nadezhno", mentionRate: 0.1 }, { id: "side", name: "Side project" }]);
  assert.deepEqual(list.map((p) => p.id), ["mycreatortax", "nadezhno", "side"]);
  assert.equal(list[1].mentionRate, 0.1);
  assert.equal(list[1].url, "https://nadezhno.siri2moon.com/");
  assert.equal(list[2].platforms.zalo, "none");
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
