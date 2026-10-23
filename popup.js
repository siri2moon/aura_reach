/**
 * Thông báo nhỏ góc dưới phải cho mọi thao tác lưu cài đặt. Dùng chung cho popup.js, projects-ui.js,
 * nadezhno-ui.js, notify-ui.js qua window.AuraToast.
 *   AuraToast.ok("Đã lưu cài đặt") · AuraToast.error(message, prefix?) · AuraToast.fromResult(res, okText)
 */
window.AuraToast = (() => {
  let el = null;
  let timer = null;
  function show(kind, text, ms) {
    if (!el) {
      el = document.createElement("div");
      el.className = "save-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.innerHTML = '<span class="save-toast-dot"></span><span class="save-toast-text"></span>';
      document.body.appendChild(el);
    }
    el.classList.remove("is-ok", "is-error");
    el.classList.add(kind === "error" ? "is-error" : "is-ok", "show");
    el.querySelector(".save-toast-text").textContent = text;
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove("show"), ms);
  }
  // Lỗi "context invalidated" / "unknown message" nghĩa là extension vừa được nạp lại hoặc chưa nạp bản mới.
  function explain(message) {
    const text = String(message || "lỗi không xác định");
    if (/context invalidated|unknown message|receiving end does not exist/i.test(text)) {
      return "Extension vừa được nạp lại. Tải lại trang này (F5) rồi thử lại.";
    }
    return text;
  }
  return {
    ok: (text = "Đã lưu cài đặt") => show("ok", text, 1800),
    error: (message, prefix = "Lưu thất bại") => show("error", `${prefix}: ${explain(message)}`, 6000),
    fromResult(res, okText) {
      if (res?.ok) this.ok(okText);
      else this.error(res?.error);
      return res;
    },
  };
})();

const els = {
  statusLine: document.getElementById("statusLine"),
  statusDot: document.getElementById("statusDot"),
  humanGuardEnabled: document.getElementById("humanGuardEnabled"),
  humanWarmupEnabled: document.getElementById("humanWarmupEnabled"),
  humanDailyCap: document.getElementById("humanDailyCap"),
  humanSkipChance: document.getElementById("humanSkipChance"),
  humanActiveStartHour: document.getElementById("humanActiveStartHour"),
  humanActiveEndHour: document.getElementById("humanActiveEndHour"),
  saveGuardBtn: document.getElementById("saveGuardBtn"),
  guardTodayInfo: document.getElementById("guardTodayInfo"),
  postMinMinutes: document.getElementById("postMinMinutes"),
  postMaxMinutes: document.getElementById("postMaxMinutes"),
  postWorkHours: document.getElementById("postWorkHours"),
  postRestHours: document.getElementById("postRestHours"),
  commentMinMinutes: document.getElementById("commentMinMinutes"),
  commentMaxMinutes: document.getElementById("commentMaxMinutes"),
  commentWorkHours: document.getElementById("commentWorkHours"),
  commentRestHours: document.getElementById("commentRestHours"),
  postsText: document.getElementById("postsText"),
  postAi: document.getElementById("postAi"),
  postAiWrap: document.getElementById("postAiWrap"),
  postTopicsText: document.getElementById("postTopicsText"),
  postAiSystemPrompt: document.getElementById("postAiSystemPrompt"),
  postsTextLabel: document.getElementById("postsTextLabel"),
  postsTextHint: document.getElementById("postsTextHint"),
  resetPostPromptBtn: document.getElementById("resetPostPromptBtn"),
  resetPostTopicsBtn: document.getElementById("resetPostTopicsBtn"),
  commentsText: document.getElementById("commentsText"),
  aiComment: document.getElementById("aiComment"),
  aiSystemPrompt: document.getElementById("aiSystemPrompt"),
  aiPromptWrap: document.getElementById("aiPromptWrap"),
  commentsWrap: document.getElementById("commentsWrap"),
  resetPromptBtn: document.getElementById("resetPromptBtn"),
  postGroupList: document.getElementById("postGroupList"),
  commentGroupList: document.getElementById("commentGroupList"),
  postGroupMeta: document.getElementById("postGroupMeta"),
  commentGroupMeta: document.getElementById("commentGroupMeta"),
  groupFilter: document.getElementById("groupFilter"),
  groupList: document.getElementById("groupList"),
  groupMeta: document.getElementById("groupMeta"),
  groupUrls: document.getElementById("groupUrls"),
  joinUrls: document.getElementById("joinUrls"),
  addUrlsBtn: document.getElementById("addUrlsBtn"),
  scanBtn: document.getElementById("scanBtn"),
  exportGroupsBtn: document.getElementById("exportGroupsBtn"),
  joinBtn: document.getElementById("joinBtn"),
  leaveBtn: document.getElementById("leaveBtn"),
  leaveSelectAll: document.getElementById("leaveSelectAll"),
  leaveSelectNone: document.getElementById("leaveSelectNone"),
  membershipMinMinutes: document.getElementById("membershipMinMinutes"),
  membershipMaxMinutes: document.getElementById("membershipMaxMinutes"),
  membershipStopBtn: document.getElementById("membershipStopBtn"),
  postRunOnceBtn: document.getElementById("postRunOnceBtn"),
  postToggleBtn: document.getElementById("postToggleBtn"),
  commentRunOnceBtn: document.getElementById("commentRunOnceBtn"),
  commentToggleBtn: document.getElementById("commentToggleBtn"),
  threadsMinMinutes: document.getElementById("threadsMinMinutes"),
  threadsMaxMinutes: document.getElementById("threadsMaxMinutes"),
  threadsWorkHours: document.getElementById("threadsWorkHours"),
  threadsRestHours: document.getElementById("threadsRestHours"),
  threadsAiSystemPrompt: document.getElementById("threadsAiSystemPrompt"),
  threadsFilterPrompt: document.getElementById("threadsFilterPrompt"),
  threadsFilterIgnoreOnError: document.getElementById("threadsFilterIgnoreOnError"),
  threadsSessionMaxPosts: document.getElementById("threadsSessionMaxPosts"),
  threadsSessionIntervalMin: document.getElementById("threadsSessionIntervalMin"),
  threadsSessionIntervalMax: document.getElementById("threadsSessionIntervalMax"),
  threadsSourcesText: document.getElementById("threadsSourcesText"),
  resetThreadsPromptBtn: document.getElementById("resetThreadsPromptBtn"),
  threadsRunOnceBtn: document.getElementById("threadsRunOnceBtn"),
  threadsToggleBtn: document.getElementById("threadsToggleBtn"),

  threadsScrollEnabled: document.getElementById("threadsScrollEnabled"),
  threadsScrollMinMinutes: document.getElementById("threadsScrollMinMinutes"),
  threadsScrollMaxMinutes: document.getElementById("threadsScrollMaxMinutes"),
  threadsScrollRounds: document.getElementById("threadsScrollRounds"),
  threadsScrollLike: document.getElementById("threadsScrollLike"),
  threadsScrollLikeDelay: document.getElementById("threadsScrollLikeDelay"),
  threadsScrollLikeIntervalMin: document.getElementById("threadsScrollLikeIntervalMin"),
  threadsScrollLikeIntervalMax: document.getElementById("threadsScrollLikeIntervalMax"),
  threadsScrollLikeDelayWrap: document.getElementById("threadsScrollLikeDelayWrap"),
  threadsScrollFollow: document.getElementById("threadsScrollFollow"),
  threadsScrollFollowLimit: document.getElementById("threadsScrollFollowLimit"),
  threadsScrollFollowIntervalMin: document.getElementById("threadsScrollFollowIntervalMin"),
  threadsScrollFollowIntervalMax: document.getElementById("threadsScrollFollowIntervalMax"),
  threadsScrollFollowLimitWrap: document.getElementById("threadsScrollFollowLimitWrap"),
  threadsScrollMeta: document.getElementById("threadsScrollMeta"),
  threadsScrollRunOnceBtn: document.getElementById("threadsScrollRunOnceBtn"),
  threadsScrollToggleBtn: document.getElementById("threadsScrollToggleBtn"),

  threadsPostEnabled: document.getElementById("threadsPostEnabled"),
  threadsPostMinMinutes: document.getElementById("threadsPostMinMinutes"),
  threadsPostMaxMinutes: document.getElementById("threadsPostMaxMinutes"),
  threadsPostAi: document.getElementById("threadsPostAi"),
  threadsPostAiWrap: document.getElementById("threadsPostAiWrap"),
  threadsPostAiSystemPrompt: document.getElementById("threadsPostAiSystemPrompt"),
  threadsPostTopicsText: document.getElementById("threadsPostTopicsText"),
  threadsPostTemplatesWrap: document.getElementById("threadsPostTemplatesWrap"),
  threadsPostTemplatesText: document.getElementById("threadsPostTemplatesText"),
  threadsPostMeta: document.getElementById("threadsPostMeta"),
  resetThreadsPostPromptBtn: document.getElementById("resetThreadsPostPromptBtn"),
  threadsPostRunOnceBtn: document.getElementById("threadsPostRunOnceBtn"),
  threadsPostToggleBtn: document.getElementById("threadsPostToggleBtn"),

  threadsReplyEnabled: document.getElementById("threadsReplyEnabled"),
  threadsReplyMinMinutes: document.getElementById("threadsReplyMinMinutes"),
  threadsReplyMaxMinutes: document.getElementById("threadsReplyMaxMinutes"),
  threadsReplyAi: document.getElementById("threadsReplyAi"),
  threadsReplyAiWrap: document.getElementById("threadsReplyAiWrap"),
  threadsReplyAiSystemPrompt: document.getElementById("threadsReplyAiSystemPrompt"),
  threadsReplyFilterPrompt: document.getElementById("threadsReplyFilterPrompt"),
  threadsReplyFilterIgnoreOnError: document.getElementById("threadsReplyFilterIgnoreOnError"),
  threadsReplyTemplatesWrap: document.getElementById("threadsReplyTemplatesWrap"),
  threadsReplyTemplatesText: document.getElementById("threadsReplyTemplatesText"),
  threadsReplySourcesText: document.getElementById("threadsReplySourcesText"),
  threadsReplyMeta: document.getElementById("threadsReplyMeta"),
  resetThreadsReplyPromptBtn: document.getElementById("resetThreadsReplyPromptBtn"),
  threadsReplyRunOnceBtn: document.getElementById("threadsReplyRunOnceBtn"),
  threadsReplyToggleBtn: document.getElementById("threadsReplyToggleBtn"),

  // YouTube
  youtubeKeywordMinMinutes: document.getElementById("youtubeKeywordMinMinutes"),
  youtubeKeywordMaxMinutes: document.getElementById("youtubeKeywordMaxMinutes"),
  youtubeAiSystemPrompt: document.getElementById("youtubeAiSystemPrompt"),
  resetYoutubePromptBtn: document.getElementById("resetYoutubePromptBtn"),
  youtubeKeywordsText: document.getElementById("youtubeKeywordsText"),
  youtubeKeywordSessionMaxVideos: document.getElementById("youtubeKeywordSessionMaxVideos"),
  youtubeKeywordRelatedCount: document.getElementById("youtubeKeywordRelatedCount"),
  youtubeKeywordSessionIntervalMin: document.getElementById("youtubeKeywordSessionIntervalMin"),
  youtubeKeywordSessionIntervalMax: document.getElementById("youtubeKeywordSessionIntervalMax"),
  youtubeKeywordFilterDuration: document.getElementById("youtubeKeywordFilterDuration"),
  youtubeKeywordFilterUploadDate: document.getElementById("youtubeKeywordFilterUploadDate"),
  youtubeKeywordFilterFeature: document.getElementById("youtubeKeywordFilterFeature"),
  youtubeKeywordFilterSort: document.getElementById("youtubeKeywordFilterSort"),
  youtubeKeywordFilterParamPreview: document.getElementById("youtubeKeywordFilterParamPreview"),
  youtubeKeywordFilterSpGuess: document.getElementById("youtubeKeywordFilterSpGuess"),
  youtubeKeywordRunOnceBtn: document.getElementById("youtubeKeywordRunOnceBtn"),
  youtubeKeywordToggleBtn: document.getElementById("youtubeKeywordToggleBtn"),

  youtubeTargetChannelsText: document.getElementById("youtubeTargetChannelsText"),
  youtubeTargetOnlyNewVideo: document.getElementById("youtubeTargetOnlyNewVideo"),
  youtubeTargetMinMinutes: document.getElementById("youtubeTargetMinMinutes"),
  youtubeTargetMaxMinutes: document.getElementById("youtubeTargetMaxMinutes"),
  youtubeTargetRunOnceBtn: document.getElementById("youtubeTargetRunOnceBtn"),
  youtubeTargetToggleBtn: document.getElementById("youtubeTargetToggleBtn"),

  youtubeScrollEnabled: document.getElementById("youtubeScrollEnabled"),
  youtubeScrollMinMinutes: document.getElementById("youtubeScrollMinMinutes"),
  youtubeScrollMaxMinutes: document.getElementById("youtubeScrollMaxMinutes"),
  youtubeScrollRounds: document.getElementById("youtubeScrollRounds"),
  youtubeScrollLike: document.getElementById("youtubeScrollLike"),
  youtubeScrollLikeDelay: document.getElementById("youtubeScrollLikeDelay"),
  youtubeScrollMeta: document.getElementById("youtubeScrollMeta"),
  youtubeScrollRunOnceBtn: document.getElementById("youtubeScrollRunOnceBtn"),
  youtubeScrollToggleBtn: document.getElementById("youtubeScrollToggleBtn"),

  youtubeSubscribeEnabled: document.getElementById("youtubeSubscribeEnabled"),
  youtubeSubscribeMinMinutes: document.getElementById("youtubeSubscribeMinMinutes"),
  youtubeSubscribeMaxMinutes: document.getElementById("youtubeSubscribeMaxMinutes"),
  youtubeSubscribeChannelsText: document.getElementById("youtubeSubscribeChannelsText"),
  youtubeSubscribeMeta: document.getElementById("youtubeSubscribeMeta"),
  youtubeSubscribeRunOnceBtn: document.getElementById("youtubeSubscribeRunOnceBtn"),
  youtubeSubscribeToggleBtn: document.getElementById("youtubeSubscribeToggleBtn"),

  // Instagram
  instagramCommentMinMinutes: document.getElementById("instagramCommentMinMinutes"),
  instagramCommentMaxMinutes: document.getElementById("instagramCommentMaxMinutes"),
  instagramAiSystemPrompt: document.getElementById("instagramAiSystemPrompt"),
  resetInstagramPromptBtn: document.getElementById("resetInstagramPromptBtn"),
  instagramSourcesText: document.getElementById("instagramSourcesText"),
  instagramCommentRunOnceBtn: document.getElementById("instagramCommentRunOnceBtn"),
  instagramCommentToggleBtn: document.getElementById("instagramCommentToggleBtn"),

  instagramScrollEnabled: document.getElementById("instagramScrollEnabled"),
  instagramScrollMinMinutes: document.getElementById("instagramScrollMinMinutes"),
  instagramScrollMaxMinutes: document.getElementById("instagramScrollMaxMinutes"),
  instagramScrollRounds: document.getElementById("instagramScrollRounds"),
  instagramScrollLike: document.getElementById("instagramScrollLike"),
  instagramScrollLikeDelay: document.getElementById("instagramScrollLikeDelay"),
  instagramScrollFollow: document.getElementById("instagramScrollFollow"),
  instagramScrollMeta: document.getElementById("instagramScrollMeta"),
  instagramScrollRunOnceBtn: document.getElementById("instagramScrollRunOnceBtn"),
  instagramScrollToggleBtn: document.getElementById("instagramScrollToggleBtn"),

  instagramFollowEnabled: document.getElementById("instagramFollowEnabled"),
  instagramFollowMinMinutes: document.getElementById("instagramFollowMinMinutes"),
  instagramFollowMaxMinutes: document.getElementById("instagramFollowMaxMinutes"),
  instagramFollowTargetsText: document.getElementById("instagramFollowTargetsText"),
  instagramFollowMeta: document.getElementById("instagramFollowMeta"),
  instagramFollowRunOnceBtn: document.getElementById("instagramFollowRunOnceBtn"),
  instagramFollowToggleBtn: document.getElementById("instagramFollowToggleBtn"),

  // X (Twitter)
  xCommentMinMinutes: document.getElementById("xCommentMinMinutes"),
  xCommentMaxMinutes: document.getElementById("xCommentMaxMinutes"),
  xAiSystemPrompt: document.getElementById("xAiSystemPrompt"),
  resetXPromptBtn: document.getElementById("resetXPromptBtn"),
  xSourcesText: document.getElementById("xSourcesText"),
  xFilterPrompt: document.getElementById("xFilterPrompt"),
  xFilterIgnoreOnError: document.getElementById("xFilterIgnoreOnError"),
  xSessionMaxPosts: document.getElementById("xSessionMaxPosts"),
  xSessionIntervalMin: document.getElementById("xSessionIntervalMin"),
  xSessionIntervalMax: document.getElementById("xSessionIntervalMax"),
  xCommentRunOnceBtn: document.getElementById("xCommentRunOnceBtn"),
  xCommentToggleBtn: document.getElementById("xCommentToggleBtn"),

  xScrollEnabled: document.getElementById("xScrollEnabled"),
  xScrollMinMinutes: document.getElementById("xScrollMinMinutes"),
  xScrollMaxMinutes: document.getElementById("xScrollMaxMinutes"),
  xScrollRounds: document.getElementById("xScrollRounds"),
  xScrollLike: document.getElementById("xScrollLike"),
  xScrollLikeDelay: document.getElementById("xScrollLikeDelay"),
  xScrollMeta: document.getElementById("xScrollMeta"),
  xScrollRunOnceBtn: document.getElementById("xScrollRunOnceBtn"),
  xScrollToggleBtn: document.getElementById("xScrollToggleBtn"),

  xPostEnabled: document.getElementById("xPostEnabled"),
  xPostMinMinutes: document.getElementById("xPostMinMinutes"),
  xPostMaxMinutes: document.getElementById("xPostMaxMinutes"),
  xPostAi: document.getElementById("xPostAi"),
  xPostAiWrap: document.getElementById("xPostAiWrap"),
  xPostAiSystemPrompt: document.getElementById("xPostAiSystemPrompt"),
  resetXPostPromptBtn: document.getElementById("resetXPostPromptBtn"),
  xPostTopicsText: document.getElementById("xPostTopicsText"),
  xPostTemplatesWrap: document.getElementById("xPostTemplatesWrap"),
  xPostTemplatesText: document.getElementById("xPostTemplatesText"),
  xPostMeta: document.getElementById("xPostMeta"),
  xPostRunOnceBtn: document.getElementById("xPostRunOnceBtn"),
  xPostToggleBtn: document.getElementById("xPostToggleBtn"),

  xFollowEnabled: document.getElementById("xFollowEnabled"),
  xFollowMinMinutes: document.getElementById("xFollowMinMinutes"),
  xFollowMaxMinutes: document.getElementById("xFollowMaxMinutes"),
  xFollowTargetsText: document.getElementById("xFollowTargetsText"),
  xFollowMeta: document.getElementById("xFollowMeta"),
  xFollowRunOnceBtn: document.getElementById("xFollowRunOnceBtn"),
  xFollowToggleBtn: document.getElementById("xFollowToggleBtn"),

  // Zalo
  zaloFriendEnabled: document.getElementById("zaloFriendEnabled"),
  zaloFriendMinMinutes: document.getElementById("zaloFriendMinMinutes"),
  zaloFriendMaxMinutes: document.getElementById("zaloFriendMaxMinutes"),
  zaloFriendPhonesText: document.getElementById("zaloFriendPhonesText"),
  zaloFriendSessionMax: document.getElementById("zaloFriendSessionMax"),
  zaloFriendDelayMin: document.getElementById("zaloFriendDelayMin"),
  zaloFriendDelayMax: document.getElementById("zaloFriendDelayMax"),
  zaloFriendMeta: document.getElementById("zaloFriendMeta"),
  zaloFriendRunOnceBtn: document.getElementById("zaloFriendRunOnceBtn"),
  zaloFriendToggleBtn: document.getElementById("zaloFriendToggleBtn"),

  zaloMessageEnabled: document.getElementById("zaloMessageEnabled"),
  zaloMessageMinMinutes: document.getElementById("zaloMessageMinMinutes"),
  zaloMessageMaxMinutes: document.getElementById("zaloMessageMaxMinutes"),
  zaloMessageTargetsText: document.getElementById("zaloMessageTargetsText"),
  zaloMessageAi: document.getElementById("zaloMessageAi"),
  zaloMessageAiWrap: document.getElementById("zaloMessageAiWrap"),
  zaloMessageAiSystemPrompt: document.getElementById("zaloMessageAiSystemPrompt"),
  resetZaloMessagePromptBtn: document.getElementById("resetZaloMessagePromptBtn"),
  zaloMessageTemplatesWrap: document.getElementById("zaloMessageTemplatesWrap"),
  zaloMessageTemplatesText: document.getElementById("zaloMessageTemplatesText"),
  zaloMessageSessionMax: document.getElementById("zaloMessageSessionMax"),
  zaloMessageDelayMin: document.getElementById("zaloMessageDelayMin"),
  zaloMessageDelayMax: document.getElementById("zaloMessageDelayMax"),
  zaloMessageMeta: document.getElementById("zaloMessageMeta"),
  zaloMessageRunOnceBtn: document.getElementById("zaloMessageRunOnceBtn"),
  zaloMessageToggleBtn: document.getElementById("zaloMessageToggleBtn"),

  zaloReplyEnabled: document.getElementById("zaloReplyEnabled"),
  zaloReplyMinMinutes: document.getElementById("zaloReplyMinMinutes"),
  zaloReplyMaxMinutes: document.getElementById("zaloReplyMaxMinutes"),
  zaloReplyAiSystemPrompt: document.getElementById("zaloReplyAiSystemPrompt"),
  resetZaloReplyPromptBtn: document.getElementById("resetZaloReplyPromptBtn"),
  zaloReplySessionMax: document.getElementById("zaloReplySessionMax"),
  zaloReplyDelayMin: document.getElementById("zaloReplyDelayMin"),
  zaloReplyDelayMax: document.getElementById("zaloReplyDelayMax"),
  zaloReplyMeta: document.getElementById("zaloReplyMeta"),
  zaloReplyRunOnceBtn: document.getElementById("zaloReplyRunOnceBtn"),
  zaloReplyToggleBtn: document.getElementById("zaloReplyToggleBtn"),

  // TikTok
  tiktokCommentMinMinutes: document.getElementById("tiktokCommentMinMinutes"),
  tiktokCommentMaxMinutes: document.getElementById("tiktokCommentMaxMinutes"),
  tiktokAiSystemPrompt: document.getElementById("tiktokAiSystemPrompt"),
  resetTiktokPromptBtn: document.getElementById("resetTiktokPromptBtn"),
  tiktokSourcesText: document.getElementById("tiktokSourcesText"),
  tiktokCommentRunOnceBtn: document.getElementById("tiktokCommentRunOnceBtn"),
  tiktokCommentToggleBtn: document.getElementById("tiktokCommentToggleBtn"),
  tiktokScrollEnabled: document.getElementById("tiktokScrollEnabled"),
  tiktokScrollMinMinutes: document.getElementById("tiktokScrollMinMinutes"),
  tiktokScrollMaxMinutes: document.getElementById("tiktokScrollMaxMinutes"),
  tiktokScrollRounds: document.getElementById("tiktokScrollRounds"),
  tiktokScrollLike: document.getElementById("tiktokScrollLike"),
  tiktokScrollLikeDelay: document.getElementById("tiktokScrollLikeDelay"),
  tiktokScrollMeta: document.getElementById("tiktokScrollMeta"),
  tiktokScrollRunOnceBtn: document.getElementById("tiktokScrollRunOnceBtn"),
  tiktokScrollToggleBtn: document.getElementById("tiktokScrollToggleBtn"),
  tiktokFollowEnabled: document.getElementById("tiktokFollowEnabled"),
  tiktokFollowMinMinutes: document.getElementById("tiktokFollowMinMinutes"),
  tiktokFollowMaxMinutes: document.getElementById("tiktokFollowMaxMinutes"),
  tiktokFollowTargetsText: document.getElementById("tiktokFollowTargetsText"),
  tiktokFollowMeta: document.getElementById("tiktokFollowMeta"),
  tiktokFollowRunOnceBtn: document.getElementById("tiktokFollowRunOnceBtn"),
  tiktokFollowToggleBtn: document.getElementById("tiktokFollowToggleBtn"),

  // Google Maps
  mapsReviewEnabled: document.getElementById("mapsReviewEnabled"),
  mapsReviewMinMinutes: document.getElementById("mapsReviewMinMinutes"),
  mapsReviewMaxMinutes: document.getElementById("mapsReviewMaxMinutes"),
  mapsReviewStars: document.getElementById("mapsReviewStars"),
  mapsReviewAiSystemPrompt: document.getElementById("mapsReviewAiSystemPrompt"),
  resetMapsReviewPromptBtn: document.getElementById("resetMapsReviewPromptBtn"),
  mapsReviewPlacesText: document.getElementById("mapsReviewPlacesText"),
  mapsReviewMeta: document.getElementById("mapsReviewMeta"),
  mapsReviewRunOnceBtn: document.getElementById("mapsReviewRunOnceBtn"),
  mapsReviewToggleBtn: document.getElementById("mapsReviewToggleBtn"),
  mapsSearchEnabled: document.getElementById("mapsSearchEnabled"),
  mapsSearchMinMinutes: document.getElementById("mapsSearchMinMinutes"),
  mapsSearchMaxMinutes: document.getElementById("mapsSearchMaxMinutes"),
  mapsSearchKeywordsText: document.getElementById("mapsSearchKeywordsText"),
  mapsSearchSessionMax: document.getElementById("mapsSearchSessionMax"),
  mapsSearchAutoReview: document.getElementById("mapsSearchAutoReview"),
  mapsSearchMeta: document.getElementById("mapsSearchMeta"),
  mapsSearchRunOnceBtn: document.getElementById("mapsSearchRunOnceBtn"),
  mapsSearchToggleBtn: document.getElementById("mapsSearchToggleBtn"),
  xReplyEnabled: document.getElementById("xReplyEnabled"),
  xReplyMinMinutes: document.getElementById("xReplyMinMinutes"),
  xReplyMaxMinutes: document.getElementById("xReplyMaxMinutes"),
  xReplyAi: document.getElementById("xReplyAi"),
  xReplyAiWrap: document.getElementById("xReplyAiWrap"),
  xReplyAiSystemPrompt: document.getElementById("xReplyAiSystemPrompt"),
  xReplyFilterPrompt: document.getElementById("xReplyFilterPrompt"),
  xReplyFilterIgnoreOnError: document.getElementById("xReplyFilterIgnoreOnError"),
  xReplyTemplatesWrap: document.getElementById("xReplyTemplatesWrap"),
  xReplyTemplatesText: document.getElementById("xReplyTemplatesText"),
  xReplySourcesText: document.getElementById("xReplySourcesText"),
  xReplyMeta: document.getElementById("xReplyMeta"),
  resetXReplyPromptBtn: document.getElementById("resetXReplyPromptBtn"),
  xReplyRunOnceBtn: document.getElementById("xReplyRunOnceBtn"),
  xReplyToggleBtn: document.getElementById("xReplyToggleBtn"),

  clearLogs: document.getElementById("clearLogs"),
  logs: document.getElementById("logs"),
  pageTitle: document.getElementById("pageTitle"),
  pageDesc: document.getElementById("pageDesc"),
};

