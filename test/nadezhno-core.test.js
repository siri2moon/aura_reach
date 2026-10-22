const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../nadezhno-core.js");

const fixed = () => 0;

test("classifyPost finds a request with city and category", () => {
  const r = core.classifyPost("Посоветуйте хорошего стоматолога в Дананге, нужно поставить пломбу");
  assert.deepEqual(r, { cityId: "da-nang", categoryId: "dentist", cityFromText: true });
});

test("classifyPost uses the default city when the post names none", () => {
  const r = core.classifyPost("Подскажите, где снять байк на месяц?", { defaultCity: "nha-trang" });
  assert.equal(r.cityId, "nha-trang");
  assert.equal(r.categoryId, "bike");
  assert.equal(r.cityFromText, false);
});

test("classifyPost picks the category mentioned first", () => {
  assert.equal(core.classifyPost("Ищу ремонт байка в Нячанге, кто знает мастера?").categoryId, "repair");
  assert.equal(core.classifyPost("Посоветуйте кафе рядом с отелем в Хойане").categoryId, "food");
  assert.equal(core.classifyPost("Нужна стоматологическая клиника в Хюэ").categoryId, "dentist");
});

test("classifyPost does not read хотел as a hotel or кондиционер as a condo", () => {
  const r = core.classifyPost("Хотела бы найти мастера по кондиционерам в Дананге, подскажите?");
  assert.ok(r.skip || (r.categoryId !== "hotel" && r.categoryId !== "housing"));
});

test("classifyPost skips offers, exchange and visa topics", () => {
  assert.ok(core.classifyPost("Сдаю квартиру в Дананге, пишите в лс").skip);
  assert.ok(core.classifyPost("Где обменять USDT на донги в Нячанге?").skip);
  assert.ok(core.classifyPost("Кто знает агентство, где сделать визу в Дананге?").skip);
  assert.ok(core.classifyPost("Looking for a dentist in Da Nang?").skip);
  assert.ok(core.classifyPost("Красивый закат сегодня в Нячанге").skip);
});

test("slugify matches the nadezhno website", () => {
  assert.equal(core.slugify("Phở Hồng"), "pho-hong");
  assert.equal(core.slugify("Кафе Борщ"), "kafe-borsch");
  assert.equal(core.placeUrl({ id: 12, name: "Đà Nẵng Dental" }), "https://nadezhno.siri2moon.com/place/12-da-nang-dental");
});

test("categoryUrl builds web and Telegram links", () => {
  assert.equal(core.categoryUrl("da-nang", "dentist", "web"), "https://nadezhno.siri2moon.com/da-nang/dentist");
  assert.equal(core.categoryUrl("da-nang", "dentist", "telegram"), "https://t.me/nadezhno_bot?startapp=c_da-nang_dentist");
});

test("listingLine shows only our own rating and Russian-speaking staff", () => {
  assert.equal(core.listingLine({ name: "A", rating: 4.75, review_count: 3, speaks_russian: true }), "A (★4.8, 3 отзыва, говорят по-русски)");
  assert.equal(core.listingLine({ name: "B", rating: null, review_count: 0, speaks_russian: false }), "B");
  assert.equal(core.listingLine({ name: "C", rating: 5, review_count: 11, speaks_russian: false }), "C (★5.0, 11 отзывов)");
});

test("buildTemplateDraft links the category, names real places and discloses authorship", () => {
  const listings = [
    { id: 1, name: "Free", rating: null, review_count: 0, speaks_russian: false },
    { id: 2, name: "Reviewed", rating: 4.5, review_count: 2, speaks_russian: false },
  ];
  const text = core.buildTemplateDraft({ cityId: "hoi-an", categoryId: "food", listings, rnd: fixed });
  assert.match(text, /https:\/\/nadezhno\.siri2moon\.com\/hoi-an\/food/);
  assert.match(text, /Например: Reviewed \(★4\.5, 2 отзыва\); Free\./);
  assert.match(text, /мой проект/);
});

test("finalizeAiDraft strips quotes and adds the link when AI drops it", () => {
  const ctx = { cityId: "hue", categoryId: "hotel", linkMode: "web" };
  assert.equal(core.finalizeAiDraft("«Привет»", ctx), "Привет\nhttps://nadezhno.siri2moon.com/hue/hotel");
  const withLink = "Смотрите https://nadezhno.siri2moon.com/hue/hotel";
  assert.equal(core.finalizeAiDraft(withLink, ctx), withLink);
});

test("fillAllowed enforces the daily cap and the per-group gap", () => {
  const now = new Date(2026, 9, 20, 12).getTime();
  const g = "https://www.facebook.com/groups/1/";
  let fills = null;
  for (let i = 0; i < 3; i += 1) {
    const groupUrl = `https://www.facebook.com/groups/${i}/`;
    assert.ok(core.fillAllowed(fills, { groupUrl, dailyLimit: 3, groupGapHours: 4, now }).ok);
    fills = core.recordFill(fills, { groupUrl, now });
  }
  assert.equal(core.fillAllowed(fills, { groupUrl: "x", dailyLimit: 3, groupGapHours: 4, now }).ok, false);
  const nextDay = now + 24 * 3600 * 1000;
  assert.ok(core.fillAllowed(fills, { groupUrl: g, dailyLimit: 3, groupGapHours: 4, now: nextDay }).ok);
  const sameGroupSoon = core.fillAllowed(fills, { groupUrl: g, dailyLimit: 10, groupGapHours: 4, now: now + 3600 * 1000 });
  assert.equal(sameGroupSoon.ok, false);
});

test("parseGroupUrls normalizes to www group links", () => {
  assert.deepEqual(
    core.parseGroupUrls("https://m.facebook.com/groups/rusvietnam?ref=x\nrusvietnam\nhttps://example.com/groups/a\n"),
    ["https://www.facebook.com/groups/rusvietnam/"]
  );
});

test("groupRelevance prefers Russian groups about Vietnam", () => {
  assert.equal(core.groupRelevance("Русские во Вьетнаме | Нячанг"), 2);
  assert.equal(core.groupRelevance("Russians in Da Nang"), 1);
  assert.equal(core.groupRelevance("Русские в Таиланде"), 1);
  assert.equal(core.groupRelevance("Hội phượt Đà Lạt"), 0);
});