let state = null;
let filter = "";
let leaveFilter = "";
let currentTab = "threads";
let needsReload = false;
let currentThreadsTab = "comment";
let currentPlatformSubtab = {
  threads: "comment",
  youtube: "comment",
  instagram: "comment",
  x: "comment",
  facebook: "post",
  zalo: "friend",
  tiktok: "comment",
  maps: "review",
};
const leaveSelected = new Set();
const TABS = ["project", "threads", "youtube", "instagram", "x", "facebook", "zalo", "tiktok", "maps", "guard", "notify", "logs"];

const THREADS_SUBTABS = ["comment", "scroll", "post", "reply"];
const YOUTUBE_SUBTABS = ["keyword", "target", "scroll", "subscribe"];
const INSTAGRAM_SUBTABS = ["comment", "scroll", "follow"];
const X_SUBTABS = ["comment", "scroll", "post", "follow", "reply"];
const FACEBOOK_SUBTABS = ["post", "comment", "groups"];
const ZALO_SUBTABS = ["friend", "message", "reply"];
const TIKTOK_SUBTABS = ["comment", "scroll", "follow"];
const MAPS_SUBTABS = ["review", "search"];

const PLATFORM_SUBTABS = {
  threads: THREADS_SUBTABS,
  youtube: YOUTUBE_SUBTABS,
  instagram: INSTAGRAM_SUBTABS,
  x: X_SUBTABS,
  facebook: FACEBOOK_SUBTABS,
  zalo: ZALO_SUBTABS,
  tiktok: TIKTOK_SUBTABS,
  maps: MAPS_SUBTABS,
};

const PLATFORM_SUBTAB_NAV_ID = {
  threads: "threadsSubTabs",
  youtube: "youtubeSubTabs",
  instagram: "instagramSubTabs",
  x: "xSubTabs",
  facebook: "facebookSubTabs",
  zalo: "zaloSubTabs",
  tiktok: "tiktokSubTabs",
  maps: "mapsSubTabs",
};

const PLATFORM_SUBTAB_DATA_ATTR = {
  threads: "threadsTab",
  youtube: "youtubeTab",
  instagram: "instagramTab",
  x: "xTab",
  facebook: "facebookTab",
  zalo: "zaloTab",
  tiktok: "tiktokTab",
  maps: "mapsTab",
};

const PLATFORM_SUBTAB_PANE_CLASS = {
  threads: "threads-subtab-pane",
  youtube: "youtube-subtab-pane",
  instagram: "instagram-subtab-pane",
  x: "x-subtab-pane",
  facebook: "facebook-subtab-pane",
  zalo: "zalo-subtab-pane",
  tiktok: "tiktok-subtab-pane",
  maps: "maps-subtab-pane",
};

const THREADS_TAB_META = {
  comment: { title: "Threads AI · Bình luận", desc: "Tự động bình luận AI trên các bài viết Threads theo nguồn bạn chỉ định." },
  scroll: { title: "Threads AI · Lướt bảng tin", desc: "Tự động cuộn lướt bảng tin Threads kết hợp thả tim và follow tự nhiên." },
  post: { title: "Threads AI · Đăng bài", desc: "Tự động tạo và đăng bài viết mới lên Threads bằng AI hoặc theo mẫu viết sẵn." },
  reply: { title: "Threads AI · Trả lời bình luận", desc: "Tự động tìm và trả lời bình luận của người khác dưới các bài viết chỉ định." },
};

const YOUTUBE_TAB_META = {
  keyword: { title: "YouTube · Từ khoá", desc: "Tìm video theo từ khoá trên YouTube rồi bình luận AI." },
  target: { title: "YouTube · Mục tiêu", desc: "Bình luận theo danh sách kênh chỉ định (chưa hỗ trợ)." },
  scroll: { title: "YouTube · Lướt video", desc: "Lướt và tương tác tự động với video YouTube." },
  subscribe: { title: "YouTube · Subscribe", desc: "Tự tìm và subscribe kênh làm video về chủ đề dự án, hoặc theo danh sách chỉ định." },
};

const INSTAGRAM_TAB_META = {
  comment: { title: "Instagram · Bình luận AI", desc: "Tự động bình luận AI trên các bài viết Instagram." },
  scroll: { title: "Instagram · Lướt feed", desc: "Lướt feed Instagram, tự động thả tim và follow." },
  follow: { title: "Instagram · Follow", desc: "Tự tìm và follow người đăng về chủ đề dự án, hoặc theo danh sách chỉ định." },
};

const X_TAB_META = {
  comment: { title: "X · Bình luận AI", desc: "Tự động bình luận AI trên các tweet." },
  scroll: { title: "X · Lướt feed", desc: "Lướt feed X, tự động like và repost." },
  post: { title: "X · Đăng bài", desc: "Tự động đăng tweet mới bằng AI hoặc mẫu viết sẵn." },
  follow: { title: "X · Follow", desc: "Tự tìm và follow người tweet về chủ đề dự án, hoặc theo danh sách chỉ định." },
  reply: { title: "X · Trả lời bình luận", desc: "Tìm bình luận dưới tweet rồi trả lời trực tiếp." },
};

const FACEBOOK_TAB_META = {
  post: { title: "Facebook · Đăng bài", desc: "Hẹn giờ đăng bài tự động vào các nhóm Facebook đã chọn." },
  comment: { title: "Facebook · Bình luận", desc: "Bình luận AI hoặc mẫu sẵn trên nhóm Facebook." },
  groups: { title: "Facebook · Quản lý nhóm", desc: "Quét, tham gia hoặc rời nhóm Facebook." },
};

const ZALO_TAB_META = {
  friend: { title: "Zalo · Kết bạn", desc: "Gửi lời mời kết bạn từ danh sách số điện thoại, có giãn cách chống spam." },
  message: { title: "Zalo · Nhắn tin", desc: "Nhắn tin bạn bè hoặc nhóm có sẵn bằng AI hoặc mẫu soạn sẵn." },
  reply: { title: "Zalo · Trả lời tin nhắn", desc: "Tự động trả lời tin mới từ bạn bè bằng AI, không rep nhóm." },
};

const TIKTOK_TAB_META = {
  comment: { title: "TikTok · Bình luận AI", desc: "Tự động bình luận AI trên video TikTok theo nguồn hoặc For You." },
  scroll: { title: "TikTok · Lướt video", desc: "Lướt For You và tuỳ chọn thả tim." },
  follow: { title: "TikTok · Follow", desc: "Tự tìm và follow người đăng video về chủ đề dự án, hoặc theo danh sách chỉ định." },
};

const MAPS_TAB_META = {
  review: { title: "Google Maps · Đánh giá AI", desc: "Viết đánh giá AI cho danh sách địa điểm Google Maps." },
  search: { title: "Google Maps · Tìm địa điểm", desc: "Tìm theo từ khoá, mở địa điểm, tuỳ chọn đánh giá luôn." },
};

const PLATFORM_TAB_META = {
  threads: THREADS_TAB_META,
  youtube: YOUTUBE_TAB_META,
  instagram: INSTAGRAM_TAB_META,
  x: X_TAB_META,
  facebook: FACEBOOK_TAB_META,
  zalo: ZALO_TAB_META,
  tiktok: TIKTOK_TAB_META,
  maps: MAPS_TAB_META,
};

const THREADS_JOBS = [
  {
    key: "threadsScroll",
    label: "lướt feed",
    start: "START_THREADS_SCROLL",
    stop: "STOP_THREADS_SCROLL",
    runOnce: "RUN_THREADS_SCROLL_ONCE",
    onText: "Dừng lướt feed",
    offText: "Bắt đầu lướt feed",
  },
  {
    key: "threadsPost",
    label: "đăng bài",
    start: "START_THREADS_POST",
    stop: "STOP_THREADS_POST",
    runOnce: "RUN_THREADS_POST_ONCE",
    onText: "Dừng đăng bài",
    offText: "Bắt đầu đăng bài",
  },
  {
    key: "threadsReply",
    label: "trả lời bình luận",
    start: "START_THREADS_REPLY",
    stop: "STOP_THREADS_REPLY",
    runOnce: "RUN_THREADS_REPLY_ONCE",
    onText: "Dừng trả lời",
    offText: "Bắt đầu trả lời",
  },
];

const YOUTUBE_JOBS = [
  {
    key: "youtubeKeyword",
    label: "bình luận theo từ khoá",
    start: "START_YOUTUBE_KEYWORD",
    stop: "STOP_YOUTUBE_KEYWORD",
    runOnce: "RUN_YOUTUBE_KEYWORD_ONCE",
    onText: "Dừng bình luận từ khoá",
    offText: "Bắt đầu bình luận từ khoá",
  },
  {
    key: "youtubeScroll",
    label: "lướt video YouTube",
    start: "START_YOUTUBE_SCROLL",
    stop: "STOP_YOUTUBE_SCROLL",
    runOnce: "RUN_YOUTUBE_SCROLL_ONCE",
    onText: "Dừng lướt video",
    offText: "Bắt đầu lướt video",
  },
  {
    key: "youtubeSubscribe",
    label: "subscribe YouTube",
    start: "START_YOUTUBE_SUBSCRIBE",
    stop: "STOP_YOUTUBE_SUBSCRIBE",
    runOnce: "RUN_YOUTUBE_SUBSCRIBE_ONCE",
    onText: "Dừng Subscribe",
    offText: "Bắt đầu Subscribe",
  },
];

const INSTAGRAM_JOBS = [
  {
    key: "instagramScroll",
    label: "lướt feed Instagram",
    start: "START_INSTAGRAM_SCROLL",
    stop: "STOP_INSTAGRAM_SCROLL",
    runOnce: "RUN_INSTAGRAM_SCROLL_ONCE",
    onText: "Dừng lướt feed",
    offText: "Bắt đầu lướt feed",
  },
  {
    key: "instagramFollow",
    label: "follow Instagram",
    start: "START_INSTAGRAM_FOLLOW",
    stop: "STOP_INSTAGRAM_FOLLOW",
    runOnce: "RUN_INSTAGRAM_FOLLOW_ONCE",
    onText: "Dừng Follow",
    offText: "Bắt đầu Follow",
  },
];

const X_JOBS = [
  {
    key: "xScroll",
    label: "lướt feed X",
    start: "START_X_SCROLL",
    stop: "STOP_X_SCROLL",
    runOnce: "RUN_X_SCROLL_ONCE",
    onText: "Dừng lướt feed",
    offText: "Bắt đầu lướt feed",
  },
  {
    key: "xPost",
    label: "đăng bài X",
    start: "START_X_POST",
    stop: "STOP_X_POST",
    runOnce: "RUN_X_POST_ONCE",
    onText: "Dừng đăng bài",
    offText: "Bắt đầu đăng bài",
  },
  {
    key: "xFollow",
    label: "follow X",
    start: "START_X_FOLLOW",
    stop: "STOP_X_FOLLOW",
    runOnce: "RUN_X_FOLLOW_ONCE",
    onText: "Dừng Follow",
    offText: "Bắt đầu Follow",
  },
  {
    key: "xReply",
    label: "trả lời bình luận X",
    start: "START_X_REPLY",
    stop: "STOP_X_REPLY",
    runOnce: "RUN_X_REPLY_ONCE",
    onText: "Dừng trả lời",
    offText: "Bắt đầu trả lời",
  },
];

const ZALO_JOBS = [
  {
    key: "zaloFriend",
    label: "kết bạn Zalo",
    start: "START_ZALO_FRIEND",
    stop: "STOP_ZALO_FRIEND",
    runOnce: "RUN_ZALO_FRIEND_ONCE",
    onText: "Dừng kết bạn",
    offText: "Bắt đầu kết bạn",
  },
  {
    key: "zaloMessage",
    label: "nhắn tin Zalo",
    start: "START_ZALO_MESSAGE",
    stop: "STOP_ZALO_MESSAGE",
    runOnce: "RUN_ZALO_MESSAGE_ONCE",
    onText: "Dừng nhắn tin",
    offText: "Bắt đầu nhắn tin",
  },
  {
    key: "zaloReply",
    label: "trả lời tin nhắn Zalo",
    start: "START_ZALO_REPLY",
    stop: "STOP_ZALO_REPLY",
    runOnce: "RUN_ZALO_REPLY_ONCE",
    onText: "Dừng trả lời",
    offText: "Bắt đầu trả lời",
  },
];

const TIKTOK_JOBS = [
  {
    key: "tiktokComment",
    label: "bình luận TikTok",
    start: "START_TIKTOK_COMMENT",
    stop: "STOP_TIKTOK_COMMENT",
    runOnce: "RUN_TIKTOK_COMMENT_ONCE",
    onText: "Dừng bình luận",
    offText: "Bắt đầu bình luận",
  },
  {
    key: "tiktokScroll",
    label: "lướt video TikTok",
    start: "START_TIKTOK_SCROLL",
    stop: "STOP_TIKTOK_SCROLL",
    runOnce: "RUN_TIKTOK_SCROLL_ONCE",
    onText: "Dừng lướt video",
    offText: "Bắt đầu lướt video",
  },
  {
    key: "tiktokFollow",
    label: "follow TikTok",
    start: "START_TIKTOK_FOLLOW",
    stop: "STOP_TIKTOK_FOLLOW",
    runOnce: "RUN_TIKTOK_FOLLOW_ONCE",
    onText: "Dừng Follow",
    offText: "Bắt đầu Follow",
  },
];

const MAPS_JOBS = [
  {
    key: "mapsReview",
    label: "đánh giá Google Maps",
    start: "START_MAPS_REVIEW",
    stop: "STOP_MAPS_REVIEW",
    runOnce: "RUN_MAPS_REVIEW_ONCE",
    onText: "Dừng đánh giá",
    offText: "Bắt đầu đánh giá",
  },
  {
    key: "mapsSearch",
    label: "tìm địa điểm Google Maps",
    start: "START_MAPS_SEARCH",
    stop: "STOP_MAPS_SEARCH",
    runOnce: "RUN_MAPS_SEARCH_ONCE",
    onText: "Dừng tìm địa điểm",
    offText: "Bắt đầu tìm địa điểm",
  },
];

const PAGE_META = {
  project: { title: "Kế hoạch dự án", desc: "Mọi nền tảng đang làm việc cho dự án này." },
  threads: { title: "Threads", desc: "Tự động tương tác trên Threads bằng AI." },
  youtube: { title: "YouTube", desc: "Tự động bình luận và tương tác trên YouTube." },
  instagram: { title: "Instagram", desc: "Tự động tương tác trên Instagram." },
  x: { title: "X (Twitter)", desc: "Tự động tương tác trên X bằng AI." },
  facebook: { title: "Facebook", desc: "Tự động đăng bài, bình luận và quản lý nhóm Facebook." },
  zalo: { title: "Zalo", desc: "Kết bạn, nhắn tin và trả lời tin nhắn Zalo trên chat.zalo.me." },
  tiktok: { title: "TikTok", desc: "Bình luận AI, lướt For You và follow trên TikTok." },
  maps: { title: "Google Maps", desc: "Tìm địa điểm và viết đánh giá AI trên Google Maps." },
  guard: { title: "Chống ban", desc: "Giới hạn tần suất, khung giờ và warm-up để bảo vệ tài khoản." },
  notify: { title: "Thông báo Telegram", desc: "Nhận tin trên Telegram khi bình luận, đăng bài thành công hoặc có lỗi." },
  logs: { title: "Nhật ký", desc: "Theo dõi hoạt động gần đây của extension." },
};

function setToggleLabel(btn, label, isDanger) {
  if (!btn) return;
  const span = btn.querySelector("span");
  if (span) {
    span.textContent = label;
  } else {
    btn.textContent = label;
  }
  btn.classList.toggle("danger", Boolean(isDanger));
  btn.classList.toggle("primary", !Boolean(isDanger));
}

init();

async function init() {
  await refresh();
  bind();

  // Khôi phục subtab đã lưu cho mọi platform
  for (const platform of Object.keys(PLATFORM_SUBTABS)) {
    const stateKey = `ui${platform.charAt(0).toUpperCase() + platform.slice(1)}Tab`;
    const saved = state?.[stateKey];
    if (saved && PLATFORM_SUBTABS[platform].includes(saved)) {
      currentPlatformSubtab[platform] = saved;
    }
  }
  if (currentPlatformSubtab.threads) {
    currentThreadsTab = currentPlatformSubtab.threads;
  }

  setTab(state?.uiTab || "project", false);
  syncCommentUi();
  syncPostUi();
  syncThreadsJobUi();
  syncXPostUi();
  syncZaloMessageUi();
  setInterval(refresh, 2000);
}

function bind() {
  let saveTimer = null;
  const queueSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveSettings, 250);
  };
  const saveKeys = [
    "postMinMinutes",
    "postMaxMinutes",
    "postWorkHours",
    "postRestHours",
    "commentMinMinutes",
    "commentMaxMinutes",
    "commentWorkHours",
    "commentRestHours",
    "postsText",
    "postTopicsText",
    "postAiSystemPrompt",
    "commentsText",
    "aiSystemPrompt",
    "joinUrls",
    "membershipMinMinutes",
    "membershipMaxMinutes",

    // Human Guard (chống ban)
    "humanDailyCap",
    "humanSkipChance",
    "humanActiveStartHour",
    "humanActiveEndHour",

    "threadsMinMinutes",
    "threadsMaxMinutes",
    "threadsWorkHours",
    "threadsRestHours",
    "threadsAiSystemPrompt",
    "threadsFilterPrompt",
    "threadsSessionMaxPosts",
    "threadsSessionIntervalMin",
    "threadsSessionIntervalMax",
    "threadsSourcesText",
    "threadsScrollMinMinutes",
    "threadsScrollMaxMinutes",
    "threadsScrollRounds",
    "threadsScrollLikeDelay",
    "threadsScrollLikeIntervalMin",
    "threadsScrollLikeIntervalMax",
    "threadsScrollFollowLimit",
    "threadsScrollFollowIntervalMin",
    "threadsScrollFollowIntervalMax",
    "threadsPostMinMinutes",
    "threadsPostMaxMinutes",
    "threadsPostAiSystemPrompt",
    "threadsPostTopicsText",
    "threadsPostTemplatesText",
    "threadsReplyMinMinutes",
    "threadsReplyMaxMinutes",
    "threadsReplyAiSystemPrompt",
    "threadsReplyFilterPrompt",
    "threadsReplyTemplatesText",
    "threadsReplySourcesText",

    // YouTube
    "youtubeKeywordMinMinutes",
    "youtubeKeywordMaxMinutes",
    "youtubeAiSystemPrompt",
    "youtubeKeywordsText",
    "youtubeKeywordSessionMaxVideos",
    "youtubeKeywordRelatedCount",
    "youtubeKeywordSessionIntervalMin",
    "youtubeKeywordSessionIntervalMax",
    "youtubeKeywordFilterDuration",
    "youtubeKeywordFilterUploadDate",
    "youtubeKeywordFilterFeature",
    "youtubeKeywordFilterSort",
    "youtubeTargetChannelsText",
    "youtubeTargetMinMinutes",
    "youtubeTargetMaxMinutes",
    "youtubeScrollMinMinutes",
    "youtubeScrollMaxMinutes",
    "youtubeScrollRounds",
    "youtubeScrollLikeDelay",
    "youtubeSubscribeMinMinutes",
    "youtubeSubscribeMaxMinutes",
    "youtubeSubscribeChannelsText",

    // Instagram
    "instagramCommentMinMinutes",
    "instagramCommentMaxMinutes",
    "instagramAiSystemPrompt",
    "instagramSourcesText",
    "instagramScrollMinMinutes",
    "instagramScrollMaxMinutes",
    "instagramScrollRounds",
    "instagramScrollLikeDelay",
    "instagramFollowMinMinutes",
    "instagramFollowMaxMinutes",
    "instagramFollowTargetsText",

    // X (Twitter)
    "xCommentMinMinutes",
    "xCommentMaxMinutes",
    "xAiSystemPrompt",
    "xSourcesText",
    "xFilterPrompt",
    "xSessionMaxPosts",
    "xSessionIntervalMin",
    "xSessionIntervalMax",
    "xScrollMinMinutes",
    "xScrollMaxMinutes",
    "xScrollRounds",
    "xScrollLikeDelay",
    "xPostMinMinutes",
    "xPostMaxMinutes",
    "xPostAiSystemPrompt",
    "xPostTopicsText",
    "xPostTemplatesText",
    "xFollowMinMinutes",
    "xFollowMaxMinutes",
    "xFollowTargetsText",

    // Zalo
    "zaloFriendMinMinutes",
    "zaloFriendMaxMinutes",
    "zaloFriendPhonesText",
    "zaloFriendSessionMax",
    "zaloFriendDelayMin",
    "zaloFriendDelayMax",
    "zaloMessageMinMinutes",
    "zaloMessageMaxMinutes",
    "zaloMessageTargetsText",
    "zaloMessageAiSystemPrompt",
    "zaloMessageTemplatesText",
    "zaloMessageSessionMax",
    "zaloMessageDelayMin",
    "zaloMessageDelayMax",
    "zaloReplyMinMinutes",
    "zaloReplyMaxMinutes",
    "zaloReplyAiSystemPrompt",
    "zaloReplySessionMax",
    "zaloReplyDelayMin",
    "zaloReplyDelayMax",

    // TikTok
    "tiktokCommentMinMinutes",
    "tiktokCommentMaxMinutes",
    "tiktokAiSystemPrompt",
    "tiktokSourcesText",
    "tiktokScrollMinMinutes",
    "tiktokScrollMaxMinutes",
    "tiktokScrollRounds",
    "tiktokScrollLikeDelay",
    "tiktokFollowMinMinutes",
    "tiktokFollowMaxMinutes",
    "tiktokFollowTargetsText",

    // Google Maps
    "mapsReviewMinMinutes",
    "mapsReviewMaxMinutes",
    "mapsReviewStars",
    "mapsReviewAiSystemPrompt",
    "mapsReviewPlacesText",
    "mapsSearchMinMinutes",
    "mapsSearchMaxMinutes",
    "mapsSearchKeywordsText",
    "mapsSearchSessionMax",
    "xReplyMinMinutes",
    "xReplyMaxMinutes",
    "xReplyAiSystemPrompt",
    "xReplyFilterPrompt",
    "xReplyTemplatesText",
    "xReplySourcesText",
  ];
  for (const key of saveKeys) {
    if (els[key]) {
      els[key].addEventListener("change", saveSettings);
      els[key].addEventListener("blur", saveSettings);
      els[key].addEventListener("input", queueSave);
    }
  }
  els.threadsScrollLike?.addEventListener("change", () => {
    syncThreadsJobUi();
    saveSettings();
  });
  els.threadsScrollFollow?.addEventListener("change", () => {
    syncThreadsJobUi();
    saveSettings();
  });
  els.threadsFilterIgnoreOnError?.addEventListener("change", saveSettings);
  els.threadsReplyFilterIgnoreOnError?.addEventListener("change", saveSettings);
  // Human Guard (chống ban)
  els.humanGuardEnabled?.addEventListener("change", saveSettings);
  els.humanWarmupEnabled?.addEventListener("change", saveSettings);
  els.saveGuardBtn?.addEventListener("click", () =>
    call("SAVE_SETTINGS", { settings: collectSettings() }, els.saveGuardBtn, "Đang lưu...", "Đã lưu cài đặt chống ban")
  );
  els.aiComment?.addEventListener("change", () => {
    syncCommentUi();
    saveSettings();
  });
  els.postAi?.addEventListener("change", () => {
    syncPostUi();
    saveSettings();
  });
  els.resetPostPromptBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_FACEBOOK_POST_PROMPT" });
    els.postAiSystemPrompt.value = res?.prompt || els.postAiSystemPrompt.value;
    await saveSettings();
  });
  els.resetPostTopicsBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "PROJECT_APPLY_DEFAULTS", keys: ["postTopicsText"] });
    if (!res?.ok) return AuraToast.error(res?.error || "Chưa chọn dự án.");
    els.postTopicsText.value = res.defaults?.postTopicsText || "";
    AuraToast.ok("Đã lấy chủ đề từ hồ sơ dự án");
  });
  els.resetPromptBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_AI_PROMPT" });
    els.aiSystemPrompt.value = res?.prompt || els.aiSystemPrompt.value;
    await saveSettings();
  });
  els.resetThreadsPromptBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_THREADS_AI_PROMPT" });
    els.threadsAiSystemPrompt.value = res?.prompt || els.threadsAiSystemPrompt.value;
    await saveSettings();
  });
  els.resetThreadsPostPromptBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_THREADS_POST_PROMPT" });
    els.threadsPostAiSystemPrompt.value = res?.prompt || els.threadsPostAiSystemPrompt.value;
    await saveSettings();
  });
  els.resetThreadsReplyPromptBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_THREADS_REPLY_PROMPT" });
    els.threadsReplyAiSystemPrompt.value = res?.prompt || els.threadsReplyAiSystemPrompt.value;
    await saveSettings();
  });

  els.threadsPostAi?.addEventListener("change", () => {
    syncThreadsJobUi();
    saveSettings();
  });
  els.threadsReplyAi?.addEventListener("change", () => {
    syncThreadsJobUi();
    saveSettings();
  });

  for (const job of THREADS_JOBS) {
    els[`${job.key}Enabled`]?.addEventListener("change", () => toggleThreadsJob(job.key));
    els[`${job.key}ToggleBtn`]?.addEventListener("click", () => toggleThreadsJob(job.key));
    els[`${job.key}RunOnceBtn`]?.addEventListener("click", () =>
      call(job.runOnce, { settings: collectThreadsSettings() }, els[`${job.key}RunOnceBtn`], "Đang chạy...")
    );
  }

  // YouTube prompt & buttons (Từ khoá dùng chung cơ chế YOUTUBE_JOBS bên dưới)
  els.resetYoutubePromptBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_YOUTUBE_AI_PROMPT" });
    if (res?.prompt) els.youtubeAiSystemPrompt.value = res.prompt;
    await saveSettings();
  });
  els.youtubeScrollLike?.addEventListener("change", saveSettings);
  els.youtubeTargetOnlyNewVideo?.addEventListener("change", saveSettings);
  for (const key of [
    "youtubeKeywordFilterDuration",
    "youtubeKeywordFilterUploadDate",
    "youtubeKeywordFilterFeature",
    "youtubeKeywordFilterSort",
  ]) {
    els[key]?.addEventListener("change", renderYoutubeFilterPreview);
  }
  // Mục tiêu: chưa hỗ trợ logic thật — backend luôn trả về lỗi "chưa hỗ trợ", nút tự khôi phục nhờ call().
  els.youtubeTargetRunOnceBtn?.addEventListener("click", () =>
    call("RUN_YOUTUBE_TARGET_ONCE", { settings: collectSettings() }, els.youtubeTargetRunOnceBtn, "Đang chạy...")
  );
  els.youtubeTargetToggleBtn?.addEventListener("click", () =>
    call("START_YOUTUBE_TARGET", { settings: collectSettings() }, els.youtubeTargetToggleBtn, "Đang bật...")
  );

  // Instagram prompt & buttons
  els.resetInstagramPromptBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_INSTAGRAM_AI_PROMPT" });
    if (res?.prompt) els.instagramAiSystemPrompt.value = res.prompt;
    await saveSettings();
  });
  els.instagramScrollLike?.addEventListener("change", saveSettings);
  els.instagramScrollFollow?.addEventListener("change", saveSettings);
  els.instagramCommentRunOnceBtn?.addEventListener("click", () =>
    call("RUN_INSTAGRAM_COMMENT_ONCE", { settings: collectSettings() }, els.instagramCommentRunOnceBtn, "Đang chạy...")
  );
  els.instagramCommentToggleBtn?.addEventListener("click", () => togglePlatformComment("instagram"));

  // X prompt & buttons
  els.resetXPromptBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_X_AI_PROMPT" });
    if (res?.prompt) els.xAiSystemPrompt.value = res.prompt;
    await saveSettings();
  });
  els.resetXPostPromptBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_X_POST_PROMPT" });
    if (res?.prompt) els.xPostAiSystemPrompt.value = res.prompt;
    await saveSettings();
  });
  els.xScrollLike?.addEventListener("change", saveSettings);
  els.xPostAi?.addEventListener("change", () => {
    syncXPostUi();
    saveSettings();
  });
  els.xReplyAi?.addEventListener("change", () => {
    syncXReplyUi();
    saveSettings();
  });
  els.xFilterIgnoreOnError?.addEventListener("change", saveSettings);
  els.xReplyFilterIgnoreOnError?.addEventListener("change", saveSettings);
  els.resetXReplyPromptBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_X_REPLY_PROMPT" });
    if (res?.prompt) els.xReplyAiSystemPrompt.value = res.prompt;
    await saveSettings();
  });
  els.xCommentRunOnceBtn?.addEventListener("click", () =>
    call("RUN_X_COMMENT_ONCE", { settings: collectSettings() }, els.xCommentRunOnceBtn, "Đang chạy...")
  );
  els.xCommentToggleBtn?.addEventListener("click", () => togglePlatformComment("x"));

  els.resetZaloMessagePromptBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_ZALO_MESSAGE_PROMPT" });
    if (res?.prompt) els.zaloMessageAiSystemPrompt.value = res.prompt;
    await saveSettings();
  });
  els.resetZaloReplyPromptBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_ZALO_REPLY_PROMPT" });
    if (res?.prompt) els.zaloReplyAiSystemPrompt.value = res.prompt;
    await saveSettings();
  });
  els.zaloMessageAi?.addEventListener("change", () => {
    syncZaloMessageUi();
    saveSettings();
  });

  els.resetTiktokPromptBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_TIKTOK_AI_PROMPT" });
    if (res?.prompt) els.tiktokAiSystemPrompt.value = res.prompt;
    await saveSettings();
  });
  els.tiktokScrollLike?.addEventListener("change", saveSettings);
  els.resetMapsReviewPromptBtn?.addEventListener("click", async () => {
    const res = await chrome.runtime.sendMessage({ type: "GET_DEFAULT_MAPS_REVIEW_PROMPT" });
    if (res?.prompt) els.mapsReviewAiSystemPrompt.value = res.prompt;
    await saveSettings();
  });
  els.mapsSearchAutoReview?.addEventListener("change", saveSettings);

  // All subtab jobs (YouTube, Instagram, X, Zalo, TikTok, Maps)
  for (const job of [...YOUTUBE_JOBS, ...INSTAGRAM_JOBS, ...X_JOBS, ...ZALO_JOBS, ...TIKTOK_JOBS, ...MAPS_JOBS]) {
    els[`${job.key}Enabled`]?.addEventListener("change", () => toggleSubtabJob(job));
    els[`${job.key}ToggleBtn`]?.addEventListener("click", () => toggleSubtabJob(job));
    els[`${job.key}RunOnceBtn`]?.addEventListener("click", () =>
      call(job.runOnce, { settings: collectSettings() }, els[`${job.key}RunOnceBtn`], "Đang chạy...")
    );
  }

  for (const btn of document.querySelectorAll(".tab-btn")) {
    btn.addEventListener("click", () => setTab(btn.dataset.tab, true));
  }
  document.getElementById("reloadExtBtn")?.addEventListener("click", () => {
    if (!confirm("Tải lại extension để nạp code mới? Job đang chạy sẽ tự khôi phục lịch sau khi tải lại.")) return;
    chrome.runtime.sendMessage({ type: "RELOAD_EXTENSION" }).catch(() => {});
  });
  for (const platform of Object.keys(PLATFORM_SUBTABS)) {
    const dataAttr = PLATFORM_SUBTAB_DATA_ATTR[platform];
    for (const btn of document.querySelectorAll(`[data-${platform}-tab]`)) {
      btn.addEventListener("click", () => setPlatformSubtab(platform, btn.dataset[dataAttr], true));
    }
  }

  for (const input of document.querySelectorAll(".js-group-filter")) {
    input.addEventListener("input", () => {
      filter = input.value.trim().toLowerCase();
      for (const other of document.querySelectorAll(".js-group-filter")) other.value = input.value;
      renderTargetGroups();
    });
  }
  els.groupFilter.addEventListener("input", () => {
    leaveFilter = els.groupFilter.value.trim().toLowerCase();
    renderLeaveGroups();
  });

  for (const btn of document.querySelectorAll(".js-select-all")) {
    btn.addEventListener("click", () => call("SET_ALL_GROUPS", { enabled: true }, null, "", "Đã chọn tất cả nhóm"));
  }
  for (const btn of document.querySelectorAll(".js-select-none")) {
    btn.addEventListener("click", () => call("SET_ALL_GROUPS", { enabled: false }, null, "", "Đã bỏ chọn tất cả nhóm"));
  }

  els.scanBtn.addEventListener("click", () => call("SCAN_GROUPS", {}, els.scanBtn, "Đang quét..."));
  els.exportGroupsBtn.addEventListener("click", exportGroups);
  els.addUrlsBtn.addEventListener("click", async () => {
    await call("ADD_GROUP_URLS", { text: els.groupUrls.value }, els.addUrlsBtn, "Đang thêm...", "Đã thêm nhóm vào danh sách");
    els.groupUrls.value = "";
  });
  els.joinBtn.addEventListener("click", () =>
    call("START_JOIN", { settings: collectSettings() }, els.joinBtn, "Đang xếp hàng...")
  );
  els.leaveBtn.addEventListener("click", () => {
    const ids = [...leaveSelected];
    if (!ids.length) {
      alert("Chọn ít nhất một nhóm để rời.");
      return;
    }
    if (!confirm(`Rời ${ids.length} nhóm đã chọn? Không hoàn tác được.`)) return;
    call("START_LEAVE", { ids, settings: collectSettings() }, els.leaveBtn, "Đang xếp hàng...");
  });
  els.leaveSelectAll.addEventListener("click", () => {
    for (const group of state?.groups || []) leaveSelected.add(group.id);
    renderLeaveGroups();
  });
  els.leaveSelectNone.addEventListener("click", () => {
    leaveSelected.clear();
    renderLeaveGroups();
  });
  els.membershipStopBtn.addEventListener("click", () => call("STOP_MEMBERSHIP"));

  els.postRunOnceBtn.addEventListener("click", () =>
    call("RUN_ONCE", { settings: collectSettings("post") }, els.postRunOnceBtn, "Đang chạy...")
  );
  els.commentRunOnceBtn.addEventListener("click", () =>
    call("RUN_ONCE", { settings: collectSettings("comment") }, els.commentRunOnceBtn, "Đang chạy...")
  );
  els.postToggleBtn.addEventListener("click", () => toggleJob("post"));
  els.commentToggleBtn.addEventListener("click", () => toggleJob("comment"));
  els.threadsRunOnceBtn.addEventListener("click", () =>
    call("RUN_THREADS_ONCE", { settings: collectSettings("threads") }, els.threadsRunOnceBtn, "Đang chạy...")
  );
  els.threadsToggleBtn.addEventListener("click", () => toggleThreads());
  els.clearLogs.addEventListener("click", () => call("CLEAR_LOGS"));
}

async function toggleJob(mode) {
  if (state?.enabled && state.mode === mode) {
    await call("STOP");
    return;
  }
  if (state?.enabled && state.mode !== mode) {
    alert(mode === "post" ? "Đang chạy bình luận. Dừng bên tab Bình luận trước." : "Đang chạy đăng bài. Dừng bên tab Đăng bài trước.");
    return;
  }
  if (state?.threadsEnabled) {
    alert("Đang chạy bình luận Threads. Dừng bên tab Threads trước.");
    return;
  }
  if (state?.membershipEnabled) {
    alert("Đang tham gia/rời nhóm. Dừng ở tab Nhóm trước.");
    return;
  }
  const btn = mode === "post" ? els.postToggleBtn : els.commentToggleBtn;
  await call("START", { settings: collectSettings(mode) }, btn, "Đang bật...");
}

async function toggleThreads() {
  if (state?.threadsEnabled) {
    await call("STOP_THREADS");
    return;
  }
  if (state?.enabled) {
    alert(state.mode === "post" ? "Đang chạy đăng bài. Dừng bên tab Đăng bài trước." : "Đang chạy bình luận Facebook. Dừng bên tab Bình luận trước.");
    return;
  }
  if (state?.membershipEnabled) {
    alert("Đang tham gia/rời nhóm. Dừng ở tab Nhóm trước.");
    return;
  }
  await call("START_THREADS", { settings: collectSettings("threads") }, els.threadsToggleBtn, "Đang bật...");
}

async function toggleThreadsJob(key) {
  const job = THREADS_JOBS.find((j) => j.key === key);
  if (!job) return;
  const enabledKey = `${key}Enabled`;
  if (state?.[enabledKey]) {
    await call(job.stop);
    return;
  }
  if (state?.enabled) {
    alert(state.mode === "post" ? "Đang chạy đăng bài. Dừng bên tab Đăng bài trước." : "Đang chạy bình luận Facebook. Dừng bên tab Bình luận trước.");
    return;
  }
  if (state?.membershipEnabled) {
    alert("Đang tham gia/rời nhóm. Dừng ở tab Nhóm trước.");
    return;
  }
  await call(job.start, { settings: collectThreadsSettings() }, els[`${key}ToggleBtn`], "Đang bật...");
}

async function togglePlatformComment(platform) {
  const isInstagram = platform === "instagram";

  const enabledKey = isInstagram ? "instagramCommentEnabled" : "xCommentEnabled";
  const startMsg = isInstagram ? "START_INSTAGRAM_COMMENT" : "START_X_COMMENT";
  const stopMsg = isInstagram ? "STOP_INSTAGRAM_COMMENT" : "STOP_X_COMMENT";
  const btn = isInstagram ? els.instagramCommentToggleBtn : els.xCommentToggleBtn;

  if (state?.[enabledKey]) {
    await call(stopMsg);
    return;
  }
  await call(startMsg, { settings: collectSettings() }, btn, "Đang bật...");
}

async function toggleSubtabJob(job) {
  const enabledKey = `${job.key}Enabled`;
  if (state?.[enabledKey]) {
    await call(job.stop);
    return;
  }
  await call(job.start, { settings: collectSettings() }, els[`${job.key}ToggleBtn`], "Đang bật...");
}

function syncXPostUi() {
  const postAi = els.xPostAi ? els.xPostAi.checked : true;
  if (els.xPostAiWrap) els.xPostAiWrap.style.display = postAi ? "" : "none";
  if (els.xPostTemplatesWrap) els.xPostTemplatesWrap.style.display = postAi ? "none" : "";
}

function syncZaloMessageUi() {
  const ai = els.zaloMessageAi ? els.zaloMessageAi.checked : true;
  if (els.zaloMessageAiWrap) els.zaloMessageAiWrap.style.display = ai ? "" : "none";
  if (els.zaloMessageTemplatesWrap) els.zaloMessageTemplatesWrap.style.display = ai ? "none" : "";
}

function syncXReplyUi() {
  const replyAi = els.xReplyAi ? els.xReplyAi.checked : true;
  if (els.xReplyAiWrap) els.xReplyAiWrap.style.display = replyAi ? "" : "none";
  if (els.xReplyTemplatesWrap) els.xReplyTemplatesWrap.style.display = replyAi ? "none" : "";
}

function syncThreadsJobUi() {
  if (els.threadsScrollLikeDelayWrap) {
    els.threadsScrollLikeDelayWrap.style.display = els.threadsScrollLike.checked ? "" : "none";
  }
  if (els.threadsScrollFollowLimitWrap) {
    els.threadsScrollFollowLimitWrap.style.display = els.threadsScrollFollow.checked ? "" : "none";
  }
  const postAi = els.threadsPostAi.checked;
  els.threadsPostAiWrap.style.display = postAi ? "" : "none";
  els.threadsPostTemplatesWrap.style.display = postAi ? "none" : "";
  const replyAi = els.threadsReplyAi.checked;
  els.threadsReplyAiWrap.style.display = replyAi ? "" : "none";
  els.threadsReplyTemplatesWrap.style.display = replyAi ? "none" : "";
}

function setTab(name, persist) {
  // Tương thích ngược: ánh xạ các tab cũ sang subtab của Facebook
  if (name === "post" || name === "comment" || name === "groups") {
    currentPlatformSubtab.facebook = name;
    name = "facebook";
  }
  currentTab = TABS.includes(name) ? name : "project";

  for (const btn of document.querySelectorAll(".tab-btn")) {
    btn.classList.toggle("on", btn.dataset.tab === currentTab);
  }
  for (const pane of document.querySelectorAll(".tab-pane")) {
    pane.hidden = pane.id !== `tab-${currentTab}`;
  }

  // Ẩn tất cả header subtab navs trước
  for (const platform of Object.keys(PLATFORM_SUBTAB_NAV_ID)) {
    const nav = document.getElementById(PLATFORM_SUBTAB_NAV_ID[platform]);
    if (nav) nav.hidden = true;
  }

  // Nếu tab hiện tại là platform có subtabs -> hiện subtab nav tương ứng
  if (PLATFORM_SUBTABS[currentTab]) {
    const nav = document.getElementById(PLATFORM_SUBTAB_NAV_ID[currentTab]);
    if (nav) nav.hidden = false;
    setPlatformSubtab(currentTab, currentPlatformSubtab[currentTab] || PLATFORM_SUBTABS[currentTab][0], false);
  } else {
    const meta = PAGE_META[currentTab];
    if (els.pageTitle && meta) els.pageTitle.textContent = meta.title;
    if (els.pageDesc && meta) els.pageDesc.textContent = meta.desc;
    document.title = meta ? `${meta.title} · Aura Reach` : "Aura Reach";
  }

  if (persist) chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings: { uiTab: currentTab } });
}

function setPlatformSubtab(platform, subtabName, persist) {
  const validSubtabs = PLATFORM_SUBTABS[platform];
  if (!validSubtabs) return;

  const chosen = validSubtabs.includes(subtabName) ? subtabName : validSubtabs[0];
  currentPlatformSubtab[platform] = chosen;
  if (platform === "threads") currentThreadsTab = chosen;

  const dataAttr = PLATFORM_SUBTAB_DATA_ATTR[platform];
  const navEl = document.getElementById(PLATFORM_SUBTAB_NAV_ID[platform]);
  if (navEl) {
    for (const btn of navEl.querySelectorAll(".header-subtab-btn")) {
      btn.classList.toggle("on", btn.dataset[dataAttr] === chosen);
    }
  }

  const paneClass = PLATFORM_SUBTAB_PANE_CLASS[platform];
  for (const pane of document.querySelectorAll(`.${paneClass}`)) {
    pane.hidden = pane.id !== `${platform}-pane-${chosen}`;
  }

  if (currentTab === platform) {
    const metaMap = PLATFORM_TAB_META[platform];
    const meta = metaMap?.[chosen];
    if (els.pageTitle && meta) els.pageTitle.textContent = meta.title;
    if (els.pageDesc && meta) els.pageDesc.textContent = meta.desc;
    document.title = meta ? `${meta.title} · Aura Reach` : `${PAGE_META[platform]?.title || platform} · Aura Reach`;
  }

  if (persist) {
    const stateKey = `ui${platform.charAt(0).toUpperCase() + platform.slice(1)}Tab`;
    chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings: { [stateKey]: chosen } });
  }
}

function setThreadsTab(name, persist) {
  setPlatformSubtab("threads", name, persist);
}

async function refresh() {
  const res = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  if (!res?.ok) return;
  needsReload = !res.features?.includes("maps");
  const prevEnabled = state?.enabled;
  const prevMember = state?.membershipEnabled;
  const prevThreads = state?.threadsEnabled;
  const prevIg = state?.instagramCommentEnabled;
  const prevX = state?.xCommentEnabled;
  const allJobs = [...THREADS_JOBS, ...YOUTUBE_JOBS, ...INSTAGRAM_JOBS, ...X_JOBS, ...ZALO_JOBS, ...TIKTOK_JOBS, ...MAPS_JOBS];
  const prevJobs = allJobs.map((job) => state?.[`${job.key}Enabled`]).join(",");
  const prevLogLen = state?.logs?.length;
  const prevGroupLen = state?.groups?.length;
  state = res.state;
  const nextJobs = allJobs.map((job) => state[`${job.key}Enabled`]).join(",");
  if (
    prevEnabled !== state.enabled ||
    prevMember !== state.membershipEnabled ||
    prevThreads !== state.threadsEnabled ||
    prevIg !== state.instagramCommentEnabled ||
    prevX !== state.xCommentEnabled ||
    prevJobs !== nextJobs ||
    !els.postMinMinutes.value ||
    document.activeElement === document.body
  ) {
    fillForm();
  }
  renderStatus();
  if (prevGroupLen !== state.groups.length || !els.postGroupList.childElementCount) {
    renderTargetGroups();
    renderLeaveGroups();
  }
  if (prevLogLen !== state.logs.length || !els.logs.childElementCount) renderLogs();
}

function fillForm() {
  if (document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    renderStatus();
    return;
  }
  const min = state.minMinutes ?? 25;
  const max = state.maxMinutes ?? 55;
  const work = state.workHours ?? 0;
  const rest = state.restHours ?? 0;
  els.postMinMinutes.value = min;
  els.postMaxMinutes.value = max;
  els.postWorkHours.value = work;
  els.postRestHours.value = rest;
  els.commentMinMinutes.value = min;
  els.commentMaxMinutes.value = max;
  els.commentWorkHours.value = work;
  els.commentRestHours.value = rest;
  els.postsText.value = state.postsText || "";
  els.postAi.checked = state.postAi !== false;
  els.postTopicsText.value = state.postTopicsText || "";
  els.postAiSystemPrompt.value = state.postAiSystemPrompt || "";
  els.commentsText.value = state.commentsText || "";
  els.aiComment.checked = state.aiComment !== false;
  els.aiSystemPrompt.value = state.aiSystemPrompt || "";
  els.joinUrls.value = state.joinUrlsText || "";
  els.membershipMinMinutes.value = state.membershipMinMinutes ?? 5;
  els.membershipMaxMinutes.value = state.membershipMaxMinutes ?? 12;
  // --- Human Guard (chống ban) ---
  if (els.humanGuardEnabled) {
    els.humanGuardEnabled.checked = state.humanGuardEnabled !== false;
    if (els.humanWarmupEnabled) els.humanWarmupEnabled.checked = state.humanWarmupEnabled !== false;
    if (els.humanDailyCap) els.humanDailyCap.value = state.humanDailyCap ?? 40;
    if (els.humanSkipChance) els.humanSkipChance.value = Math.round((state.humanSkipChance ?? 0.12) * 100);
    if (els.humanActiveStartHour) els.humanActiveStartHour.value = state.humanActiveStartHour ?? 7;
    if (els.humanActiveEndHour) els.humanActiveEndHour.value = state.humanActiveEndHour ?? 24;
    if (els.guardTodayInfo) els.guardTodayInfo.textContent = formatGuardToday(state);
  }
  els.threadsMinMinutes.value = state.threadsMinMinutes ?? 25;
  els.threadsMaxMinutes.value = state.threadsMaxMinutes ?? 55;
  els.threadsWorkHours.value = state.threadsWorkHours ?? 8;
  els.threadsRestHours.value = state.threadsRestHours ?? 4;
  els.threadsAiSystemPrompt.value = state.threadsAiSystemPrompt || "";
  els.threadsFilterPrompt.value = state.threadsFilterPrompt || "";
  els.threadsFilterIgnoreOnError.checked = Boolean(state.threadsFilterIgnoreOnError);
  els.threadsSessionMaxPosts.value = state.threadsSessionMaxPosts ?? 2;
  els.threadsSessionIntervalMin.value = state.threadsSessionIntervalMin ?? 2;
  els.threadsSessionIntervalMax.value = state.threadsSessionIntervalMax ?? 5;
  els.threadsSourcesText.value = state.threadsSourcesText || "";

  els.threadsScrollEnabled.checked = Boolean(state.threadsScrollEnabled);
  els.threadsScrollMinMinutes.value = state.threadsScrollMinMinutes ?? 30;
  els.threadsScrollMaxMinutes.value = state.threadsScrollMaxMinutes ?? 90;
  els.threadsScrollRounds.value = state.threadsScrollRounds ?? 10;
  els.threadsScrollLike.checked = state.threadsScrollLike !== false;
  els.threadsScrollLikeDelay.value = state.threadsScrollLikeDelay ?? 5;
  if (els.threadsScrollLikeIntervalMin) {
    els.threadsScrollLikeIntervalMin.value =
      state.threadsScrollLikeIntervalMin ?? state.threadsScrollLikeInterval ?? 100;
  }
  if (els.threadsScrollLikeIntervalMax) {
    els.threadsScrollLikeIntervalMax.value =
      state.threadsScrollLikeIntervalMax ?? 200;
  }
  els.threadsScrollFollow.checked = Boolean(state.threadsScrollFollow);
  els.threadsScrollFollowLimit.value = state.threadsScrollFollowLimit ?? 2;
  if (els.threadsScrollFollowIntervalMin) {
    els.threadsScrollFollowIntervalMin.value =
      state.threadsScrollFollowIntervalMin ?? state.threadsScrollFollowInterval ?? 100;
  }
  if (els.threadsScrollFollowIntervalMax) {
    els.threadsScrollFollowIntervalMax.value =
      state.threadsScrollFollowIntervalMax ?? 200;
  }

  els.threadsPostEnabled.checked = Boolean(state.threadsPostEnabled);
  els.threadsPostMinMinutes.value = state.threadsPostMinMinutes ?? 20;
  els.threadsPostMaxMinutes.value = state.threadsPostMaxMinutes ?? 50;
  els.threadsPostAi.checked = state.threadsPostAi !== false;
  els.threadsPostAiSystemPrompt.value = state.threadsPostAiSystemPrompt || "";
  els.threadsPostTopicsText.value = state.threadsPostTopicsText || "";
  els.threadsPostTemplatesText.value = state.threadsPostTemplatesText || "";

  els.threadsReplyEnabled.checked = Boolean(state.threadsReplyEnabled);
  els.threadsReplyMinMinutes.value = state.threadsReplyMinMinutes ?? 25;
  els.threadsReplyMaxMinutes.value = state.threadsReplyMaxMinutes ?? 55;
  els.threadsReplyAi.checked = state.threadsReplyAi !== false;
  els.threadsReplyAiSystemPrompt.value = state.threadsReplyAiSystemPrompt || "";
  els.threadsReplyFilterPrompt.value = state.threadsReplyFilterPrompt || "";
  els.threadsReplyFilterIgnoreOnError.checked = Boolean(state.threadsReplyFilterIgnoreOnError);
  els.threadsReplyTemplatesText.value = state.threadsReplyTemplatesText || "";
  els.threadsReplySourcesText.value = state.threadsReplySourcesText || "";

  // YouTube
  if (els.youtubeKeywordMinMinutes) els.youtubeKeywordMinMinutes.value = state.youtubeKeywordMinMinutes ?? 25;
  if (els.youtubeKeywordMaxMinutes) els.youtubeKeywordMaxMinutes.value = state.youtubeKeywordMaxMinutes ?? 55;
  if (els.youtubeKeywordSessionMaxVideos) els.youtubeKeywordSessionMaxVideos.value = state.youtubeKeywordSessionMaxVideos ?? 2;
  if (els.youtubeKeywordRelatedCount) els.youtubeKeywordRelatedCount.value = state.youtubeKeywordRelatedCount ?? 2;
  if (els.youtubeKeywordSessionIntervalMin) els.youtubeKeywordSessionIntervalMin.value = state.youtubeKeywordSessionIntervalMin ?? 2;
  if (els.youtubeKeywordSessionIntervalMax) els.youtubeKeywordSessionIntervalMax.value = state.youtubeKeywordSessionIntervalMax ?? 5;
  if (els.youtubeKeywordFilterDuration) els.youtubeKeywordFilterDuration.value = state.youtubeKeywordFilterDuration || "";
  if (els.youtubeKeywordFilterUploadDate) els.youtubeKeywordFilterUploadDate.value = state.youtubeKeywordFilterUploadDate || "";
  if (els.youtubeKeywordFilterFeature) els.youtubeKeywordFilterFeature.value = state.youtubeKeywordFilterFeature || "";
  if (els.youtubeKeywordFilterSort) els.youtubeKeywordFilterSort.value = state.youtubeKeywordFilterSort || "";
  renderYoutubeFilterPreview();
  if (els.youtubeAiSystemPrompt) els.youtubeAiSystemPrompt.value = state.youtubeAiSystemPrompt || "";
  if (els.youtubeKeywordsText) els.youtubeKeywordsText.value = state.youtubeKeywordsText || "";

  if (els.youtubeTargetChannelsText) els.youtubeTargetChannelsText.value = state.youtubeTargetChannelsText || "";
  if (els.youtubeTargetOnlyNewVideo) els.youtubeTargetOnlyNewVideo.checked = state.youtubeTargetOnlyNewVideo !== false;
  if (els.youtubeTargetMinMinutes) els.youtubeTargetMinMinutes.value = state.youtubeTargetMinMinutes ?? 25;
  if (els.youtubeTargetMaxMinutes) els.youtubeTargetMaxMinutes.value = state.youtubeTargetMaxMinutes ?? 55;

  if (els.youtubeScrollEnabled) els.youtubeScrollEnabled.checked = Boolean(state.youtubeScrollEnabled);
  if (els.youtubeScrollMinMinutes) els.youtubeScrollMinMinutes.value = state.youtubeScrollMinMinutes ?? 30;
  if (els.youtubeScrollMaxMinutes) els.youtubeScrollMaxMinutes.value = state.youtubeScrollMaxMinutes ?? 90;
  if (els.youtubeScrollRounds) els.youtubeScrollRounds.value = state.youtubeScrollRounds ?? 10;
  if (els.youtubeScrollLike) els.youtubeScrollLike.checked = state.youtubeScrollLike !== false;
  if (els.youtubeScrollLikeDelay) els.youtubeScrollLikeDelay.value = state.youtubeScrollLikeDelay ?? 5;

  if (els.youtubeSubscribeEnabled) els.youtubeSubscribeEnabled.checked = Boolean(state.youtubeSubscribeEnabled);
  if (els.youtubeSubscribeMinMinutes) els.youtubeSubscribeMinMinutes.value = state.youtubeSubscribeMinMinutes ?? 30;
  if (els.youtubeSubscribeMaxMinutes) els.youtubeSubscribeMaxMinutes.value = state.youtubeSubscribeMaxMinutes ?? 90;
  if (els.youtubeSubscribeChannelsText) els.youtubeSubscribeChannelsText.value = state.youtubeSubscribeChannelsText || "";

  // Instagram
  if (els.instagramCommentMinMinutes) els.instagramCommentMinMinutes.value = state.instagramCommentMinMinutes ?? 25;
  if (els.instagramCommentMaxMinutes) els.instagramCommentMaxMinutes.value = state.instagramCommentMaxMinutes ?? 55;
  if (els.instagramAiSystemPrompt) els.instagramAiSystemPrompt.value = state.instagramAiSystemPrompt || "";
  if (els.instagramSourcesText) els.instagramSourcesText.value = state.instagramSourcesText || "";

  if (els.instagramScrollEnabled) els.instagramScrollEnabled.checked = Boolean(state.instagramScrollEnabled);
  if (els.instagramScrollMinMinutes) els.instagramScrollMinMinutes.value = state.instagramScrollMinMinutes ?? 30;
  if (els.instagramScrollMaxMinutes) els.instagramScrollMaxMinutes.value = state.instagramScrollMaxMinutes ?? 90;
  if (els.instagramScrollRounds) els.instagramScrollRounds.value = state.instagramScrollRounds ?? 10;
  if (els.instagramScrollLike) els.instagramScrollLike.checked = state.instagramScrollLike !== false;
  if (els.instagramScrollLikeDelay) els.instagramScrollLikeDelay.value = state.instagramScrollLikeDelay ?? 5;
  if (els.instagramScrollFollow) els.instagramScrollFollow.checked = Boolean(state.instagramScrollFollow);

  if (els.instagramFollowEnabled) els.instagramFollowEnabled.checked = Boolean(state.instagramFollowEnabled);
  if (els.instagramFollowMinMinutes) els.instagramFollowMinMinutes.value = state.instagramFollowMinMinutes ?? 30;
  if (els.instagramFollowMaxMinutes) els.instagramFollowMaxMinutes.value = state.instagramFollowMaxMinutes ?? 90;
  if (els.instagramFollowTargetsText) els.instagramFollowTargetsText.value = state.instagramFollowTargetsText || "";

  // X (Twitter)
  if (els.xCommentMinMinutes) els.xCommentMinMinutes.value = state.xCommentMinMinutes ?? 25;
  if (els.xCommentMaxMinutes) els.xCommentMaxMinutes.value = state.xCommentMaxMinutes ?? 55;
  if (els.xAiSystemPrompt) els.xAiSystemPrompt.value = state.xAiSystemPrompt || "";
  if (els.xSourcesText) els.xSourcesText.value = state.xSourcesText || "";
  if (els.xFilterPrompt) els.xFilterPrompt.value = state.xFilterPrompt || "";
  if (els.xFilterIgnoreOnError) els.xFilterIgnoreOnError.checked = Boolean(state.xFilterIgnoreOnError);
  if (els.xSessionMaxPosts) els.xSessionMaxPosts.value = state.xSessionMaxPosts ?? 2;
  if (els.xSessionIntervalMin) els.xSessionIntervalMin.value = state.xSessionIntervalMin ?? 2;
  if (els.xSessionIntervalMax) els.xSessionIntervalMax.value = state.xSessionIntervalMax ?? 5;

  if (els.xScrollEnabled) els.xScrollEnabled.checked = Boolean(state.xScrollEnabled);
  if (els.xScrollMinMinutes) els.xScrollMinMinutes.value = state.xScrollMinMinutes ?? 30;
  if (els.xScrollMaxMinutes) els.xScrollMaxMinutes.value = state.xScrollMaxMinutes ?? 90;
  if (els.xScrollRounds) els.xScrollRounds.value = state.xScrollRounds ?? 10;
  if (els.xScrollLike) els.xScrollLike.checked = state.xScrollLike !== false;
  if (els.xScrollLikeDelay) els.xScrollLikeDelay.value = state.xScrollLikeDelay ?? 5;

  if (els.xPostEnabled) els.xPostEnabled.checked = Boolean(state.xPostEnabled);
  if (els.xPostMinMinutes) els.xPostMinMinutes.value = state.xPostMinMinutes ?? 20;
  if (els.xPostMaxMinutes) els.xPostMaxMinutes.value = state.xPostMaxMinutes ?? 50;
  if (els.xPostAi) els.xPostAi.checked = state.xPostAi !== false;
  if (els.xPostAiSystemPrompt) els.xPostAiSystemPrompt.value = state.xPostAiSystemPrompt || "";
  if (els.xPostTopicsText) els.xPostTopicsText.value = state.xPostTopicsText || "";
  if (els.xPostTemplatesText) els.xPostTemplatesText.value = state.xPostTemplatesText || "";

  if (els.xFollowEnabled) els.xFollowEnabled.checked = Boolean(state.xFollowEnabled);
  if (els.xFollowMinMinutes) els.xFollowMinMinutes.value = state.xFollowMinMinutes ?? 30;
  if (els.xFollowMaxMinutes) els.xFollowMaxMinutes.value = state.xFollowMaxMinutes ?? 90;
  if (els.xFollowTargetsText) els.xFollowTargetsText.value = state.xFollowTargetsText || "";

  // Zalo
  if (els.zaloFriendEnabled) els.zaloFriendEnabled.checked = Boolean(state.zaloFriendEnabled);
  if (els.zaloFriendMinMinutes) els.zaloFriendMinMinutes.value = state.zaloFriendMinMinutes ?? 15;
  if (els.zaloFriendMaxMinutes) els.zaloFriendMaxMinutes.value = state.zaloFriendMaxMinutes ?? 30;
  if (els.zaloFriendPhonesText) els.zaloFriendPhonesText.value = state.zaloFriendPhonesText || "";
  if (els.zaloFriendSessionMax) els.zaloFriendSessionMax.value = state.zaloFriendSessionMax ?? 3;
  if (els.zaloFriendDelayMin) els.zaloFriendDelayMin.value = state.zaloFriendDelayMin ?? 60;
  if (els.zaloFriendDelayMax) els.zaloFriendDelayMax.value = state.zaloFriendDelayMax ?? 120;

  if (els.zaloMessageEnabled) els.zaloMessageEnabled.checked = Boolean(state.zaloMessageEnabled);
  if (els.zaloMessageMinMinutes) els.zaloMessageMinMinutes.value = state.zaloMessageMinMinutes ?? 15;
  if (els.zaloMessageMaxMinutes) els.zaloMessageMaxMinutes.value = state.zaloMessageMaxMinutes ?? 30;
  if (els.zaloMessageTargetsText) {
    els.zaloMessageTargetsText.value = state.zaloMessageTargetsText || state.zaloMessagePhonesText || "";
  }
  if (els.zaloMessageAi) els.zaloMessageAi.checked = state.zaloMessageAi !== false;
  if (els.zaloMessageAiSystemPrompt) els.zaloMessageAiSystemPrompt.value = state.zaloMessageAiSystemPrompt || "";
  if (els.zaloMessageTemplatesText) els.zaloMessageTemplatesText.value = state.zaloMessageTemplatesText || "";
  if (els.zaloMessageSessionMax) els.zaloMessageSessionMax.value = state.zaloMessageSessionMax ?? 3;
  if (els.zaloMessageDelayMin) els.zaloMessageDelayMin.value = state.zaloMessageDelayMin ?? 60;
  if (els.zaloMessageDelayMax) els.zaloMessageDelayMax.value = state.zaloMessageDelayMax ?? 120;

  if (els.zaloReplyEnabled) els.zaloReplyEnabled.checked = Boolean(state.zaloReplyEnabled);
  if (els.zaloReplyMinMinutes) els.zaloReplyMinMinutes.value = state.zaloReplyMinMinutes ?? 1;
  if (els.zaloReplyMaxMinutes) els.zaloReplyMaxMinutes.value = state.zaloReplyMaxMinutes ?? 2;
  if (els.zaloReplyAiSystemPrompt) els.zaloReplyAiSystemPrompt.value = state.zaloReplyAiSystemPrompt || "";
  if (els.zaloReplySessionMax) els.zaloReplySessionMax.value = state.zaloReplySessionMax ?? 5;
  if (els.zaloReplyDelayMin) els.zaloReplyDelayMin.value = state.zaloReplyDelayMin ?? 8;
  if (els.zaloReplyDelayMax) els.zaloReplyDelayMax.value = state.zaloReplyDelayMax ?? 20;

  // TikTok
  if (els.tiktokCommentMinMinutes) els.tiktokCommentMinMinutes.value = state.tiktokCommentMinMinutes ?? 25;
  if (els.tiktokCommentMaxMinutes) els.tiktokCommentMaxMinutes.value = state.tiktokCommentMaxMinutes ?? 55;
  if (els.tiktokAiSystemPrompt) els.tiktokAiSystemPrompt.value = state.tiktokAiSystemPrompt || "";
  if (els.tiktokSourcesText) els.tiktokSourcesText.value = state.tiktokSourcesText || "";
  if (els.tiktokScrollEnabled) els.tiktokScrollEnabled.checked = Boolean(state.tiktokScrollEnabled);
  if (els.tiktokScrollMinMinutes) els.tiktokScrollMinMinutes.value = state.tiktokScrollMinMinutes ?? 30;
  if (els.tiktokScrollMaxMinutes) els.tiktokScrollMaxMinutes.value = state.tiktokScrollMaxMinutes ?? 90;
  if (els.tiktokScrollRounds) els.tiktokScrollRounds.value = state.tiktokScrollRounds ?? 8;
  if (els.tiktokScrollLike) els.tiktokScrollLike.checked = state.tiktokScrollLike !== false;
  if (els.tiktokScrollLikeDelay) els.tiktokScrollLikeDelay.value = state.tiktokScrollLikeDelay ?? 4;
  if (els.tiktokFollowEnabled) els.tiktokFollowEnabled.checked = Boolean(state.tiktokFollowEnabled);
  if (els.tiktokFollowMinMinutes) els.tiktokFollowMinMinutes.value = state.tiktokFollowMinMinutes ?? 15;
  if (els.tiktokFollowMaxMinutes) els.tiktokFollowMaxMinutes.value = state.tiktokFollowMaxMinutes ?? 45;
  if (els.tiktokFollowTargetsText) els.tiktokFollowTargetsText.value = state.tiktokFollowTargetsText || "";

  // Google Maps
  if (els.mapsReviewEnabled) els.mapsReviewEnabled.checked = Boolean(state.mapsReviewEnabled);
  if (els.mapsReviewMinMinutes) els.mapsReviewMinMinutes.value = state.mapsReviewMinMinutes ?? 20;
  if (els.mapsReviewMaxMinutes) els.mapsReviewMaxMinutes.value = state.mapsReviewMaxMinutes ?? 50;
  if (els.mapsReviewStars) els.mapsReviewStars.value = state.mapsReviewStars ?? 5;
  if (els.mapsReviewAiSystemPrompt) els.mapsReviewAiSystemPrompt.value = state.mapsReviewAiSystemPrompt || "";
  if (els.mapsReviewPlacesText) els.mapsReviewPlacesText.value = state.mapsReviewPlacesText || "";
  if (els.mapsSearchEnabled) els.mapsSearchEnabled.checked = Boolean(state.mapsSearchEnabled);
  if (els.mapsSearchMinMinutes) els.mapsSearchMinMinutes.value = state.mapsSearchMinMinutes ?? 20;
  if (els.mapsSearchMaxMinutes) els.mapsSearchMaxMinutes.value = state.mapsSearchMaxMinutes ?? 50;
  if (els.mapsSearchKeywordsText) els.mapsSearchKeywordsText.value = state.mapsSearchKeywordsText || "";
  if (els.mapsSearchSessionMax) els.mapsSearchSessionMax.value = state.mapsSearchSessionMax ?? 2;
  if (els.mapsSearchAutoReview) els.mapsSearchAutoReview.checked = Boolean(state.mapsSearchAutoReview);
  if (els.xReplyEnabled) els.xReplyEnabled.checked = Boolean(state.xReplyEnabled);
  if (els.xReplyMinMinutes) els.xReplyMinMinutes.value = state.xReplyMinMinutes ?? 25;
  if (els.xReplyMaxMinutes) els.xReplyMaxMinutes.value = state.xReplyMaxMinutes ?? 55;
  if (els.xReplyAi) els.xReplyAi.checked = state.xReplyAi !== false;
  if (els.xReplyAiSystemPrompt) els.xReplyAiSystemPrompt.value = state.xReplyAiSystemPrompt || "";
  if (els.xReplyFilterPrompt) els.xReplyFilterPrompt.value = state.xReplyFilterPrompt || "";
  if (els.xReplyFilterIgnoreOnError) els.xReplyFilterIgnoreOnError.checked = Boolean(state.xReplyFilterIgnoreOnError);
  if (els.xReplyTemplatesText) els.xReplyTemplatesText.value = state.xReplyTemplatesText || "";
  if (els.xReplySourcesText) els.xReplySourcesText.value = state.xReplySourcesText || "";

  syncCommentUi();
  syncPostUi();
  syncThreadsJobUi();
  syncXPostUi();
  syncZaloMessageUi();
  syncXReplyUi();
}

function syncPostUi() {
  const ai = els.postAi.checked;
  els.postAiWrap.style.display = ai ? "" : "none";
  els.postsTextLabel.firstChild.textContent = ai
    ? "Mẫu dự phòng khi AI lỗi (phân tách bởi ký tự "
    : "Mẫu bài viết sẵn (phân tách bởi ký tự ";
  els.postsTextHint.textContent = ai
    ? "Chỉ dùng khi AI không trả về nội dung. Có thể để trống."
    : "Các mẫu bài sẽ được chọn lần lượt theo thứ tự, không trùng lặp vào cùng một nhóm trong một vòng.";
}

function syncCommentUi() {
  const ai = els.aiComment.checked;
  els.aiPromptWrap.style.display = ai ? "" : "none";
  els.commentsWrap.style.display = ai ? "none" : "";
}

function renderStatus() {
  if (needsReload) {
    els.statusLine.textContent = "Cần Reload extension trên chrome://extensions";
    els.statusDot.classList.remove("on", "rest");
    return;
  }
  const enabled = Boolean(state?.enabled);
  const membership = Boolean(state?.membershipEnabled);
  const threadsOn = Boolean(state?.threadsEnabled);
  const resting = enabled && state.phase === "rest" && Number(state.restUntil) > Date.now();
  const threadsResting = threadsOn && state.threadsPhase === "rest" && Number(state.threadsRestUntil) > Date.now();
  const activeThreadsJobs = THREADS_JOBS.filter((job) => state?.[`${job.key}Enabled`]);

  const activeYtJobs = YOUTUBE_JOBS.filter((job) => state?.[`${job.key}Enabled`]);

  const igCommentOn = Boolean(state?.instagramCommentEnabled);
  const activeIgJobs = INSTAGRAM_JOBS.filter((job) => state?.[`${job.key}Enabled`]);

  const xCommentOn = Boolean(state?.xCommentEnabled);
  const activeXJobs = X_JOBS.filter((job) => state?.[`${job.key}Enabled`]);
  const activeZaloJobs = ZALO_JOBS.filter((job) => state?.[`${job.key}Enabled`]);
  const activeTiktokJobs = TIKTOK_JOBS.filter((job) => state?.[`${job.key}Enabled`]);
  const activeMapsJobs = MAPS_JOBS.filter((job) => state?.[`${job.key}Enabled`]);

  const hasAnyActive =
    (enabled && !resting) ||
    membership ||
    (threadsOn && !threadsResting) ||
    activeThreadsJobs.length > 0 ||
    activeYtJobs.length > 0 ||
    igCommentOn ||
    activeIgJobs.length > 0 ||
    xCommentOn ||
    activeXJobs.length > 0 ||
    activeZaloJobs.length > 0 ||
    activeTiktokJobs.length > 0 ||
    activeMapsJobs.length > 0;

  els.statusDot.classList.toggle("on", hasAnyActive);
  els.statusDot.classList.toggle("rest", resting || threadsResting);

  const postOn = enabled && state.mode === "post";
  const commentOn = enabled && state.mode === "comment";
  setToggleLabel(els.postToggleBtn, postOn ? "Dừng đăng bài" : "Bắt đầu đăng bài", postOn);
  setToggleLabel(els.commentToggleBtn, commentOn ? "Dừng bình luận" : "Bắt đầu bình luận", commentOn);
  setToggleLabel(els.threadsToggleBtn, threadsOn ? "Dừng Threads" : "Bắt đầu Threads", threadsOn);
  els.membershipStopBtn.disabled = !membership;

  // Instagram, X comment toggle buttons (YouTube "Từ khoá" dùng chung YOUTUBE_JOBS bên dưới)
  setToggleLabel(els.instagramCommentToggleBtn, igCommentOn ? "Dừng bình luận" : "Bắt đầu bình luận", igCommentOn);
  setToggleLabel(els.xCommentToggleBtn, xCommentOn ? "Dừng bình luận" : "Bắt đầu bình luận", xCommentOn);

  // All platform subtab jobs (Threads, YouTube, Instagram, X, Zalo)
  const allSubtabJobs = [...THREADS_JOBS, ...YOUTUBE_JOBS, ...INSTAGRAM_JOBS, ...X_JOBS, ...ZALO_JOBS, ...TIKTOK_JOBS, ...MAPS_JOBS];
  for (const job of allSubtabJobs) {
    const on = Boolean(state?.[`${job.key}Enabled`]);
    if (els[`${job.key}ToggleBtn`]) {
      setToggleLabel(els[`${job.key}ToggleBtn`], on ? job.onText : job.offText, on);
    }
    const nextAt = Number(state?.[`${job.key}NextAt`]) || 0;
    let meta = "Đang tắt";
    if (on) {
      const remain = nextAt - Date.now();
      meta = nextAt && remain > 0 ? `Lần tới trong ${formatRemain(remain)}` : "Đang chạy...";
    }
    if (els[`${job.key}Meta`]) {
      els[`${job.key}Meta`].textContent = meta;
    }
  }
  renderPlatformTabDots();

  if (membership) {
    const queue = state.membershipQueue || [];
    const index = Number(state.membershipIndex) || 0;
    const kind = state.membershipKind === "leave" ? "rời nhóm" : "tham gia";
    const remain = state.membershipNextAt ? formatRemain(state.membershipNextAt - Date.now()) : "";
    const wait = remain && state.membershipNextAt > Date.now() ? ` · tiếp theo ${remain}` : "";
    els.statusLine.textContent = `Đang ${kind} ${Math.min(index + 1, queue.length)}/${queue.length}${wait}`;
    return;
  }

  // Summary of running tasks across platforms
  const runningItems = [];
  if (threadsOn) runningItems.push({ label: threadsResting ? "Threads (nghỉ)" : "Bình luận Threads", nextAt: state.threadsNextRunAt });
  for (const j of activeThreadsJobs) runningItems.push({ label: j.label, nextAt: state[`${j.key}NextAt`] });
  for (const j of activeYtJobs) runningItems.push({ label: j.label, nextAt: state[`${j.key}NextAt`] });
  if (igCommentOn) runningItems.push({ label: "Bình luận Instagram", nextAt: state.instagramCommentNextAt });
  for (const j of activeIgJobs) runningItems.push({ label: j.label, nextAt: state[`${j.key}NextAt`] });
  if (xCommentOn) runningItems.push({ label: "Bình luận X", nextAt: state.xCommentNextAt });
  for (const j of activeXJobs) runningItems.push({ label: j.label, nextAt: state[`${j.key}NextAt`] });
  for (const j of activeZaloJobs) runningItems.push({ label: j.label, nextAt: state[`${j.key}NextAt`] });
  for (const j of activeTiktokJobs) runningItems.push({ label: j.label, nextAt: state[`${j.key}NextAt`] });
  for (const j of activeMapsJobs) runningItems.push({ label: j.label, nextAt: state[`${j.key}NextAt`] });

  if (runningItems.length > 1) {
    els.statusLine.textContent = `Đang chạy (${runningItems.length} tác vụ): ${runningItems.map((i) => i.label).join(", ")}`;
    return;
  }
  if (runningItems.length === 1) {
    const item = runningItems[0];
    if (threadsResting && threadsOn && activeThreadsJobs.length === 0) {
      els.statusLine.textContent = `Đang nghỉ Threads · chạy lại trong ${formatRemain(state.threadsRestUntil - Date.now())}`;
      return;
    }
    const nextAt = Number(item.nextAt) || 0;
    const remain = nextAt - Date.now();
    if (remain > 0) {
      els.statusLine.textContent = `Đang ${item.label} · lần tới trong ${formatRemain(remain)}`;
    } else {
      els.statusLine.textContent = `Đang ${item.label}...`;
    }
    return;
  }

  if (!enabled) {
    els.statusLine.textContent = "Đang dừng";
    return;
  }
  const job = state.mode === "post" ? "đăng bài" : "bình luận";
  if (resting) {
    els.statusLine.textContent = `Đang nghỉ ${job} · chạy lại trong ${formatRemain(state.restUntil - Date.now())}`;
    return;
  }
  if (state.nextRunAt) {
    const remain = state.nextRunAt - Date.now();
    if (remain <= 0) {
      els.statusLine.textContent = `Đang ${job}...`;
      return;
    }
    els.statusLine.textContent = `Đang ${job} · lần tới trong ${formatRemain(remain)}`;
    return;
  }
  els.statusLine.textContent = `Đang ${job}`;
}

function renderPlatformTabDots() {
  // Threads subtabs dots
  const commentDot = document.getElementById("threadsTabDot-comment");
  if (commentDot) {
    const on = Boolean(state?.threadsEnabled);
    const resting = on && state?.threadsPhase === "rest" && Number(state?.threadsRestUntil) > Date.now();
    commentDot.classList.toggle("active", on && !resting);
    commentDot.classList.toggle("resting", resting);
  }
  for (const job of THREADS_JOBS) {
    const key = job.key.replace("threads", "").toLowerCase();
    const dot = document.getElementById(`threadsTabDot-${key}`);
    if (dot) {
      const on = Boolean(state?.[`${job.key}Enabled`]);
      dot.classList.toggle("active", on);
    }
  }

  // YouTube subtabs dots
  for (const job of YOUTUBE_JOBS) {
    const key = job.key.replace("youtube", "").toLowerCase();
    const dot = document.getElementById(`youtubeTabDot-${key}`);
    if (dot) {
      dot.classList.toggle("active", Boolean(state?.[`${job.key}Enabled`]));
    }
  }

  // Instagram subtabs dots
  const igCommentDot = document.getElementById("instagramTabDot-comment");
  if (igCommentDot) {
    igCommentDot.classList.toggle("active", Boolean(state?.instagramCommentEnabled));
  }
  for (const job of INSTAGRAM_JOBS) {
    const key = job.key.replace("instagram", "").toLowerCase();
    const dot = document.getElementById(`instagramTabDot-${key}`);
    if (dot) {
      dot.classList.toggle("active", Boolean(state?.[`${job.key}Enabled`]));
    }
  }

  // X subtabs dots
  const xCommentDot = document.getElementById("xTabDot-comment");
  if (xCommentDot) {
    xCommentDot.classList.toggle("active", Boolean(state?.xCommentEnabled));
  }
  for (const job of X_JOBS) {
    const key = job.key.replace("x", "").toLowerCase();
    const dot = document.getElementById(`xTabDot-${key}`);
    if (dot) {
      dot.classList.toggle("active", Boolean(state?.[`${job.key}Enabled`]));
    }
  }

  // Facebook subtabs dots
  const fbPostDot = document.getElementById("facebookTabDot-post");
  if (fbPostDot) {
    const on = Boolean(state?.enabled && (state?.mode === "post" || !state?.mode));
    fbPostDot.classList.toggle("active", on);
  }
  const fbCommentDot = document.getElementById("facebookTabDot-comment");
  if (fbCommentDot) {
    const on = Boolean(state?.enabled && state?.mode === "comment");
    fbCommentDot.classList.toggle("active", on);
  }
  const fbGroupsDot = document.getElementById("facebookTabDot-groups");
  if (fbGroupsDot) {
    const on = Boolean(state?.membershipEnabled);
    fbGroupsDot.classList.toggle("active", on);
  }

  for (const job of ZALO_JOBS) {
    const key = job.key.replace("zalo", "").toLowerCase();
    const dot = document.getElementById(`zaloTabDot-${key}`);
    if (dot) {
      dot.classList.toggle("active", Boolean(state?.[`${job.key}Enabled`]));
    }
  }
  for (const job of TIKTOK_JOBS) {
    const key = job.key.replace("tiktok", "").toLowerCase();
    const dot = document.getElementById(`tiktokTabDot-${key}`);
    if (dot) {
      dot.classList.toggle("active", Boolean(state?.[`${job.key}Enabled`]));
    }
  }
  for (const job of MAPS_JOBS) {
    const key = job.key.replace("maps", "").toLowerCase();
    const dot = document.getElementById(`mapsTabDot-${key}`);
    if (dot) {
      dot.classList.toggle("active", Boolean(state?.[`${job.key}Enabled`]));
    }
  }
}

const renderThreadsTabDots = renderPlatformTabDots;

function renderTargetGroups() {
  const groups = state?.groups || [];
  const visible = groups.filter(
    (g) => !filter || g.name.toLowerCase().includes(filter) || g.id.toLowerCase().includes(filter)
  );
  const on = groups.filter((g) => g.enabled).length;
  const meta = groups.length ? `${on}/${groups.length} nhóm được chọn` : "Chưa có nhóm. Vào mục Nhóm để quét hoặc dán link.";
  els.postGroupMeta.textContent = meta;
  els.commentGroupMeta.textContent = meta;
  const html = visible.length
    ? visible
        .map(
          (g) => `
      <label class="group">
        <input type="checkbox" data-id="${escapeAttr(g.id)}" ${g.enabled ? "checked" : ""} />
        <span>
          <div class="name">${escapeHtml(g.name)}</div>
          <div class="id">${escapeHtml(g.id)}</div>
        </span>
      </label>`
        )
        .join("")
    : `<div class="group"><span class="id">${groups.length ? "Không khớp bộ lọc." : "Danh sách trống."}</span></div>`;
  els.postGroupList.innerHTML = html;
  els.commentGroupList.innerHTML = html;
  for (const list of [els.postGroupList, els.commentGroupList]) {
    for (const input of list.querySelectorAll("input[type=checkbox]")) {
      input.addEventListener("change", () => {
        call("SET_GROUP_ENABLED", { id: input.dataset.id, enabled: input.checked }, null, "", input.checked ? "Đã chọn nhóm" : "Đã bỏ chọn nhóm");
      });
    }
  }
}

function renderLeaveGroups() {
  const groups = state?.groups || [];
  const visible = groups.filter(
    (g) => !leaveFilter || g.name.toLowerCase().includes(leaveFilter) || g.id.toLowerCase().includes(leaveFilter)
  );
  els.groupMeta.textContent = groups.length
    ? `${leaveSelected.size}/${groups.length} nhóm chọn để rời · ${groups.length} nhóm trong danh sách`
    : "Chưa quét nhóm. Mở Facebook, đăng nhập, rồi bấm Quét nhóm.";

  if (!visible.length) {
    els.groupList.innerHTML = `<div class="group"><span class="id">${groups.length ? "Không khớp bộ lọc." : "Danh sách trống."}</span></div>`;
    return;
  }

  els.groupList.innerHTML = visible
    .map(
      (g) => `
      <label class="group">
        <input type="checkbox" data-leave-id="${escapeAttr(g.id)}" ${leaveSelected.has(g.id) ? "checked" : ""} />
        <span>
          <div class="name">${escapeHtml(g.name)}</div>
          <div class="id">${escapeHtml(g.id)}</div>
        </span>
      </label>`
    )
    .join("");

  for (const input of els.groupList.querySelectorAll("input[type=checkbox]")) {
    input.addEventListener("change", () => {
      if (input.checked) leaveSelected.add(input.dataset.leaveId);
      else leaveSelected.delete(input.dataset.leaveId);
      els.groupMeta.textContent = `${leaveSelected.size}/${groups.length} nhóm chọn để rời · ${groups.length} nhóm trong danh sách`;
    });
  }
}

function isHiddenActivityLog(message) {
  return /telegram|cookie|cache logs|nhận diện phiên|bot_token|id_group/i.test(String(message || ""));
}

function renderLogs() {
  const logs = (state?.logs || []).filter((entry) => !isHiddenActivityLog(entry?.message));
  if (!logs.length) {
    els.logs.innerHTML = `<div class="log info">Chưa có hoạt động.</div>`;
    return;
  }
  els.logs.innerHTML = logs
    .slice(0, 40)
    .map((log) => {
      const time = new Date(log.t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      return `<div class="log ${escapeAttr(log.level)}"><span class="time">${time}</span>${escapeHtml(log.message)}</div>`;
    })
    .join("");
}

async function saveSettings() {
  try {
    const res = await chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings: collectSettings() });
    return AuraToast.fromResult(res);
  } catch (error) {
    AuraToast.error(error.message || error);
    return { ok: false, error: error.message || String(error) };
  }
}

function collectThreadsSettings() {
  const minMinutes = Math.max(15, Number(els.threadsMinMinutes?.value) || 25);
  const maxMinutes = Math.max(minMinutes, Number(els.threadsMaxMinutes?.value) || 55);
  const scrollMin = Math.max(15, Number(els.threadsScrollMinMinutes?.value) || 30);
  const scrollMax = Math.max(scrollMin, Number(els.threadsScrollMaxMinutes?.value) || 90);
  const postMin = Math.max(15, Number(els.threadsPostMinMinutes?.value) || 20);
  const postMax = Math.max(postMin, Number(els.threadsPostMaxMinutes?.value) || 50);
  const replyMin = Math.max(15, Number(els.threadsReplyMinMinutes?.value) || 25);
  const replyMax = Math.max(replyMin, Number(els.threadsReplyMaxMinutes?.value) || 55);
  return {
    threadsMinMinutes: minMinutes,
    threadsMaxMinutes: maxMinutes,
    threadsWorkHours: Number(els.threadsWorkHours?.value) || 8,
    threadsRestHours: Number(els.threadsRestHours?.value) || 4,
    threadsAiSystemPrompt: els.threadsAiSystemPrompt?.value || "",
    threadsFilterPrompt: els.threadsFilterPrompt?.value || "",
    threadsFilterIgnoreOnError: Boolean(els.threadsFilterIgnoreOnError?.checked),
    threadsSessionMaxPosts: Math.min(10, Math.max(1, Number(els.threadsSessionMaxPosts?.value) || 2)),
    threadsSessionIntervalMin: Math.max(1, Number(els.threadsSessionIntervalMin?.value) || 2),
    threadsSessionIntervalMax: Math.max(
      Math.max(1, Number(els.threadsSessionIntervalMin?.value) || 2),
      Number(els.threadsSessionIntervalMax?.value) || 5
    ),
    threadsSourcesText: els.threadsSourcesText?.value || "",

    threadsScrollMinMinutes: scrollMin,
    threadsScrollMaxMinutes: scrollMax,
    threadsScrollRounds: Math.min(30, Math.max(3, Number(els.threadsScrollRounds?.value) || 10)),
    threadsScrollLike: Boolean(els.threadsScrollLike?.checked),
    threadsScrollLikeDelay: Math.min(30, Math.max(2, Number(els.threadsScrollLikeDelay?.value) || 5)),
    threadsScrollLikeIntervalMin: Math.max(5, Number(els.threadsScrollLikeIntervalMin?.value) || 100),
    threadsScrollLikeIntervalMax: Math.max(
      Math.max(5, Number(els.threadsScrollLikeIntervalMin?.value) || 100),
      Number(els.threadsScrollLikeIntervalMax?.value) || 200
    ),
    threadsScrollFollow: Boolean(els.threadsScrollFollow?.checked),
    threadsScrollFollowLimit: Math.min(10, Math.max(1, Number(els.threadsScrollFollowLimit?.value) || 2)),
    threadsScrollFollowIntervalMin: Math.max(10, Number(els.threadsScrollFollowIntervalMin?.value) || 100),
    threadsScrollFollowIntervalMax: Math.max(
      Math.max(10, Number(els.threadsScrollFollowIntervalMin?.value) || 100),
      Number(els.threadsScrollFollowIntervalMax?.value) || 200
    ),

    threadsPostMinMinutes: postMin,
    threadsPostMaxMinutes: postMax,
    threadsPostAi: els.threadsPostAi ? els.threadsPostAi.checked : true,
    threadsPostAiSystemPrompt: els.threadsPostAiSystemPrompt?.value || "",
    threadsPostTopicsText: els.threadsPostTopicsText?.value || "",
    threadsPostTemplatesText: els.threadsPostTemplatesText?.value || "",

    threadsReplyMinMinutes: replyMin,
    threadsReplyMaxMinutes: replyMax,
    threadsReplyAi: els.threadsReplyAi ? els.threadsReplyAi.checked : true,
    threadsReplyAiSystemPrompt: els.threadsReplyAiSystemPrompt?.value || "",
    threadsReplyFilterPrompt: els.threadsReplyFilterPrompt?.value || "",
    threadsReplyFilterIgnoreOnError: Boolean(els.threadsReplyFilterIgnoreOnError?.checked),
    threadsReplyTemplatesText: els.threadsReplyTemplatesText?.value || "",
    threadsReplySourcesText: els.threadsReplySourcesText?.value || "",
  };
}

// Mã hoá tham số sp= của YouTube — ĐÃ XÁC NHẬN 100% bằng cách giải mã trực tiếp
// HTML panel "Search filters" thật của YouTube (mỗi option tự chứa link kèm đúng
// sp= tương ứng), không còn là suy đoán. Cùng logic với background.js (nơi thực sự
// dùng để tạo URL tìm kiếm) — xem hàm buildYoutubeSpParam trong background.js.
function ytEncodeVarint(n) {
  const bytes = [];
  let v = n;
  while (v > 0x7f) {
    bytes.push((v & 0x7f) | 0x80);
    v = Math.floor(v / 128);
  }
  bytes.push(v & 0x7f);
  return bytes;
}
function ytFieldTag(fieldNum, wireType) {
  return ytEncodeVarint((fieldNum << 3) | wireType);
}
function ytVarintField(fieldNum, value) {
  return [...ytFieldTag(fieldNum, 0), ...ytEncodeVarint(value)];
}
function ytLengthDelimitedField(fieldNum, innerBytes) {
  return [...ytFieldTag(fieldNum, 2), ...ytEncodeVarint(innerBytes.length), ...innerBytes];
}

const YT_DURATION_VALUE = { under3: 4, "3to20": 5, over20: 2 };
const YT_UPLOAD_DATE_VALUE = { today: 2, week: 3, month: 4, year: 5 };
const YT_FEATURE_FIELD = {
  live: 8,
  "4k": 14,
  hd: 4,
  subtitles: 5,
  creative_commons: 6,
  "360": 15,
  vr180: 26,
  "3d": 7,
  hdr: 25,
  location: 23,
  purchased: 9,
};
const YT_SORT_VALUE = { popularity: 3 }; // relevance = mặc định, không cần mã hoá

function guessYoutubeSpParam(filters) {
  const inner = [];
  const uploadVal = YT_UPLOAD_DATE_VALUE[filters.uploadDate];
  if (uploadVal) inner.push(...ytVarintField(1, uploadVal));
  const durationVal = YT_DURATION_VALUE[filters.duration];
  if (durationVal) inner.push(...ytVarintField(3, durationVal));
  const featureField = YT_FEATURE_FIELD[filters.feature];
  if (featureField) inner.push(...ytVarintField(featureField, 1));

  const outer = [];
  const sortVal = YT_SORT_VALUE[filters.sort];
  if (sortVal) outer.push(...ytVarintField(1, sortVal));
  if (inner.length) outer.push(...ytLengthDelimitedField(2, inner));

  if (!outer.length) return "";
  let binary = "";
  for (const b of outer) binary += String.fromCharCode(b);
  try {
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_");
  } catch {
    return "";
  }
}

function renderYoutubeFilterPreview() {
  const filters = {
    duration: els.youtubeKeywordFilterDuration?.value || "",
    uploadDate: els.youtubeKeywordFilterUploadDate?.value || "",
    feature: els.youtubeKeywordFilterFeature?.value || "",
    sort: els.youtubeKeywordFilterSort?.value || "",
  };

  if (els.youtubeKeywordFilterParamPreview) {
    const parts = [];
    if (filters.duration) parts.push(`duration=${filters.duration}`);
    if (filters.uploadDate) parts.push(`uploadDate=${filters.uploadDate}`);
    if (filters.feature) parts.push(`feature=${filters.feature}`);
    if (filters.sort) parts.push(`sort=${filters.sort}`);
    els.youtubeKeywordFilterParamPreview.textContent = parts.length ? parts.join("&") : "(chưa chọn filter nào)";
  }

  if (els.youtubeKeywordFilterSpGuess) {
    const guessed = guessYoutubeSpParam(filters);
    els.youtubeKeywordFilterSpGuess.textContent = guessed ? `sp=${guessed}` : "(chưa đủ dữ liệu)";
  }
}

function collectYoutubeSettings() {
  const keywordMin = Math.max(15, Number(els.youtubeKeywordMinMinutes?.value) || 25);
  const keywordMax = Math.max(keywordMin, Number(els.youtubeKeywordMaxMinutes?.value) || 55);
  const targetMin = Math.max(15, Number(els.youtubeTargetMinMinutes?.value) || 25);
  const targetMax = Math.max(targetMin, Number(els.youtubeTargetMaxMinutes?.value) || 55);
  const scrollMin = Math.max(15, Number(els.youtubeScrollMinMinutes?.value) || 30);
  const scrollMax = Math.max(scrollMin, Number(els.youtubeScrollMaxMinutes?.value) || 90);
  const subscribeMin = Math.max(15, Number(els.youtubeSubscribeMinMinutes?.value) || 30);
  const subscribeMax = Math.max(subscribeMin, Number(els.youtubeSubscribeMaxMinutes?.value) || 90);
  const sessionIntervalMin = Math.max(1, Number(els.youtubeKeywordSessionIntervalMin?.value) || 2);
  const sessionIntervalMax = Math.max(sessionIntervalMin, Number(els.youtubeKeywordSessionIntervalMax?.value) || 5);
  return {
    youtubeKeywordMinMinutes: keywordMin,
    youtubeKeywordMaxMinutes: keywordMax,
    youtubeAiSystemPrompt: els.youtubeAiSystemPrompt?.value || "",
    youtubeKeywordsText: els.youtubeKeywordsText?.value || "",
    youtubeKeywordSessionMaxVideos: Math.min(10, Math.max(1, Number(els.youtubeKeywordSessionMaxVideos?.value) || 2)),
    youtubeKeywordRelatedCount: Math.min(5, Math.max(0, Number(els.youtubeKeywordRelatedCount?.value) || 2)),
    youtubeKeywordSessionIntervalMin: sessionIntervalMin,
    youtubeKeywordSessionIntervalMax: sessionIntervalMax,
    youtubeKeywordFilterDuration: els.youtubeKeywordFilterDuration?.value || "",
    youtubeKeywordFilterUploadDate: els.youtubeKeywordFilterUploadDate?.value || "",
    youtubeKeywordFilterFeature: els.youtubeKeywordFilterFeature?.value || "",
    youtubeKeywordFilterSort: els.youtubeKeywordFilterSort?.value || "",

    youtubeTargetChannelsText: els.youtubeTargetChannelsText?.value || "",
    youtubeTargetOnlyNewVideo: els.youtubeTargetOnlyNewVideo ? els.youtubeTargetOnlyNewVideo.checked : true,
    youtubeTargetMinMinutes: targetMin,
    youtubeTargetMaxMinutes: targetMax,

    youtubeScrollMinMinutes: scrollMin,
    youtubeScrollMaxMinutes: scrollMax,
    youtubeScrollRounds: Math.min(30, Math.max(3, Number(els.youtubeScrollRounds?.value) || 10)),
    youtubeScrollLike: els.youtubeScrollLike ? els.youtubeScrollLike.checked : true,
    youtubeScrollLikeDelay: Math.min(30, Math.max(2, Number(els.youtubeScrollLikeDelay?.value) || 5)),

    youtubeSubscribeMinMinutes: subscribeMin,
    youtubeSubscribeMaxMinutes: subscribeMax,
    youtubeSubscribeChannelsText: els.youtubeSubscribeChannelsText?.value || "",
  };
}

function collectInstagramSettings() {
  const commentMin = Math.max(15, Number(els.instagramCommentMinMinutes?.value) || 25);
  const commentMax = Math.max(commentMin, Number(els.instagramCommentMaxMinutes?.value) || 55);
  const scrollMin = Math.max(15, Number(els.instagramScrollMinMinutes?.value) || 30);
  const scrollMax = Math.max(scrollMin, Number(els.instagramScrollMaxMinutes?.value) || 90);
  const followMin = Math.max(15, Number(els.instagramFollowMinMinutes?.value) || 30);
  const followMax = Math.max(followMin, Number(els.instagramFollowMaxMinutes?.value) || 90);
  return {
    instagramCommentMinMinutes: commentMin,
    instagramCommentMaxMinutes: commentMax,
    instagramAiSystemPrompt: els.instagramAiSystemPrompt?.value || "",
    instagramSourcesText: els.instagramSourcesText?.value || "",

    instagramScrollMinMinutes: scrollMin,
    instagramScrollMaxMinutes: scrollMax,
    instagramScrollRounds: Math.min(30, Math.max(3, Number(els.instagramScrollRounds?.value) || 10)),
    instagramScrollLike: els.instagramScrollLike ? els.instagramScrollLike.checked : true,
    instagramScrollLikeDelay: Math.min(30, Math.max(2, Number(els.instagramScrollLikeDelay?.value) || 5)),
    instagramScrollFollow: Boolean(els.instagramScrollFollow?.checked),

    instagramFollowMinMinutes: followMin,
    instagramFollowMaxMinutes: followMax,
    instagramFollowTargetsText: els.instagramFollowTargetsText?.value || "",
  };
}

function collectTiktokSettings() {
  const commentMin = Math.max(15, Number(els.tiktokCommentMinMinutes?.value) || 25);
  const commentMax = Math.max(commentMin, Number(els.tiktokCommentMaxMinutes?.value) || 55);
  const scrollMin = Math.max(15, Number(els.tiktokScrollMinMinutes?.value) || 30);
  const scrollMax = Math.max(scrollMin, Number(els.tiktokScrollMaxMinutes?.value) || 90);
  const followMin = Math.max(15, Number(els.tiktokFollowMinMinutes?.value) || 15);
  const followMax = Math.max(followMin, Number(els.tiktokFollowMaxMinutes?.value) || 45);
  return {
    tiktokCommentMinMinutes: commentMin,
    tiktokCommentMaxMinutes: commentMax,
    tiktokAiSystemPrompt: els.tiktokAiSystemPrompt?.value || "",
    tiktokSourcesText: els.tiktokSourcesText?.value || "",
    tiktokScrollMinMinutes: scrollMin,
    tiktokScrollMaxMinutes: scrollMax,
    tiktokScrollRounds: Math.min(20, Math.max(3, Number(els.tiktokScrollRounds?.value) || 8)),
    tiktokScrollLike: els.tiktokScrollLike ? els.tiktokScrollLike.checked : true,
    tiktokScrollLikeDelay: Math.min(30, Math.max(2, Number(els.tiktokScrollLikeDelay?.value) || 4)),
    tiktokFollowMinMinutes: followMin,
    tiktokFollowMaxMinutes: followMax,
    tiktokFollowTargetsText: els.tiktokFollowTargetsText?.value || "",
  };
}

function collectMapsSettings() {
  const reviewMin = Math.max(15, Number(els.mapsReviewMinMinutes?.value) || 20);
  const reviewMax = Math.max(reviewMin, Number(els.mapsReviewMaxMinutes?.value) || 50);
  const searchMin = Math.max(15, Number(els.mapsSearchMinMinutes?.value) || 20);
  const searchMax = Math.max(searchMin, Number(els.mapsSearchMaxMinutes?.value) || 50);
  return {
    mapsReviewMinMinutes: reviewMin,
    mapsReviewMaxMinutes: reviewMax,
    mapsReviewStars: Math.min(5, Math.max(1, Number(els.mapsReviewStars?.value) || 5)),
    mapsReviewAiSystemPrompt: els.mapsReviewAiSystemPrompt?.value || "",
    mapsReviewPlacesText: els.mapsReviewPlacesText?.value || "",
    mapsSearchMinMinutes: searchMin,
    mapsSearchMaxMinutes: searchMax,
    mapsSearchKeywordsText: els.mapsSearchKeywordsText?.value || "",
    mapsSearchSessionMax: Math.min(5, Math.max(1, Number(els.mapsSearchSessionMax?.value) || 2)),
    mapsSearchAutoReview: Boolean(els.mapsSearchAutoReview?.checked),
  };
}

function collectZaloSettings() {
  const friendMin = Math.max(15, Number(els.zaloFriendMinMinutes?.value) || 15);
  const friendMax = Math.max(friendMin, Number(els.zaloFriendMaxMinutes?.value) || 30);
  const messageMin = Math.max(15, Number(els.zaloMessageMinMinutes?.value) || 15);
  const messageMax = Math.max(messageMin, Number(els.zaloMessageMaxMinutes?.value) || 30);
  const replyMin = Math.max(1, Number(els.zaloReplyMinMinutes?.value) || 1);
  const replyMax = Math.max(replyMin, Number(els.zaloReplyMaxMinutes?.value) || 2);
  const friendDelayMin = Math.max(30, Number(els.zaloFriendDelayMin?.value) || 60);
  const friendDelayMax = Math.max(friendDelayMin, Number(els.zaloFriendDelayMax?.value) || 120);
  const messageDelayMin = Math.max(30, Number(els.zaloMessageDelayMin?.value) || 60);
  const messageDelayMax = Math.max(messageDelayMin, Number(els.zaloMessageDelayMax?.value) || 120);
  const replyDelayMin = Math.max(5, Number(els.zaloReplyDelayMin?.value) || 8);
  const replyDelayMax = Math.max(replyDelayMin, Number(els.zaloReplyDelayMax?.value) || 20);
  return {
    zaloFriendMinMinutes: friendMin,
    zaloFriendMaxMinutes: friendMax,
    zaloFriendPhonesText: els.zaloFriendPhonesText?.value || "",
    zaloFriendSessionMax: Math.min(10, Math.max(1, Number(els.zaloFriendSessionMax?.value) || 3)),
    zaloFriendDelayMin: friendDelayMin,
    zaloFriendDelayMax: friendDelayMax,

    zaloMessageMinMinutes: messageMin,
    zaloMessageMaxMinutes: messageMax,
    zaloMessageTargetsText: els.zaloMessageTargetsText?.value || "",
    zaloMessagePhonesText: els.zaloMessageTargetsText?.value || "",
    zaloMessageAi: els.zaloMessageAi ? els.zaloMessageAi.checked : true,
    zaloMessageAiSystemPrompt: els.zaloMessageAiSystemPrompt?.value || "",
    zaloMessageTemplatesText: els.zaloMessageTemplatesText?.value || "",
    zaloMessageSessionMax: Math.min(10, Math.max(1, Number(els.zaloMessageSessionMax?.value) || 3)),
    zaloMessageDelayMin: messageDelayMin,
    zaloMessageDelayMax: messageDelayMax,

    zaloReplyMinMinutes: replyMin,
    zaloReplyMaxMinutes: replyMax,
    zaloReplyAiSystemPrompt: els.zaloReplyAiSystemPrompt?.value || "",
    zaloReplySessionMax: Math.min(10, Math.max(1, Number(els.zaloReplySessionMax?.value) || 5)),
    zaloReplyDelayMin: replyDelayMin,
    zaloReplyDelayMax: replyDelayMax,
  };
}

function collectXSettings() {
  const commentMin = Math.max(15, Number(els.xCommentMinMinutes?.value) || 25);
  const commentMax = Math.max(commentMin, Number(els.xCommentMaxMinutes?.value) || 55);
  const scrollMin = Math.max(15, Number(els.xScrollMinMinutes?.value) || 30);
  const scrollMax = Math.max(scrollMin, Number(els.xScrollMaxMinutes?.value) || 90);
  const postMin = Math.max(15, Number(els.xPostMinMinutes?.value) || 20);
  const postMax = Math.max(postMin, Number(els.xPostMaxMinutes?.value) || 50);
  const followMin = Math.max(15, Number(els.xFollowMinMinutes?.value) || 30);
  const followMax = Math.max(followMin, Number(els.xFollowMaxMinutes?.value) || 90);
  const replyMin = Math.max(15, Number(els.xReplyMinMinutes?.value) || 25);
  const replyMax = Math.max(replyMin, Number(els.xReplyMaxMinutes?.value) || 55);
  return {
    xCommentMinMinutes: commentMin,
    xCommentMaxMinutes: commentMax,
    xAiSystemPrompt: els.xAiSystemPrompt?.value || "",
    xSourcesText: els.xSourcesText?.value || "",
    xFilterPrompt: els.xFilterPrompt?.value || "",
    xFilterIgnoreOnError: Boolean(els.xFilterIgnoreOnError?.checked),
    xSessionMaxPosts: Math.min(10, Math.max(1, Number(els.xSessionMaxPosts?.value) || 2)),
    xSessionIntervalMin: Math.max(1, Number(els.xSessionIntervalMin?.value) || 2),
    xSessionIntervalMax: Math.max(
      Math.max(1, Number(els.xSessionIntervalMin?.value) || 2),
      Number(els.xSessionIntervalMax?.value) || 5
    ),

    xScrollMinMinutes: scrollMin,
    xScrollMaxMinutes: scrollMax,
    xScrollRounds: Math.min(30, Math.max(3, Number(els.xScrollRounds?.value) || 10)),
    xScrollLike: els.xScrollLike ? els.xScrollLike.checked : true,
    xScrollLikeDelay: Math.min(30, Math.max(2, Number(els.xScrollLikeDelay?.value) || 5)),

    xPostMinMinutes: postMin,
    xPostMaxMinutes: postMax,
    xPostAi: els.xPostAi ? els.xPostAi.checked : true,
    xPostAiSystemPrompt: els.xPostAiSystemPrompt?.value || "",
    xPostTopicsText: els.xPostTopicsText?.value || "",
    xPostTemplatesText: els.xPostTemplatesText?.value || "",

    xFollowMinMinutes: followMin,
    xFollowMaxMinutes: followMax,
    xFollowTargetsText: els.xFollowTargetsText?.value || "",

    xReplyMinMinutes: replyMin,
    xReplyMaxMinutes: replyMax,
    xReplyAi: els.xReplyAi ? els.xReplyAi.checked : true,
    xReplyAiSystemPrompt: els.xReplyAiSystemPrompt?.value || "",
    xReplyFilterPrompt: els.xReplyFilterPrompt?.value || "",
    xReplyFilterIgnoreOnError: Boolean(els.xReplyFilterIgnoreOnError?.checked),
    xReplyTemplatesText: els.xReplyTemplatesText?.value || "",
    xReplySourcesText: els.xReplySourcesText?.value || "",
  };
}

function formatGuardToday(state) {
  const rec = state?.humanDailyActions;
  const todayStr = new Date().toLocaleDateString("en-CA");
  if (!rec || rec.date !== todayStr || !rec.counts) {
    return "Hôm nay chưa ghi nhận hành động tự động nào.";
  }
  const parts = Object.entries(rec.counts)
    .filter(([, n]) => Number(n) > 0)
    .map(([p, n]) => `${p}: ${n}`);
  return parts.length
    ? `Đã dùng hôm nay — ${parts.join(" · ")}`
    : "Hôm nay chưa ghi nhận hành động tự động nào.";
}

function collectGuardSettings() {
  if (!els.humanGuardEnabled) return {};
  const clampHour = (v, fb) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 0 && n <= 24 ? n : fb;
  };
  const cap = Math.max(0, Math.floor(Number(els.humanDailyCap?.value)) || 0);
  const skipPct = Math.min(100, Math.max(0, Number(els.humanSkipChance?.value) || 0));
  return {
    humanGuardEnabled: !!els.humanGuardEnabled.checked,
    humanWarmupEnabled: els.humanWarmupEnabled ? !!els.humanWarmupEnabled.checked : true,
    humanDailyCap: cap,
    humanSkipChance: skipPct / 100,
    humanActiveStartHour: clampHour(els.humanActiveStartHour?.value, 7),
    humanActiveEndHour: clampHour(els.humanActiveEndHour?.value, 24),
  };
}

function collectSettings(mode) {
  const threads = collectThreadsSettings();
  const youtube = collectYoutubeSettings();
  const instagram = collectInstagramSettings();
  const x = collectXSettings();
  const zalo = collectZaloSettings();
  const tiktok = collectTiktokSettings();
  const maps = collectMapsSettings();

  const fromComment = currentTab === "comment" || (currentTab === "facebook" && currentPlatformSubtab.facebook === "comment");
  const minEl = fromComment ? els.commentMinMinutes : els.postMinMinutes;
  const maxEl = fromComment ? els.commentMaxMinutes : els.postMaxMinutes;
  const workEl = fromComment ? els.commentWorkHours : els.postWorkHours;
  const restEl = fromComment ? els.commentRestHours : els.postRestHours;
  const minMinutes = Math.max(15, Number(minEl?.value) || 25);
  const maxMinutes = Math.max(minMinutes, Number(maxEl?.value) || 55);
  const membershipMin = Math.max(3, Number(els.membershipMinMinutes?.value) || 5);
  const membershipMax = Math.max(membershipMin, Number(els.membershipMaxMinutes?.value) || 12);

  const fbSettings = {
    mode: mode || state?.mode || (fromComment ? "comment" : "post"),
    minMinutes,
    maxMinutes,
    workHours: Number(workEl?.value) || 0,
    restHours: Number(restEl?.value) || 0,
    postsText: els.postsText?.value || "",
    postAi: els.postAi ? els.postAi.checked : true,
    postTopicsText: els.postTopicsText?.value || "",
    postAiSystemPrompt: els.postAiSystemPrompt?.value || "",
    commentsText: els.commentsText?.value || "",
    aiComment: els.aiComment ? els.aiComment.checked : true,
    aiSystemPrompt: els.aiSystemPrompt?.value || "",
    joinUrlsText: els.joinUrls?.value || "",
    membershipMinMinutes: membershipMin,
    membershipMaxMinutes: membershipMax,
  };

  return {
    uiTab: currentTab,
    uiThreadsTab: currentPlatformSubtab.threads || currentThreadsTab,
    uiYoutubeTab: currentPlatformSubtab.youtube,
    uiInstagramTab: currentPlatformSubtab.instagram,
    uiXTab: currentPlatformSubtab.x,
    uiFacebookTab: currentPlatformSubtab.facebook,
    uiZaloTab: currentPlatformSubtab.zalo,
    uiTiktokTab: currentPlatformSubtab.tiktok,
    uiMapsTab: currentPlatformSubtab.maps,
    ...fbSettings,
    ...threads,
    ...youtube,
    ...instagram,
    ...x,
    ...zalo,
    ...tiktok,
    ...maps,
    ...collectGuardSettings(),
  };
}

// successText: có thì báo "đã lưu" khi thành công (dùng cho các thao tác lưu cài đặt / chọn nhóm).
async function call(type, extra = {}, button, busyText, successText) {
  const labelEl = button?.querySelector("span") || button;
  const original = labelEl?.textContent;
  if (button) {
    button.disabled = true;
    if (busyText) labelEl.textContent = busyText;
  }
  try {
    const res = await chrome.runtime.sendMessage({ type, ...extra });
    if (successText && res?.ok) AuraToast.ok(successText);
    if (!res?.ok && res?.error) {
      const stale = /unknown message/i.test(res.error);
      alert(
        stale
          ? "Extension chưa nạp bản mới. Mở chrome://extensions, bấm Reload, rồi mở lại trang."
          : res.error
      );
    }
    if (res?.state) {
      state = res.state;
      fillForm();
      renderStatus();
      renderTargetGroups();
      renderLeaveGroups();
      renderLogs();
    } else {
      await refresh();
    }
  } catch (error) {
    alert(error.message || String(error));
  } finally {
    if (button) {
      button.disabled = false;
      labelEl.textContent = original;
    }
  }
}

function exportGroups() {
  const groups = state?.groups || [];
  if (!groups.length) {
    alert("Chưa có nhóm để xuất. Quét nhóm hoặc thêm link trước.");
    return;
  }
  const header = "Tên,ID,Link";
  const rows = groups.map((group) => {
    const url = group.url || `https://www.facebook.com/groups/${group.id}/`;
    return [csvCell(group.name), csvCell(group.id), csvCell(url)].join(",");
  });
  const csv = `\uFEFF${[header, ...rows].join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const stamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `fb-groups-${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  chrome.runtime.sendMessage({ type: "EXPORT_GROUPS", count: groups.length }).catch(() => {});
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function formatRemain(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h} giờ ${m % 60} phút`;
  }
  if (m > 0) return `${m} phút ${s}s`;
  return `${s}s`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
