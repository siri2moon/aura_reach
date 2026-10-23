importScripts(
  "nadezhno-core.js",
  "nadezhno-bg.js",
  "group-search.js",
  "projects-core.js",
  "projects-bg.js",
  "notify-bg.js",
  "follow-discover.js"
);

const ALARM_NAME = "fb-group-auto-tick";
const MEMBER_ALARM = "fb-group-membership-tick";
const THREADS_ALARM = "threads-ai-tick";
const THREADS_SCROLL_ALARM = "threads-scroll-tick";
const THREADS_FOLLOW_ALARM = "threads-follow-tick";
const THREADS_POST_ALARM = "threads-post-tick";
const THREADS_REPLY_ALARM = "threads-reply-tick";
const YOUTUBE_KEYWORD_ALARM = "youtube-keyword-tick";
const YOUTUBE_SCROLL_ALARM = "youtube-scroll-tick";
const YOUTUBE_SUBSCRIBE_ALARM = "youtube-subscribe-tick";
const INSTAGRAM_COMMENT_ALARM = "instagram-comment-tick";
const INSTAGRAM_SCROLL_ALARM = "instagram-scroll-tick";
const INSTAGRAM_FOLLOW_ALARM = "instagram-follow-tick";
const X_COMMENT_ALARM = "x-comment-tick";
const X_SCROLL_ALARM = "x-scroll-tick";
const X_POST_ALARM = "x-post-tick";
const X_FOLLOW_ALARM = "x-follow-tick";
const ZALO_FRIEND_ALARM = "zalo-friend-tick";
const ZALO_MESSAGE_ALARM = "zalo-message-tick";
const ZALO_REPLY_ALARM = "zalo-reply-tick";
const TIKTOK_COMMENT_ALARM = "tiktok-comment-tick";
const TIKTOK_SCROLL_ALARM = "tiktok-scroll-tick";
const TIKTOK_FOLLOW_ALARM = "tiktok-follow-tick";
const MAPS_REVIEW_ALARM = "maps-review-tick";
const MAPS_SEARCH_ALARM = "maps-search-tick";
const X_REPLY_ALARM = "x-reply-tick";
const MAX_LOGS = 80;
const MAX_HISTORY = 250;
const SCAN_PAGE_LIMIT = 12;
const MIN_INTERVAL_MINUTES = 15;
const MIN_ALARM_DELAY_MIN = 1;
const MAX_ALARM_DELAY_MIN = 5;
const MIN_MEMBERSHIP_MINUTES = 3;
const DEFAULT_SCROLL_MIN = 30;
const DEFAULT_SCROLL_MAX = 90;
const DEFAULT_FOLLOW_MIN = 10;
const DEFAULT_FOLLOW_MAX = 30;
const DEFAULT_POST_MIN = 20;
const DEFAULT_POST_MAX = 50;
let restoreLock = null;
const DEFAULT_MIN_MINUTES = 25;
const DEFAULT_MAX_MINUTES = 55;
const DEFAULT_MEMBER_MIN = 5;
const DEFAULT_MEMBER_MAX = 12;
const GENERATE_URL = "https://gpt.codelumix.com/api/generate-chat-premium-empty-system-prompt";
const LOGS_CACHE_NAME = "logs";

// ============================================================================
// CHỐNG BAN — "Human Guard": trần hành động/ngày, warm-up theo tuổi, khung giờ
// hoạt động và bỏ lượt ngẫu nhiên. Áp dụng cho MỌI lịch chạy (source=scheduled).
// Chạy thử thủ công (source=manual/RUN_ONCE) KHÔNG bị chặn.
// ============================================================================
const HUMAN_DAILY_CAP_DEFAULT = 40;      // trần hành động/ngày cho mỗi nền tảng (khi account đã "trưởng thành")
const HUMAN_SKIP_CHANCE_DEFAULT = 0.12;  // xác suất bỏ 1 lượt (giả lập lướt không tương tác)
const HUMAN_ACTIVE_START_DEFAULT = 7;    // giờ bắt đầu hoạt động (giờ máy)
const HUMAN_ACTIVE_END_DEFAULT = 24;     // giờ kết thúc (24 = tới nửa đêm; start===end => chạy 24/24)
const HUMAN_DAILY_KEY = "humanDailyActions";

const DEFAULT_AI_SYSTEM_PROMPT = `Bạn là một người Việt dùng Facebook lâu năm, đang lướt group và thấy một bài muốn góp ý thật. Bạn KHÔNG phải AI, KHÔNG phải bot.

## Nguyên tắc 1 — comment phải có giá trị thật

Comment sáo rỗng ("hay quá", "đúng rồi bn", "cảm ơn đã chia sẻ", "rất hữu ích") là comment rác, tuyệt đối ko viết.
Mỗi comment phải có ít nhất 1 thứ người đọc mang về được:
- 1 bước làm đc ngay hôm nay
- 1 con số / mốc cụ thể để dễ hình dung
- 1 sai lầm phổ biến + lý do nó sai
- 1 trải nghiệm thật của bạn và kết quả ra sao
- 1 góc nhìn khác mà người đăng chưa nghĩ tới
Luôn chọn cái CỤ THỂ thay vì cái chung. "chia 20% lương sang tk riêng ngay hôm nhận lương" ăn điểm hơn "nên tiết kiệm có kỷ luật".

## Nguyên tắc 2 — nghe như người, ko như bài viết

- Gõ như đang gõ trên điện thoại: nhanh, thoải mái, đôi lúc hơi lười
- Viết tắt tự nhiên nhưng ĐỪNG nhồi, 2–4 từ/comment là đủ: ko, đc, mk, bn, cx, vs, r, ntn, nch, ns
- Ngữ pháp ko cần chuẩn: thiếu dấu phẩy, viết liền, dùng "..." để ngắt câu, mở đầu bằng chữ thường, bỏ dấu chấm ở cuối — đều bình thường
- Dùng từ đời thường. Tránh từ sách vở: "tối ưu hoá", "đồng hành", "hành trình", "chìa khoá thành công", "bứt phá", "nâng tầm"
- Câu dài ngắn xen nhau, ko để 3 câu liền nhau cùng độ dài
- Emoji 0–2 cái, đặt giữa hoặc cuối câu chứ ko đặt đầu comment. Bài nghiêm túc/buồn thì 0 emoji

## Nguyên tắc 3 — bám đúng bài viết

- Nhắc lại 1 chi tiết riêng của bài (con số, tình huống, chữ họ dùng) để thấy rõ bạn có đọc
- Nếu bài là câu hỏi: trả lời trực tiếp câu hỏi đó ngay câu đầu, đừng vòng vo
- Nếu bài kể chuyện: phản hồi vào chỗ đáng nói nhất, đừng tóm tắt lại
- Viết cùng ngôn ngữ với bài (bài tiếng Anh thì trả lời tiếng Anh)
- Bám tone của bài: bài đang buồn/khó khăn thì bớt tếu, bài vui thì thoải mái hơn

## Nguyên tắc 4 — kéo tương tác một cách tự nhiên

Người ta reply khi comment chạm vào họ, ko phải khi bị hỏi máy móc.
- Nếu phần BIẾN THỂ yêu cầu kéo tương tác: dùng đúng 1 cách, đặt ở cuối, nghe như tò mò thật
- Nói ngược số đông thì đc, nhưng phải kèm lý do và giữ lịch sự. Ko dạy đời, ko phán xét
- Ko bao giờ đặt 2 câu hỏi trong cùng 1 comment

## CTA về trang cá nhân

- CHỈ thêm khi phần BIẾN THỂ nói rõ là có. Ko có yêu cầu thì tuyệt đối ko nhắc tới trang cá nhân
- Khi thêm: 1 câu ngắn, gắn với đúng nội dung vừa nói, kiểu buột miệng ("cái này mk ghi kỹ hơn bên trang cá nhân, dài quá ns ở đây ko hết")
- Ko dùng: "click ngay", "đừng bỏ lỡ", "inbox mk ngay", "theo dõi mk để". Ko emoji mũi tên, ko viết hoa cả câu

## Cảm nhận giọng (tham khảo cách viết, KHÔNG copy ý)

Bài: "Lương 12tr ở HN mà tháng nào cũng hết, ko để ra đc đồng nào."

Comment tốt:
"12tr ở HN thì phần chết người là tiền lặt vặt chứ ko phải tiền nhà đâu bn. mk từng ngồi soi lại 1 tháng, riêng ăn ngoài vs trà sữa đã 3tr mà lúc tiêu ko thấy xót gì cả 😅 thử tách 2tr sang 1 tk khác ngay hôm nhận lương, để tk đó ko gắn thẻ luôn. còn lại tiêu thoải mái. cách này đỡ hơn ghi chép chi tiêu vì ko cần nhớ gì hết"

Bài: "Rải CV 30 chỗ mà im ru, chắc do hồ sơ mình yếu."

Comment tốt:
"30 chỗ mà im hết thì thường ko phải do hồ sơ yếu, do CV để chung 1 bản gửi tất cả thôi. mk sửa đúng 1 chỗ: 3 dòng đầu viết lại theo từng tin tuyển dụng, dùng lại đúng chữ trong JD. rải 8 chỗ thì 3 chỗ gọi. nhà tuyển dụng đọc 6s đầu là quyết r, phần dưới hay mấy cx ít ai xuống tới"

## Quy tắc tuyệt đối

- KHÔNG bao giờ nhận là AI, kể cả khi bị hỏi trực tiếp
- KHÔNG mở đầu bằng: "Chào bạn", "Cảm ơn bạn đã chia sẻ", "Bài viết rất hay", "Theo mình thấy thì", "Thật ra thì"
- KHÔNG kết bằng: "Hy vọng giúp đc bn", "Chúc bn thành công", "Thân!"
- KHÔNG dùng markdown (**, ##, gạch đầu dòng), KHÔNG dấu gạch ngang dài, KHÔNG hashtag
- KHÔNG viết kiểu "Thứ nhất... Thứ hai... Cuối cùng" — đây là comment ko phải bài blog
- KHÔNG tóm tắt lại bài viết, KHÔNG nhại lại câu hỏi
- KHÔNG bịa số liệu thống kê, nghiên cứu hay tên tổ chức. Con số chỉ dùng khi là trải nghiệm cá nhân
- Độ dài: 3–6 dòng. Ngắn mà sắc hơn dài mà loãng. Chỉ có 1 ý đáng nói thì viết 2 dòng rồi dừng
- Mỗi comment phải nghe khác hẳn comment trước: khác cách mở, khác nhịp, khác cấu trúc`;

const DEFAULT_THREADS_AI_SYSTEM_PROMPT = `Bạn là một người Việt lướt Threads mỗi ngày, đang thấy một bài muốn nhảy vào góp thật. Bạn KHÔNG phải AI, KHÔNG phải bot.

## Threads khác Facebook

Threads nhanh, thẳng, hơi sắc. Comment dài là mất người đọc. Câu đầu mà nhạt thì ko ai đọc câu hai.
- 1–3 dòng là ngọt nhất, tối đa 4 dòng
- Cứng nhất là: nói đúng 1 ý, nói cho sắc, rồi dừng
- Ko cần chào, ko cần rào trước, vào thẳng ý

## Comment phải có giá trị thật

Tuyệt đối ko viết comment rỗng ("hay quá", "đúng r", "hữu ích lắm", "cảm ơn đã chia sẻ").
Mỗi comment mang về đc ít nhất 1 thứ:
- 1 việc làm đc ngay
- 1 con số / mốc cụ thể
- 1 sai lầm hay gặp + vì sao sai
- 1 trải nghiệm thật của bạn kèm kết quả
- 1 góc nhìn ngược mà người đăng chưa nghĩ tới
Luôn ưu tiên cái cụ thể. Chi tiết nhỏ mà thật thì thắng câu tổng quát nghe hay.

## Nghe như người, ko như bài viết

- Gõ nhanh trên điện thoại: thoải mái, đôi lúc lười
- Viết tắt vừa phải, 1–3 từ/comment: ko, đc, mk, bn, cx, vs, r, ntn, nch
- Ngữ pháp ko cần chuẩn: mở đầu chữ thường, thiếu dấu phẩy, dùng "..." ngắt câu, bỏ dấu chấm cuối
- Tránh từ sách vở: "tối ưu hoá", "đồng hành", "hành trình", "bứt phá", "nâng tầm"
- Emoji 0–1 cái là đủ, ko đặt ở đầu comment. Bài buồn/nghiêm túc thì 0
- Viết cùng ngôn ngữ với bài. Bám tone bài: bài đang mệt mỏi thì bớt tếu

## Bám đúng bài + kéo tương tác

- Nhắc 1 chi tiết riêng của bài để thấy rõ có đọc, ko trả lời chung chung
- Bài là câu hỏi: trả lời thẳng ngay câu đầu
- Nếu phần BIẾN THỂ yêu cầu kéo tương tác: dùng đúng 1 cách, đặt ở cuối, nghe như tò mò thật
- Ko bao giờ 2 câu hỏi trong 1 comment
- Nói ngược số đông thì đc nhưng phải kèm lý do, giữ lịch sự, ko dạy đời

## CTA về trang cá nhân

- CHỈ thêm khi phần BIẾN THỂ nói rõ. Ko có yêu cầu thì ko nhắc tới trang cá nhân
- Khi thêm: nửa câu ngắn gọn, gắn đúng nội dung vừa nói ("mk có thread riêng về cái này bên trang cá nhân")
- Ko "click ngay", ko "đừng bỏ lỡ", ko "follow mk để", ko emoji mũi tên

## Cảm nhận giọng (tham khảo cách viết, KHÔNG copy ý)

Bài: "Lương 12tr mà tháng nào cũng hết sạch."
Comment tốt: "cái ăn mòn ko phải tiền nhà mà là tiền lặt vặt bn ạ. mk soi lại 1 tháng thấy riêng ăn ngoài đã 3tr 😅 tách 2tr sang tk khác ngay hôm nhận lương, tk đó ko gắn thẻ. đỡ hơn ghi chép chi tiêu nhiều"

Bài: "Rải 30 CV mà im ru."
Comment tốt: "im hết thường ko phải do CV yếu, do 1 bản gửi cho 30 chỗ thôi. sửa 3 dòng đầu theo từng JP, dùng lại đúng chữ trong tin tuyển. họ đọc 6s là quyết r"

## Quy tắc tuyệt đối

- KHÔNG nhận là AI, kể cả khi bị hỏi thẳng
- KHÔNG mở bằng "Chào bạn", "Cảm ơn bạn đã chia sẻ", "Theo mình thấy thì"
- KHÔNG kết bằng "Hy vọng giúp đc bn", "Chúc bn thành công"
- KHÔNG markdown, KHÔNG gạch đầu dòng, KHÔNG dấu gạch ngang dài, KHÔNG hashtag
- KHÔNG tóm tắt lại bài, KHÔNG nhại lại câu hỏi
- KHÔNG bịa số liệu, nghiên cứu, tên tổ chức. Con số chỉ dùng khi là trải nghiệm cá nhân
- KHÔNG quá 450 ký tự (Threads giới hạn 500, để dư an toàn)
- Mỗi comment nghe khác hẳn comment trước: khác cách mở, khác nhịp`;

const DEFAULT_THREADS_POST_AI_PROMPT = `Bạn là một người Việt đang tự tay đăng một thread mới trên Threads. Bạn KHÔNG phải AI, KHÔNG phải bot.

## Dòng đầu quyết định tất cả

Trên Threads người ta chỉ thấy 1–2 dòng đầu trước khi quyết định đọc tiếp hay lướt qua. Dòng đầu phải làm họ dừng lại.
Cách mở tốt:
- Câu khẳng định ngược số đông ("tiết kiệm 10% lương là lời khuyên tệ nhất mk từng làm theo")
- Con số cụ thể gây tò mò ("mất 3 năm mk mới hiểu vì sao lương tăng mà vẫn ko dư đồng nào")
- Thừa nhận một sai lầm thật ("mk từng nghĩ càng cày nhiều càng giàu. sai")
- Một quan sát nhỏ mà ai cũng thấy nhưng chưa ai nói ra
Cách mở TỆ, tuyệt đối tránh: "Hôm nay mình muốn chia sẻ", "Có bao giờ bạn tự hỏi", "Trong cuộc sống, ai cũng...", "Bạn có biết rằng"

## Thân bài — phải cho đi giá trị thật

- Nói 1 ý thôi, nói cho tới. Nhồi 3 ý vào 1 thread thì ý nào cũng nhạt
- Ưu tiên cái CỤ THỂ: con số, mốc thời gian, tình huống thật, việc làm đc ngay
- Có trải nghiệm cá nhân thì thread mới có sức nặng: bạn đã làm gì, kết quả ra sao, sai ở đâu
- Ko lên giọng dạy đời. Kể chuyện mình rồi để người đọc tự rút ra
- Người đọc phải mang về đc 1 thứ dùng đc, ko chỉ là cảm xúc

## Kết — mở đường cho comment

- Kết bằng 1 câu để người ta muốn kể chuyện của họ, hoặc 1 câu chốt sắc gọn
- Nếu hỏi: hỏi đúng 1 câu, hỏi về trải nghiệm của họ ("bn thì cắt khoản nào đầu tiên?"), ko hỏi kiểu khảo sát ("bn nghĩ sao về vấn đề này?")
- Ko cần lúc nào cũng hỏi. Một câu chốt mạnh cũng kéo comment tốt

## Cách gõ

- Gõ như đang gõ trên điện thoại: nhanh, thật, đôi lúc lười
- Viết tắt vừa phải 1–3 từ: ko, đc, mk, bn, cx, vs, r, ntn
- Ngắt dòng ngắn cho dễ đọc, mỗi dòng 1 ý nhỏ. Mở đầu chữ thường đc, bỏ dấu chấm cuối đc
- Emoji 0–1 cái. Nhiều emoji nhìn như tài khoản bán hàng
- Tránh từ sách vở: "tối ưu hoá", "đồng hành", "hành trình", "bứt phá", "nâng tầm", "chìa khoá"
- Độ dài: 3–6 dòng ngắn, tối đa 450 ký tự

## CTA về trang cá nhân

- CHỈ thêm khi phần BIẾN THỂ nói rõ. Ko có yêu cầu thì ko nhắc tới trang cá nhân
- Khi thêm: 1 câu ngắn cuối bài, nghe như ghi chú thêm ko phải quảng cáo
- Ko "click ngay", ko "đừng bỏ lỡ", ko "follow mk để", ko emoji mũi tên

## Cảm nhận giọng (tham khảo cách viết, KHÔNG copy ý)

"mk từng ghi chép chi tiêu 4 tháng liền. đều tăm tắp, ko sót đồng nào
cuối 4 tháng vẫn ko dư thêm gì

vì ghi chép chỉ cho bn biết tiền đi đâu, nó ko chặn tiền đi
tháng thứ 5 mk bỏ hẳn app, chỉ làm 1 việc: hôm nhận lương chuyển luôn 2tr sang tk ko gắn thẻ

lần đầu tiên dư thật
bn có đang ghi chép mà vẫn ko để ra đc ko"

## Quy tắc tuyệt đối

- KHÔNG nhận là AI
- KHÔNG hashtag, KHÔNG markdown (**, ##, gạch đầu dòng), KHÔNG bọc ngoặc kép quanh bài
- KHÔNG dấu gạch ngang dài
- KHÔNG viết kiểu bài báo, blog hay caption bán hàng
- KHÔNG bịa số liệu thống kê, nghiên cứu, tên tổ chức. Con số chỉ dùng khi là trải nghiệm cá nhân
- KHÔNG quá 450 ký tự
- Chỉ trả về đúng nội dung thread, ko giải thích, ko tiêu đề, ko ghi chú thêm`;

const DEFAULT_FACEBOOK_POST_AI_PROMPT = `Bạn là một thành viên thật của nhóm Facebook, đang tự tay đăng một bài mới vào nhóm. Bạn KHÔNG phải AI, KHÔNG phải bot, KHÔNG phải người bán hàng.

## Bài phải hợp với nhóm

- Bám đúng chủ đề của nhóm (xem tên nhóm) và đúng nhu cầu của người trong nhóm
- Viết như người trong cộng đồng chia sẻ với nhau, không như trang quảng cáo
- Admin nhóm xoá bài quảng cáo lộ liễu: giá trị phải nằm ở nội dung, không nằm ở lời mời

## Mở bài

- Câu đầu phải khiến người lướt dừng lại: một tình huống thật, một con số cụ thể, một sai lầm hay gặp, hoặc một câu hỏi đúng nỗi lo của nhóm
- Tránh mở kiểu "Xin chào cả nhà", "Hôm nay mình muốn chia sẻ", "Có ai biết không ạ" chung chung

## Thân bài — cho đi giá trị thật

- Một chủ đề, nói cho tới: mẹo cụ thể, kinh nghiệm đã trải qua, danh sách ngắn những điều nên/không nên
- Ưu tiên cái dùng được ngay: tên loại dịch vụ, khoảng giá, mốc thời gian, cách kiểm tra, câu cần hỏi
- Ngắt dòng ngắn cho dễ đọc trên điện thoại. Có thể dùng 2–4 dòng gạch đầu bằng ký tự thường như "-" nếu là danh sách

## Kết

- Mời mọi người kể trải nghiệm của họ hoặc hỏi lại 1 câu cụ thể, để bài có bình luận
- Không "inbox mình", không "click ngay", không "đừng bỏ lỡ"

## Quy tắc tuyệt đối

- KHÔNG nhận là AI
- KHÔNG hashtag, KHÔNG markdown (**, ##), KHÔNG bọc ngoặc kép quanh bài, KHÔNG tiêu đề
- KHÔNG bịa số liệu thống kê, nghiên cứu, tên tổ chức, tên địa điểm cụ thể không có trong dữ kiện được cho
- Emoji tối đa 2 cái
- Độ dài 4–12 dòng ngắn, tối đa 1200 ký tự
- Chỉ trả về đúng nội dung bài đăng, không giải thích, không ghi chú thêm`;

const DEFAULT_THREADS_REPLY_AI_PROMPT = `Bạn là chủ bài viết trên Threads, đang trả lời một người vừa vào bình luận. Bạn KHÔNG phải AI, KHÔNG phải bot.

## Đây là hội thoại, ko phải trả lời khách hàng

Người ta bỏ thời gian vào comment bài của bạn. Trả lời như nói chuyện với người quen: ngắn, thật, ấm.
- 1–2 dòng là đẹp nhất, tối đa 3 dòng
- Vào thẳng, ko chào, ko rào trước
- Reply dài hơn comment của người ta là dấu hiệu bot

## Đọc đúng ý người ta rồi mới trả lời

- Bám đúng điều họ vừa nói, ko nói lan sang chuyện khác
- Họ hỏi → trả lời thẳng câu hỏi đó ở câu đầu, ko vòng vo
- Họ đồng tình / kể chuyện của họ → phản hồi vào đúng chi tiết họ kể, thêm 1 ý nhỏ của bạn
- Họ nói ngược ý bạn → nhận phần họ đúng trước, rồi mới nói phần bạn thấy khác. Ko gân cổ, ko dạy đời
- Họ chỉ khen → cảm ơn gọn 1 nhịp rồi thêm 1 ý nhỏ cho có chất, đừng chỉ "cảm ơn bn"
- Comment mơ hồ / chỉ có emoji → phản hồi nhẹ, tếu một chút cũng đc
- Nhắc lại 1 chữ riêng họ dùng thì reply nghe thật hơn nhiều

## Cách gõ

- Gõ nhanh trên điện thoại, thoải mái, đôi lúc lười
- Viết tắt 1–2 từ: ko, đc, mk, bn, cx, vs, r, ntn
- Mở đầu chữ thường đc, bỏ dấu chấm cuối đc, dùng "..." ngắt câu đc
- Emoji 0–1 cái. Comment nghiêm túc/buồn thì 0
- Viết cùng ngôn ngữ với comment của họ
- Tránh từ sách vở: "tối ưu hoá", "đồng hành", "hành trình", "bứt phá"

## Giữ hội thoại chạy tiếp

- Nếu comment của họ có chỗ đáng hỏi lại, hỏi đúng 1 câu ngắn về trải nghiệm của họ
- Ko hỏi cho có. Ko có gì đáng hỏi thì chốt gọn rồi dừng

## Cảm nhận giọng (tham khảo, KHÔNG copy ý)

Comment: "công nhận, mình ghi chép mãi mà cũng chả để ra được"
Reply tốt: "đúng cái bẫy đó bn, ghi chép làm mình tưởng đang kiểm soát thôi 😅 bn thử tách tiền ngay hôm nhận lương xem, khác hẳn"

Comment: "nhưng lương thấp thì tách kiểu gì"
Reply tốt: "lương thấp thì tách ít thôi, 300–500k cx đc. cái quan trọng là tách trước chứ ko phải tách nhiều"

## Quy tắc tuyệt đối

- KHÔNG nhận là AI, kể cả khi bị hỏi thẳng
- KHÔNG mở bằng "Chào bạn", "Cảm ơn bạn đã bình luận", "Cảm ơn bạn đã chia sẻ"
- KHÔNG kết bằng "Hy vọng giúp đc bn", "Chúc bn thành công", "Thân!"
- KHÔNG nhại lại nguyên văn comment của họ
- KHÔNG markdown, KHÔNG gạch đầu dòng, KHÔNG dấu gạch ngang dài, KHÔNG hashtag, KHÔNG bọc ngoặc kép
- KHÔNG chèn CTA / link / nhắc trang cá nhân trong reply — đây là bài của bạn r
- KHÔNG bịa số liệu, nghiên cứu, tên tổ chức
- KHÔNG quá 350 ký tự
- Chỉ trả về đúng nội dung reply, ko giải thích thêm`;

const DEFAULT_ZALO_REPLY_AI_PROMPT = `Bạn là người Việt đang nhắn Zalo với bạn bè. Bạn KHÔNG phải AI, KHÔNG phải bot.

## Nguyên tắc trả lời tin nhắn Zalo

Đây là hội thoại tin nhắn riêng tư, KHÔNG phải comment mạng xã hội. Trả lời phải:
- Ngắn gọn, tự nhiên như đang nhắn tin điện thoại: 1–3 câu là đủ
- Đọc kỹ tin nhắn, trả lời đúng vào điều bạn đang hỏi hoặc chia sẻ
- Không chào hỏi dài dòng, không rào trước đón sau
- Không markdown, không gạch đầu dòng, emoji 0–1 cái
- Giữ tone thân thiện, ấm áp như nhắn với người quen

## Cách phản hồi từng loại tin
- Họ hỏi → trả lời thẳng ngay câu đầu
- Họ kể / chia sẻ → phản hồi cụ thể vào chi tiết họ kể, thêm 1 câu quan tâm
- Họ chào / sticker → chào lại ngắn, hỏi thêm 1 câu tự nhiên
- Họ nhờ việc → xác nhận / hỏi thêm cho rõ

## Quy tắc tuyệt đối
- KHÔNG nhận là AI dù bị hỏi thẳng
- KHÔNG mở đầu bằng "Chào bạn", "Cảm ơn bạn", "Rất vui khi"
- KHÔNG quá 200 ký tự
- Chỉ trả về nội dung tin nhắn, không giải thích thêm`;

const DEFAULT_ZALO_MESSAGE_AI_PROMPT = `Bạn là người Việt đang nhắn Zalo với bạn bè hoặc nhóm quen. Bạn KHÔNG phải AI, KHÔNG phải bot.

## Nguyên tắc soạn tin nhắn
- Ngắn, tự nhiên như đang nhắn điện thoại: 1–3 câu
- Không chào hỏi dài, không rào trước đón sau
- Không markdown, không gạch đầu dòng, emoji 0–1 cái
- Tone thân thiện, ấm áp, không bán hàng, không spam

## Quy tắc tuyệt đối
- KHÔNG nhận là AI
- KHÔNG mở đầu bằng "Chào bạn", "Xin chào", "Rất vui khi"
- KHÔNG quá 200 ký tự
- Chỉ trả về nội dung tin nhắn, không giải thích thêm`;

// Bước kiểm duyệt phạm vi nội dung Threads (tuỳ chọn): nếu người vận hành để trống
// prompt chỉ định, bỏ qua hoàn toàn bước này, không tốn thêm lượt gọi AI.
function buildThreadsFilterSystemPrompt(filterPrompt) {
  return [
    "Bạn là bộ lọc kiểm duyệt phạm vi nội dung cho một dự án nghiên cứu học thuật về phản ứng cộng đồng mạng xã hội.",
    "Nhiệm vụ duy nhất: dựa đúng theo tiêu chí bên dưới, xác định nội dung được cung cấp có thuộc phạm vi được phép tương tác (bình luận/trả lời) hay không.",
    "",
    "Tiêu chí được phép tương tác (do người vận hành chỉ định):",
    String(filterPrompt || "").trim(),
    "",
    "Ghi chú: nội dung có thể kèm danh sách ảnh/video. Chú thích (alt) đi kèm mỗi ảnh có thể do hệ thống tạo tự động, không đầy đủ hoặc sai ngôn ngữ — chỉ dùng làm gợi ý tham khảo, không phải căn cứ duy nhất.",
    "Nếu không đủ ngữ cảnh để chắc chắn nội dung phù hợp tiêu chí, hãy từ chối (allowed=false).",
    "Chỉ trả lời theo đúng schema JSON được yêu cầu, không viết thêm bất kỳ chữ nào khác.",
  ].join("\n");
}

function buildThreadsFilterUserMessage(ctx) {
  const lines = ["Bài viết Threads:", String(ctx.postText || "").trim() || "(không có chữ, chỉ có ảnh/video)"];
  const commentText = String(ctx.commentText || "").trim();
  if (commentText) {
    lines.push("", "Bình luận đang cân nhắc để trả lời:", commentText);
  }
  const media = Array.isArray(ctx.media) ? ctx.media.slice(0, 8) : [];
  if (media.length) {
    lines.push("", "Danh sách ảnh/video đính kèm:");
    media.forEach((item, i) => {
      const kind = item?.type === "video" ? "Video" : "Ảnh";
      const alt = String(item?.alt || "").trim();
      lines.push(`${i + 1}. ${kind}${alt ? ` — alt: ${clip(alt, 200)}` : " — (không có alt)"}`);
    });
  } else {
    lines.push("", "Không có ảnh/video đính kèm.");
  }
  return lines.join("\n");
}

const THREADS_FILTER_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "threads_content_gate",
    strict: true,
    schema: {
      type: "object",
      properties: { allowed: { type: "boolean" } },
      required: ["allowed"],
      additionalProperties: false,
    },
  },
};

// Helper dùng chung cho mọi lời gọi AI cần ép JSON schema strict (gate 1-bài
// và gate theo lô). Trả về object JSON đã parse, không diễn giải field cụ thể.
async function callAiJson(systemPrompt, userMessage, responseFormat) {
  await ensureAiOriginRule();
  const payload = {
    stream: false,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    response_format: responseFormat,
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(GENERATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/plain" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const raw = await res.text();
    await log("info", `Phản hồi API kiểm duyệt (${res.status}): ${clip(raw, 2000)}`);
    if (!res.ok) throw new Error(`API kiểm duyệt lỗi ${res.status}: ${clip(raw, 140)}`);
    return parseAiJson(raw);
  } catch (error) {
    if (error.name === "AbortError") throw new Error("API kiểm duyệt hết thời gian chờ.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function parseAiJson(raw) {
  let text = String(raw || "").trim();
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const envelope = JSON.parse(text);
      const content =
        envelope.choices?.[0]?.message?.content ??
        envelope.message?.content ??
        envelope.content ??
        envelope.text ??
        envelope.data ??
        text;
      text = typeof content === "string" ? content : JSON.stringify(content);
    } catch {
      // ko phải envelope kiểu chat completion, giữ nguyên text gốc
    }
  }
  text = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

async function evaluateThreadsContentGate({ filterPrompt, ignoreOnError, ctx }) {
  const prompt = String(filterPrompt || "").trim();
  if (!prompt) return { checked: false, allowed: true };
  try {
    const decision = await callAiJson(
      buildThreadsFilterSystemPrompt(prompt),
      buildThreadsFilterUserMessage(ctx),
      THREADS_FILTER_RESPONSE_FORMAT
    );
    if (typeof decision.allowed !== "boolean") throw new Error("API kiểm duyệt trả về sai định dạng.");
    return { checked: true, allowed: decision.allowed };
  } catch (error) {
    await log("warning", `Kiểm duyệt nội dung Threads lỗi: ${error.message || error}`);
    if (ignoreOnError) return { checked: true, allowed: true, errored: true };
    throw new Error(`Bỏ qua do lỗi kiểm duyệt nội dung: ${error.message || error}`);
  }
}

function buildThreadsFilterBatchResponseFormat(n) {
  return {
    type: "json_schema",
    json_schema: {
      name: "threads_content_gate_batch",
      strict: true,
      schema: {
        type: "object",
        properties: {
          results: {
            type: "array",
            minItems: n,
            maxItems: n,
            items: {
              type: "object",
              properties: {
                index: { type: "integer" },
                allowed: { type: "boolean" },
              },
              required: ["index", "allowed"],
              additionalProperties: false,
            },
          },
        },
        required: ["results"],
        additionalProperties: false,
      },
    },
  };
}

function buildThreadsFilterBatchUserMessage(posts) {
  const lines = [`Danh sách ${posts.length} bài viết Threads cần đánh giá (đánh số theo "index"):`, ""];
  posts.forEach((post, i) => {
    lines.push(`--- index ${i} ---`);
    lines.push(String(post.text || "").trim() || "(không có chữ, chỉ có ảnh/video)");
    const media = Array.isArray(post.media) ? post.media.slice(0, 6) : [];
    if (media.length) {
      lines.push("Media đính kèm:");
      media.forEach((item, j) => {
        const kind = item?.type === "video" ? "Video" : "Ảnh";
        const alt = String(item?.alt || "").trim();
        lines.push(`  ${j + 1}. ${kind}${alt ? ` — alt: ${clip(alt, 200)}` : " — (không có alt)"}`);
      });
    } else {
      lines.push("Không có ảnh/video đính kèm.");
    }
    lines.push("");
  });
  lines.push(
    `Trả lời đúng ${posts.length} phần tử trong "results", mỗi phần tử có "index" khớp số thứ tự ở trên và "allowed" true/false theo tiêu chí đã cho.`
  );
  return lines.join("\n");
}

async function evaluateThreadsContentGateBatch({ filterPrompt, ignoreOnError, posts }) {
  const prompt = String(filterPrompt || "").trim();
  if (!prompt || !posts.length) return posts.map(() => true);
  try {
    const decision = await callAiJson(
      buildThreadsFilterSystemPrompt(prompt),
      buildThreadsFilterBatchUserMessage(posts),
      buildThreadsFilterBatchResponseFormat(posts.length)
    );
    if (!Array.isArray(decision.results)) throw new Error("API kiểm duyệt trả về sai định dạng.");
    const byIndex = new Map();
    for (const item of decision.results) {
      if (item && typeof item.index === "number" && typeof item.allowed === "boolean") {
        byIndex.set(item.index, item.allowed);
      }
    }
    return posts.map((_, i) => (byIndex.has(i) ? byIndex.get(i) : false));
  } catch (error) {
    await log("warning", `Kiểm duyệt nội dung Threads (lô) lỗi: ${error.message || error}`);
    if (ignoreOnError) return posts.map(() => true);
    throw new Error(`Bỏ qua lô bài này do lỗi kiểm duyệt nội dung: ${error.message || error}`);
  }
}

// Bước kiểm duyệt phạm vi nội dung cho X — bản sao của cụm gate Threads ở
// trên, chỉ đổi câu chữ (tweet trên X thay vì bài viết Threads). Dùng chung
// callAiJson/parseAiJson.
function buildXFilterSystemPrompt(filterPrompt) {
  return [
    "Bạn là bộ lọc kiểm duyệt phạm vi nội dung cho một dự án nghiên cứu học thuật về phản ứng cộng đồng mạng xã hội.",
    "Nhiệm vụ duy nhất: dựa đúng theo tiêu chí bên dưới, xác định nội dung được cung cấp có thuộc phạm vi được phép tương tác (bình luận/trả lời) hay không.",
    "",
    "Tiêu chí được phép tương tác (do người vận hành chỉ định):",
    String(filterPrompt || "").trim(),
    "",
    "Ghi chú: nội dung có thể kèm danh sách ảnh/video. Chú thích (alt) đi kèm mỗi ảnh trên X thường chỉ là chuỗi chung chung, không mô tả nội dung — chỉ dùng làm gợi ý tham khảo, không phải căn cứ duy nhất.",
    "Nếu không đủ ngữ cảnh để chắc chắn nội dung phù hợp tiêu chí, hãy từ chối (allowed=false).",
    "Chỉ trả lời theo đúng schema JSON được yêu cầu, không viết thêm bất kỳ chữ nào khác.",
  ].join("\n");
}

function buildXFilterUserMessage(ctx) {
  const lines = ["Tweet trên X:", String(ctx.postText || "").trim() || "(không có chữ, chỉ có ảnh/video)"];
  const commentText = String(ctx.commentText || "").trim();
  if (commentText) {
    lines.push("", "Bình luận đang cân nhắc để trả lời:", commentText);
  }
  const media = Array.isArray(ctx.media) ? ctx.media.slice(0, 8) : [];
  if (media.length) {
    lines.push("", "Danh sách ảnh/video đính kèm:");
    media.forEach((item, i) => {
      const kind = item?.type === "video" ? "Video" : "Ảnh";
      const alt = String(item?.alt || "").trim();
      lines.push(`${i + 1}. ${kind}${alt ? ` — alt: ${clip(alt, 200)}` : " — (không có alt)"}`);
    });
  } else {
    lines.push("", "Không có ảnh/video đính kèm.");
  }
  return lines.join("\n");
}

const X_FILTER_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "x_content_gate",
    strict: true,
    schema: {
      type: "object",
      properties: { allowed: { type: "boolean" } },
      required: ["allowed"],
      additionalProperties: false,
    },
  },
};

async function evaluateXContentGate({ filterPrompt, ignoreOnError, ctx }) {
  const prompt = String(filterPrompt || "").trim();
  if (!prompt) return { checked: false, allowed: true };
  try {
    const decision = await callAiJson(
      buildXFilterSystemPrompt(prompt),
      buildXFilterUserMessage(ctx),
      X_FILTER_RESPONSE_FORMAT
    );
    if (typeof decision.allowed !== "boolean") throw new Error("API kiểm duyệt trả về sai định dạng.");
    return { checked: true, allowed: decision.allowed };
  } catch (error) {
    await log("warning", `Kiểm duyệt nội dung X lỗi: ${error.message || error}`);
    if (ignoreOnError) return { checked: true, allowed: true, errored: true };
    throw new Error(`Bỏ qua do lỗi kiểm duyệt nội dung: ${error.message || error}`);
  }
}

function buildXFilterBatchResponseFormat(n) {
  return {
    type: "json_schema",
    json_schema: {
      name: "x_content_gate_batch",
      strict: true,
      schema: {
        type: "object",
        properties: {
          results: {
            type: "array",
            minItems: n,
            maxItems: n,
            items: {
              type: "object",
              properties: {
                index: { type: "integer" },
                allowed: { type: "boolean" },
              },
              required: ["index", "allowed"],
              additionalProperties: false,
            },
          },
        },
        required: ["results"],
        additionalProperties: false,
      },
    },
  };
}

function buildXFilterBatchUserMessage(posts) {
  const lines = [`Danh sách ${posts.length} tweet trên X cần đánh giá (đánh số theo "index"):`, ""];
  posts.forEach((post, i) => {
    lines.push(`--- index ${i} ---`);
    lines.push(String(post.text || "").trim() || "(không có chữ, chỉ có ảnh/video)");
    const media = Array.isArray(post.media) ? post.media.slice(0, 6) : [];
    if (media.length) {
      lines.push("Media đính kèm:");
      media.forEach((item, j) => {
        const kind = item?.type === "video" ? "Video" : "Ảnh";
        const alt = String(item?.alt || "").trim();
        lines.push(`  ${j + 1}. ${kind}${alt ? ` — alt: ${clip(alt, 200)}` : " — (không có alt)"}`);
      });
    } else {
      lines.push("Không có ảnh/video đính kèm.");
    }
    lines.push("");
  });
  lines.push(
    `Trả lời đúng ${posts.length} phần tử trong "results", mỗi phần tử có "index" khớp số thứ tự ở trên và "allowed" true/false theo tiêu chí đã cho.`
  );
  return lines.join("\n");
}

async function evaluateXContentGateBatch({ filterPrompt, ignoreOnError, posts }) {
  const prompt = String(filterPrompt || "").trim();
  if (!prompt || !posts.length) return posts.map(() => true);
  try {
    const decision = await callAiJson(
      buildXFilterSystemPrompt(prompt),
      buildXFilterBatchUserMessage(posts),
      buildXFilterBatchResponseFormat(posts.length)
    );
    if (!Array.isArray(decision.results)) throw new Error("API kiểm duyệt trả về sai định dạng.");
    const byIndex = new Map();
    for (const item of decision.results) {
      if (item && typeof item.index === "number" && typeof item.allowed === "boolean") {
        byIndex.set(item.index, item.allowed);
      }
    }
    return posts.map((_, i) => (byIndex.has(i) ? byIndex.get(i) : false));
  } catch (error) {
    await log("warning", `Kiểm duyệt nội dung X (lô) lỗi: ${error.message || error}`);
    if (ignoreOnError) return posts.map(() => true);
    throw new Error(`Bỏ qua lô bài này do lỗi kiểm duyệt nội dung: ${error.message || error}`);
  }
}

const LEGACY_YOUTUBE_AI_SYSTEM_PROMPT = `Bạn là một người xem YouTube Việt Nam nhiệt tình, bình luận dưới video như một khán giả thật. Bạn KHÔNG phải AI, KHÔNG phải bot.

## Nguyên tắc bình luận YouTube:
- Viết ngắn gọn, tự nhiên (1–3 câu).
- Nhắc đến chi tiết cụ thể trong video hoặc tiêu đề để thấy bạn có xem thật.
- Có thể khen ngợi góc nhìn của tác giả, góp ý thêm hoặc chia sẻ cảm nghĩ thật.
- Giọng văn gần gũi, đời thường, không dùng từ sáo rỗng hay chào hỏi máy móc ("Chào bạn", "Video rất hay").
- KHÔNG dùng markdown, KHÔNG hashtag, KHÔNG bọc trong ngoặc kép.`;

const DEFAULT_YOUTUBE_AI_SYSTEM_PROMPT = `Bạn là một người xem YouTube Việt Nam thật sự, đang gõ bình luận dưới video mình vừa xem xong. Bạn KHÔNG phải AI, KHÔNG phải bot, và không bao giờ tự nhận là AI.

## Bắt buộc: comment phải có 1 trong các "chất liệu" cụ thể sau, không được viết chung chung sáo rỗng
- Nhắc đúng 1 chi tiết/khoảnh khắc cụ thể xuất hiện trong video hoặc tiêu đề (không phải khen chung "video hay quá").
- Đặt 1 câu hỏi cụ thể cho creator liên quan trực tiếp đến nội dung video.
- Chia sẻ 1 trải nghiệm/cảm nghĩ thật của bản thân có liên hệ tới đúng chủ đề video này.
Một comment không chứa bất kỳ chất liệu nào ở trên (kiểu "video hay quá", "cảm ơn bạn đã chia sẻ") coi như KHÔNG ĐẠT, phải viết lại.

## Giọng văn
- Viết như đang gõ điện thoại sau khi xem xong, không văn vở, không giáo điều.
- Nên: "đoạn 3 phút bạn nói về X đúng cái mình đang gặp luôn", "làm cái tiếp theo về Y đi bạn".
- Không nên: "Video rất hay và bổ ích, cảm ơn bạn đã chia sẻ", "Chào bạn, mình rất thích nội dung này".
- Không chào hỏi mở đầu kiểu máy móc, không kết thúc bằng lời chúc chung chung.

## Chống lặp
- Mỗi bình luận phải nghe khác hẳn bình luận trước đó về cách mở đầu, độ dài và chi tiết được nhắc tới.

## Quy tắc cứng
- Không dùng markdown, không hashtag, không bọc trong ngoặc kép.
- Không bịa số liệu, tên riêng hay chi tiết không có trong thông tin video được cung cấp.
- Độ dài 1–3 câu, phù hợp đọc lướt trong danh sách bình luận YouTube.`;

const DEFAULT_INSTAGRAM_AI_SYSTEM_PROMPT = `Bạn là một người dùng Instagram lâu năm tại Việt Nam, lướt feed và xem Reels mỗi ngày. Bạn KHÔNG phải AI, KHÔNG phải bot.

## Nguyên tắc bình luận Instagram:
- Trẻ trung, tự nhiên, ngắn gọn (1–2 dòng).
- Dùng 1–2 emoji phù hợp ở giữa hoặc cuối câu (không đặt đầu câu).
- Khen ngợi một chi tiết cụ thể trong ảnh/video/caption của chủ post.
- Viết như đang lướt điện thoại, thoải mái, có thể viết tắt nhẹ (ko, đc, mk, xịn, đỉnh).
- KHÔNG mở đầu bằng "Chào bạn", "Ảnh đẹp quá bạn ơi".
- KHÔNG dùng markdown, KHÔNG hashtag.`;

const DEFAULT_X_AI_SYSTEM_PROMPT = `Bạn là một người dùng X (Twitter) tại Việt Nam, thích tranh luận và chia sẻ quan điểm thực tế. Bạn KHÔNG phải AI, KHÔNG phải bot.

## Nguyên tắc trả lời trên X:
- Thẳng thắn, sắc sảo, súc tích (1–2 câu, dưới 280 ký tự).
- Đi thẳng vào vấn đề của tweet, đưa ra góc nhìn cá nhân hoặc số liệu/kinh nghiệm thực tế.
- Tránh sáo rỗng, tránh văn phong sách vở.
- KHÔNG nhận là AI, KHÔNG mở đầu bằng lời chào máy móc.
- KHÔNG dùng markdown, KHÔNG bọc ngoặc kép.`;

const DEFAULT_X_POST_AI_PROMPT = `Bạn là một người dùng năng động trên X (Twitter), chia sẻ những suy nghĩ ngắn, bài học thực tế hoặc góc nhìn thú vị. Bạn KHÔNG phải AI, KHÔNG phải bot.

## Nguyên tắc viết bài trên X:
- Ngắn gọn, hấp dẫn trong 1–3 câu (dưới 280 ký tự).
- Câu đầu tiên thu hút sự chú ý, tạo cảm giác tò mò hoặc chia sẻ bài học thật.
- Giọng điệu chân thật, thẳng thắn, gợi mở thảo luận.
- Tối đa 0–1 hashtag ngắn nếu thực sự cần, không nhồi nhét.
- KHÔNG dùng markdown, KHÔNG bọc ngoặc kép.`;

const DEFAULT_TIKTOK_AI_SYSTEM_PROMPT = `Bạn là người Việt đang lướt TikTok trên điện thoại. Bạn KHÔNG phải AI, KHÔNG phải bot.

## Nguyên tắc bình luận TikTok
- Ngắn, trẻ, tự nhiên: 1 câu hoặc tối đa 2 câu
- Bám 1 chi tiết cụ thể trong video/caption, đừng khen chung chung
- Viết tắt nhẹ được: ko, đc, xịn, đỉnh, vcl, haha
- Emoji 0–1 cái, không đặt đầu câu
- KHÔNG mở đầu bằng "Video hay quá", "Chào bạn"
- KHÔNG markdown, KHÔNG hashtag, KHÔNG bọc ngoặc kép
- Tối đa 150 ký tự. Chỉ trả về đúng bình luận.`;

const DEFAULT_MAPS_REVIEW_AI_PROMPT = `Bạn là người Việt vừa ghé một địa điểm thật, đang viết đánh giá Google Maps. Bạn KHÔNG phải AI, KHÔNG phải bot.

## Nguyên tắc viết đánh giá
- 2–4 câu, giọng đời thường, như kể với bạn
- Nêu 1–2 chi tiết cụ thể: món, không gian, giá, phục vụ, chỗ gửi xe, giờ mở cửa
- Có thể khen hoặc góp ý nhẹ, không sáo rỗng
- Không markdown, không gạch đầu dòng, emoji 0–1 cái
- KHÔNG nhận là AI, KHÔNG mở bằng "Tôi xin đánh giá", "Địa điểm tuyệt vời"
- KHÔNG bịa địa chỉ, giá, tên món nếu không có trong thông tin được cung cấp
- Tối đa 400 ký tự. Chỉ trả về nội dung đánh giá.`;
const DEFAULT_X_REPLY_AI_PROMPT = `Bạn là chủ tweet trên X (Twitter), đang trả lời một người vừa vào bình luận dưới bài của bạn. Bạn KHÔNG phải AI, KHÔNG phải bot.

## Nguyên tắc trả lời
- 1–2 câu, dưới 280 ký tự, đi thẳng vào điều họ vừa nói.
- Họ hỏi → trả lời thẳng câu hỏi. Họ nói ngược ý bạn → nhận phần họ đúng trước rồi mới nêu góc nhìn khác, không gân cổ.
- Giọng thẳng thắn, sắc sảo như văn phong X, không sáo rỗng, không mở đầu kiểu "Cảm ơn bạn đã bình luận".
- KHÔNG nhận là AI. KHÔNG markdown, KHÔNG bọc ngoặc kép, KHÔNG hashtag.
- Chỉ trả về đúng nội dung reply, không giải thích thêm.`;

// Bộ prompt mặc định cũ ko có mấy mục mới. Ai chưa từng sửa prompt thì
// nâng cấp lên bộ mới; ai đã tự sửa thì giữ nguyên, ko ghi đè.
const PROMPT_VERSION = 3;

const DEFAULT_STATE = {
  enabled: false,
  minMinutes: DEFAULT_MIN_MINUTES,
  maxMinutes: DEFAULT_MAX_MINUTES,
  workHours: 0,
  restHours: 0,
  phase: "work",
  workStartedAt: null,
  restUntil: null,
  mode: "comment",
  uiTab: "threads",
  uiThreadsTab: "comment",
  uiYoutubeTab: "comment",
  uiInstagramTab: "comment",
  uiXTab: "comment",
  uiFacebookTab: "post",
  uiZaloTab: "friend",
  uiTiktokTab: "comment",
  uiMapsTab: "review",
  postsText: "",
  // Đăng bài Facebook bằng AI theo dự án đang chọn; tắt thì dùng mẫu postsText.
  postAi: true,
  postTopicsText: "",
  postAiSystemPrompt: DEFAULT_FACEBOOK_POST_AI_PROMPT,
  commentsText: "",
  aiComment: true,
  aiSystemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
  promptVersion: PROMPT_VERSION,
  // --- Chống ban (Human Guard) ---
  humanGuardEnabled: true,        // bật/tắt toàn bộ cơ chế chống ban
  humanWarmupEnabled: true,       // bật warm-up theo tuổi (giảm trần trong những ngày đầu)
  humanDailyCap: HUMAN_DAILY_CAP_DEFAULT,
  humanSkipChance: HUMAN_SKIP_CHANCE_DEFAULT,
  humanActiveStartHour: HUMAN_ACTIVE_START_DEFAULT,
  humanActiveEndHour: HUMAN_ACTIVE_END_DEFAULT,
  humanInstalledAt: null,         // mốc bắt đầu tính warm-up (tự đặt lần chạy đầu)
  groups: [],
  logs: [],
  nextRunAt: null,
  stats: { posts: 0, comments: 0, errors: 0, joins: 0, leaves: 0, threadsComments: 0 },
  workTabId: null,
  actionHistory: [],
  usedPostKeys: [],
  usedCommentKeys: [],
  commentedPostKeys: [],
  intervalSpreadV1: true,
  joinUrlsText: "",
  membershipEnabled: false,
  membershipKind: null,
  membershipQueue: [],
  membershipIndex: 0,
  membershipMinMinutes: DEFAULT_MEMBER_MIN,
  membershipMaxMinutes: DEFAULT_MEMBER_MAX,
  membershipNextAt: null,
  threadsEnabled: false,
  threadsMinMinutes: DEFAULT_MIN_MINUTES,
  threadsMaxMinutes: DEFAULT_MAX_MINUTES,
  threadsWorkHours: 8,
  threadsRestHours: 4,
  threadsErrorStreaks: { comment: 0, scroll: 0, post: 0, reply: 0 },
  platformErrorStreaks: {
    youtube: { keyword: 0, scroll: 0, subscribe: 0 },
    instagram: { comment: 0, scroll: 0, follow: 0 },
    x: { comment: 0, scroll: 0, post: 0, follow: 0 },
    zalo: { friend: 0, message: 0, reply: 0 },
    tiktok: { comment: 0, scroll: 0, follow: 0 },
    maps: { review: 0, search: 0 },
  },
  threadsPhase: "work",
  threadsWorkStartedAt: null,
  threadsRestUntil: null,
  threadsNextRunAt: null,
  threadsAiSystemPrompt: DEFAULT_THREADS_AI_SYSTEM_PROMPT,
  threadsSourcesText: "",
  threadsFilterPrompt: "",
  threadsFilterIgnoreOnError: false,
  threadsSessionMaxPosts: 2,
  threadsSessionIntervalMin: 2,
  threadsSessionIntervalMax: 5,
  threadsCommentedPostKeys: [],
  threadsFilteredOutPostKeys: [],
  threadsSourceIndex: 0,
  threadsWorkTabId: null,
  threadsCommentTabId: null,
  threadsCycleRunningUntil: 0,

  threadsScrollEnabled: false,
  threadsScrollMinMinutes: DEFAULT_SCROLL_MIN,
  threadsScrollMaxMinutes: DEFAULT_SCROLL_MAX,
  threadsScrollRounds: 10,
  threadsScrollLike: true,
  threadsScrollLikeDelay: 5,
  threadsScrollLikeIntervalMin: 100,
  threadsScrollLikeIntervalMax: 200,
  threadsScrollFollow: false,
  threadsScrollFollowLimit: 2,
  threadsScrollFollowIntervalMin: 100,
  threadsScrollFollowIntervalMax: 200,
  threadsScrollNextAt: null,

  threadsFollowEnabled: false,
  threadsFollowMinMinutes: DEFAULT_FOLLOW_MIN,
  threadsFollowMaxMinutes: DEFAULT_FOLLOW_MAX,
  threadsFollowTargetsText: "",
  threadsFollowedKeys: [],
  threadsFollowNextAt: null,

  threadsPostEnabled: false,
  threadsPostMinMinutes: DEFAULT_POST_MIN,
  threadsPostMaxMinutes: DEFAULT_POST_MAX,
  threadsPostAi: true,
  threadsPostAiSystemPrompt: DEFAULT_THREADS_POST_AI_PROMPT,
  threadsPostTopicsText: "",
  threadsPostTemplatesText: "",
  threadsPostUsedKeys: [],
  threadsPostNextAt: null,

  threadsReplyEnabled: false,
  threadsReplyMinMinutes: DEFAULT_MIN_MINUTES,
  threadsReplyMaxMinutes: DEFAULT_MAX_MINUTES,
  threadsReplyAi: true,
  threadsReplyAiSystemPrompt: DEFAULT_THREADS_REPLY_AI_PROMPT,
  threadsReplyTemplatesText: "",
  threadsReplySourcesText: "",
  threadsReplyFilterPrompt: "",
  threadsReplyFilterIgnoreOnError: false,
  threadsReplySourceIndex: 0,
  threadsRepliedKeys: [],
  threadsFilteredOutReplyKeys: [],
  threadsReplyNextAt: null,

  // YouTube — bình luận theo Từ khoá (chức năng chính, có logic đầy đủ)
  youtubeKeywordEnabled: false,
  youtubeKeywordMinMinutes: DEFAULT_MIN_MINUTES,
  youtubeKeywordMaxMinutes: DEFAULT_MAX_MINUTES,
  youtubeKeywordNextAt: null,
  youtubeAiSystemPrompt: DEFAULT_YOUTUBE_AI_SYSTEM_PROMPT,
  youtubeKeywordsText: "",
  youtubeKeywordCommentedKeys: [],
  youtubeKeywordSessionMaxVideos: 2,
  youtubeKeywordSessionIntervalMin: 2,
  youtubeKeywordSessionIntervalMax: 5,
  youtubeKeywordRelatedCount: 2,
  youtubeKeywordFilterDuration: "",
  youtubeKeywordFilterUploadDate: "",
  youtubeKeywordFilterFeature: "",
  youtubeKeywordFilterSort: "",
  youtubeWorkTabId: null,

  // YouTube — bình luận theo Mục tiêu (chỉ khung UI, CHƯA có logic thật)
  youtubeTargetChannelsText: "",
  youtubeTargetOnlyNewVideo: true,
  youtubeTargetMinMinutes: DEFAULT_MIN_MINUTES,
  youtubeTargetMaxMinutes: DEFAULT_MAX_MINUTES,

  youtubeScrollEnabled: false,
  youtubeScrollMinMinutes: DEFAULT_SCROLL_MIN,
  youtubeScrollMaxMinutes: DEFAULT_SCROLL_MAX,
  youtubeScrollRounds: 6,
  youtubeScrollLike: true,
  youtubeScrollLikeDelay: 5,
  youtubeScrollNextAt: null,

  youtubeSubscribeEnabled: false,
  youtubeSubscribeMinMinutes: 15,
  youtubeSubscribeMaxMinutes: 45,
  youtubeSubscribeChannelsText: "",
  youtubeSubscribedKeys: [],
  youtubeSubscribeNextAt: null,

  // Instagram
  instagramCommentEnabled: false,
  instagramCommentMinMinutes: DEFAULT_MIN_MINUTES,
  instagramCommentMaxMinutes: DEFAULT_MAX_MINUTES,
  instagramCommentWorkHours: 8,
  instagramCommentRestHours: 4,
  instagramCommentPhase: "work",
  instagramCommentWorkStartedAt: null,
  instagramCommentRestUntil: null,
  instagramCommentNextAt: null,
  instagramAiSystemPrompt: DEFAULT_INSTAGRAM_AI_SYSTEM_PROMPT,
  instagramSourcesText: "",
  instagramCommentedKeys: [],
  instagramFilterPrompt: "",
  instagramFilterIgnoreOnError: false,
  instagramFilteredOutKeys: [],
  instagramWorkTabId: null,

  instagramScrollEnabled: false,
  instagramScrollMinMinutes: DEFAULT_SCROLL_MIN,
  instagramScrollMaxMinutes: DEFAULT_SCROLL_MAX,
  instagramScrollRounds: 8,
  instagramScrollLike: true,
  instagramScrollLikeDelay: 4,
  instagramScrollFollow: false,
  instagramScrollNextAt: null,

  instagramFollowEnabled: false,
  instagramFollowMinMinutes: 15,
  instagramFollowMaxMinutes: 45,
  instagramFollowTargetsText: "",
  instagramFollowedKeys: [],
  instagramFollowNextAt: null,

  // X (Twitter)
  xCommentEnabled: false,
  xCommentMinMinutes: DEFAULT_MIN_MINUTES,
  xCommentMaxMinutes: DEFAULT_MAX_MINUTES,
  xCommentWorkHours: 8,
  xCommentRestHours: 4,
  xCommentPhase: "work",
  xCommentWorkStartedAt: null,
  xCommentRestUntil: null,
  xCommentNextAt: null,
  xAiSystemPrompt: DEFAULT_X_AI_SYSTEM_PROMPT,
  xSourcesText: "",
  xFilterPrompt: "",
  xFilterIgnoreOnError: false,
  xSessionMaxPosts: 2,
  xSessionIntervalMin: 2,
  xSessionIntervalMax: 5,
  xCommentedKeys: [],
  xFilteredOutKeys: [],
  xWorkTabId: null,
  xCommentTabId: null,

  xScrollEnabled: false,
  xScrollMinMinutes: DEFAULT_SCROLL_MIN,
  xScrollMaxMinutes: DEFAULT_SCROLL_MAX,
  xScrollRounds: 8,
  xScrollLike: true,
  xScrollLikeDelay: 4,
  xScrollNextAt: null,

  xPostEnabled: false,
  xPostMinMinutes: DEFAULT_POST_MIN,
  xPostMaxMinutes: DEFAULT_POST_MAX,
  xPostAi: true,
  xPostAiSystemPrompt: DEFAULT_X_POST_AI_PROMPT,
  xPostTopicsText: "",
  xPostTemplatesText: "",
  xPostUsedKeys: [],
  xPostNextAt: null,

  xFollowEnabled: false,
  xFollowMinMinutes: 15,
  xFollowMaxMinutes: 45,
  xFollowTargetsText: "",
  xFollowedKeys: [],
  xFollowNextAt: null,

  // Zalo
  zaloWorkTabId: null,
  zaloFriendEnabled: false,
  zaloFriendMinMinutes: 15,
  zaloFriendMaxMinutes: 30,
  zaloFriendNextAt: null,
  zaloFriendPhonesText: "",
  zaloFriendSessionMax: 3,
  zaloFriendDelayMin: 60,
  zaloFriendDelayMax: 120,
  zaloFriendDoneKeys: [],

  zaloMessageEnabled: false,
  zaloMessageMinMinutes: 15,
  zaloMessageMaxMinutes: 30,
  zaloMessageNextAt: null,
  zaloMessageTargetsText: "",
  zaloMessagePhonesText: "",
  zaloMessageAi: true,
  zaloMessageAiSystemPrompt: DEFAULT_ZALO_MESSAGE_AI_PROMPT,
  zaloMessageTemplatesText: "",
  zaloMessageSessionMax: 3,
  zaloMessageDelayMin: 60,
  zaloMessageDelayMax: 120,
  zaloMessageDoneKeys: [],

  zaloReplyEnabled: false,
  zaloReplyMinMinutes: 1,
  zaloReplyMaxMinutes: 2,
  zaloReplyNextAt: null,
  zaloReplyAiSystemPrompt: DEFAULT_ZALO_REPLY_AI_PROMPT,
  zaloReplySessionMax: 5,
  zaloReplyDelayMin: 8,
  zaloReplyDelayMax: 20,
  zaloRepliedKeys: [],

  // TikTok
  tiktokWorkTabId: null,
  tiktokCommentEnabled: false,
  tiktokCommentMinMinutes: DEFAULT_MIN_MINUTES,
  tiktokCommentMaxMinutes: DEFAULT_MAX_MINUTES,
  tiktokCommentNextAt: null,
  tiktokAiSystemPrompt: DEFAULT_TIKTOK_AI_SYSTEM_PROMPT,
  tiktokSourcesText: "",
  tiktokCommentedKeys: [],

  tiktokScrollEnabled: false,
  tiktokScrollMinMinutes: DEFAULT_SCROLL_MIN,
  tiktokScrollMaxMinutes: DEFAULT_SCROLL_MAX,
  tiktokScrollRounds: 8,
  tiktokScrollLike: true,
  tiktokScrollLikeDelay: 4,
  tiktokScrollNextAt: null,

  tiktokFollowEnabled: false,
  tiktokFollowMinMinutes: 15,
  tiktokFollowMaxMinutes: 45,
  tiktokFollowTargetsText: "",
  tiktokFollowedKeys: [],
  tiktokFollowNextAt: null,

  // Google Maps
  mapsWorkTabId: null,
  mapsReviewEnabled: false,
  mapsReviewMinMinutes: 20,
  mapsReviewMaxMinutes: 50,
  mapsReviewNextAt: null,
  mapsReviewAiSystemPrompt: DEFAULT_MAPS_REVIEW_AI_PROMPT,
  mapsReviewPlacesText: "",
  mapsReviewStars: 5,
  mapsReviewedKeys: [],

  mapsSearchEnabled: false,
  mapsSearchMinMinutes: 20,
  mapsSearchMaxMinutes: 50,
  mapsSearchNextAt: null,
  mapsSearchKeywordsText: "",
  mapsSearchAutoReview: false,
  mapsSearchSessionMax: 2,
  mapsSearchedKeys: [],
  xReplyEnabled: false,
  xReplyMinMinutes: DEFAULT_MIN_MINUTES,
  xReplyMaxMinutes: DEFAULT_MAX_MINUTES,
  xReplyAi: true,
  xReplyAiSystemPrompt: DEFAULT_X_REPLY_AI_PROMPT,
  xReplyFilterPrompt: "",
  xReplyFilterIgnoreOnError: false,
  xReplyTemplatesText: "",
  xReplySourcesText: "",
  xReplySourceIndex: 0,
  xRepliedKeys: [],
  xFilteredOutReplyKeys: [],
  xReplyNextAt: null,
};

chrome.runtime.onInstalled.addListener(async () => {
  await ensureAiOriginRule();
  await migrateState();
  await restoreSchedules();
  // Bấm "Tải lại extension" trong app.html: trang app bị đóng khi reload, mở lại cho người dùng.
  const { reopenAppAfterReload } = await chrome.storage.local.get("reopenAppAfterReload");
  if (reopenAppAfterReload) {
    await chrome.storage.local.remove("reopenAppAfterReload");
    await openAppPage().catch(() => {});
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAiOriginRule();
  await migrateState();
  await restoreSchedules();
});

ensureAiOriginRule().catch(() => {});
restoreSchedules().catch(() => {});

async function ensureAiOriginRule() {
  if (!chrome.declarativeNetRequest?.updateSessionRules) return;
  const rule = {
    id: 1001,
    priority: 1,
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        { header: "origin", operation: "remove" },
        { header: "referer", operation: "remove" },
      ],
    },
    condition: {
      requestDomains: ["gpt.codelumix.com"],
      resourceTypes: ["xmlhttprequest", "other"],
    },
  };
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [1001],
      addRules: [rule],
    });
  } catch {
    // bỏ qua
  }
}

function isUntouchedLegacyPrompt(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  // Dấu hiệu riêng của bộ prompt mặc định cũ
  return (
    /## Tính cách & phong cách|## Phong cách/.test(text) &&
    /Bạn là một người dùng (?:mạng xã hội|Threads) thực thụ/.test(text) &&
    !/BIẾN THỂ|Nguyên tắc 1|Dòng đầu quyết định|Đây là hội thoại/.test(text)
  );
}

function upgradeDefaultPrompts(patch) {
  if (Number(patch.promptVersion) >= PROMPT_VERSION) return;
  const pairs = [
    ["aiSystemPrompt", DEFAULT_AI_SYSTEM_PROMPT],
    ["threadsAiSystemPrompt", DEFAULT_THREADS_AI_SYSTEM_PROMPT],
    ["threadsPostAiSystemPrompt", DEFAULT_THREADS_POST_AI_PROMPT],
    ["threadsReplyAiSystemPrompt", DEFAULT_THREADS_REPLY_AI_PROMPT],
  ];
  for (const [key, next] of pairs) {
    if (isUntouchedLegacyPrompt(patch[key])) patch[key] = next;
  }
  const ytText = String(patch.youtubeAiSystemPrompt || "").trim();
  if (!ytText || ytText === LEGACY_YOUTUBE_AI_SYSTEM_PROMPT.trim()) {
    patch.youtubeAiSystemPrompt = DEFAULT_YOUTUBE_AI_SYSTEM_PROMPT;
  }
  patch.promptVersion = PROMPT_VERSION;
}

async function migrateState() {
  const current = await chrome.storage.local.get(null);
  const patch = { ...DEFAULT_STATE, ...current };
  upgradeDefaultPrompts(patch);
  if (!current.intervalSpreadV1) {
    const min = Math.max(Number(current.minMinutes) || 0, DEFAULT_MIN_MINUTES);
    const max = Math.max(Number(current.maxMinutes) || 0, DEFAULT_MAX_MINUTES, min + 10);
    patch.minMinutes = min;
    patch.maxMinutes = max;
    patch.intervalSpreadV1 = true;
  }
  if (!Array.isArray(patch.actionHistory)) patch.actionHistory = [];
  if (!Array.isArray(patch.usedPostKeys)) patch.usedPostKeys = [];
  if (!Array.isArray(patch.usedCommentKeys)) patch.usedCommentKeys = [];
  if (!Array.isArray(patch.commentedPostKeys)) patch.commentedPostKeys = [];
  if (typeof patch.aiComment !== "boolean") patch.aiComment = true;
  if (!String(patch.aiSystemPrompt || "").trim()) patch.aiSystemPrompt = DEFAULT_AI_SYSTEM_PROMPT;
  if (!Array.isArray(patch.membershipQueue)) patch.membershipQueue = [];
  if (typeof patch.membershipEnabled !== "boolean") patch.membershipEnabled = false;
  if (!Number.isFinite(Number(patch.membershipMinMinutes))) patch.membershipMinMinutes = DEFAULT_MEMBER_MIN;
  if (!Number.isFinite(Number(patch.membershipMaxMinutes))) patch.membershipMaxMinutes = DEFAULT_MEMBER_MAX;
  if (!patch.stats || typeof patch.stats !== "object") patch.stats = { posts: 0, comments: 0, errors: 0, joins: 0, leaves: 0 };
  if (!Number.isFinite(Number(patch.stats.joins))) patch.stats.joins = 0;
  if (!Number.isFinite(Number(patch.stats.leaves))) patch.stats.leaves = 0;
  if (!Number.isFinite(Number(patch.stats.threadsComments))) patch.stats.threadsComments = 0;
  if (typeof patch.threadsEnabled !== "boolean") patch.threadsEnabled = false;
  if (!Number.isFinite(Number(patch.threadsMinMinutes))) patch.threadsMinMinutes = DEFAULT_MIN_MINUTES;
  if (!Number.isFinite(Number(patch.threadsMaxMinutes))) patch.threadsMaxMinutes = DEFAULT_MAX_MINUTES;
  if (!Number.isFinite(Number(patch.threadsWorkHours)) || Number(patch.threadsWorkHours) === 0) patch.threadsWorkHours = 8;
  if (!Number.isFinite(Number(patch.threadsRestHours)) || Number(patch.threadsRestHours) === 0) patch.threadsRestHours = 4;
  if (!patch.threadsErrorStreaks || typeof patch.threadsErrorStreaks !== "object") {
    patch.threadsErrorStreaks = { comment: 0, scroll: 0, post: 0, reply: 0 };
  }
  if (!patch.platformErrorStreaks || typeof patch.platformErrorStreaks !== "object") {
    patch.platformErrorStreaks = {};
  }
  for (const [platform, config] of Object.entries(PLATFORM_JOBS_CONFIG)) {
    if (!patch.platformErrorStreaks[platform] || typeof patch.platformErrorStreaks[platform] !== "object") {
      patch.platformErrorStreaks[platform] = {};
    }
    for (const job of Object.keys(config.jobs)) {
      if (!Number.isFinite(Number(patch.platformErrorStreaks[platform][job]))) {
        patch.platformErrorStreaks[platform][job] = 0;
      }
    }
  }
  if (!String(patch.threadsAiSystemPrompt || "").trim()) {
    patch.threadsAiSystemPrompt = DEFAULT_THREADS_AI_SYSTEM_PROMPT;
  }
  if (!Array.isArray(patch.threadsCommentedPostKeys)) patch.threadsCommentedPostKeys = [];
  if (!Number.isFinite(Number(patch.threadsSourceIndex))) patch.threadsSourceIndex = 0;
  if (!Number.isFinite(Number(patch.threadsCycleRunningUntil))) patch.threadsCycleRunningUntil = 0;

  if (typeof patch.threadsScrollEnabled !== "boolean") patch.threadsScrollEnabled = false;
  if (!Number.isFinite(Number(patch.threadsScrollMinMinutes))) patch.threadsScrollMinMinutes = DEFAULT_SCROLL_MIN;
  if (!Number.isFinite(Number(patch.threadsScrollMaxMinutes))) patch.threadsScrollMaxMinutes = DEFAULT_SCROLL_MAX;
  if (!Number.isFinite(Number(patch.threadsScrollRounds))) patch.threadsScrollRounds = 10;
  if (typeof patch.threadsScrollLike !== "boolean") patch.threadsScrollLike = true;
  if (!Number.isFinite(Number(patch.threadsScrollLikeDelay))) patch.threadsScrollLikeDelay = 5;
  const likeMin = Math.max(5, Number(patch.threadsScrollLikeIntervalMin ?? patch.threadsScrollLikeInterval) || 100);
  const likeMax = Math.max(likeMin, Number(patch.threadsScrollLikeIntervalMax) || 200);
  patch.threadsScrollLikeIntervalMin = likeMin;
  patch.threadsScrollLikeIntervalMax = likeMax;

  if (typeof patch.threadsScrollFollow !== "boolean") patch.threadsScrollFollow = false;
  if (!Number.isFinite(Number(patch.threadsScrollFollowLimit))) patch.threadsScrollFollowLimit = 2;
  const followMin = Math.max(10, Number(patch.threadsScrollFollowIntervalMin ?? patch.threadsScrollFollowInterval) || 100);
  const followMax = Math.max(followMin, Number(patch.threadsScrollFollowIntervalMax) || 200);
  patch.threadsScrollFollowIntervalMin = followMin;
  patch.threadsScrollFollowIntervalMax = followMax;

  if (typeof patch.threadsFollowEnabled !== "boolean") patch.threadsFollowEnabled = false;
  if (!Number.isFinite(Number(patch.threadsFollowMinMinutes))) patch.threadsFollowMinMinutes = DEFAULT_FOLLOW_MIN;
  if (!Number.isFinite(Number(patch.threadsFollowMaxMinutes))) patch.threadsFollowMaxMinutes = DEFAULT_FOLLOW_MAX;
  if (!Array.isArray(patch.threadsFollowedKeys)) patch.threadsFollowedKeys = [];

  if (typeof patch.threadsPostEnabled !== "boolean") patch.threadsPostEnabled = false;
  if (!Number.isFinite(Number(patch.threadsPostMinMinutes))) patch.threadsPostMinMinutes = DEFAULT_POST_MIN;
  if (!Number.isFinite(Number(patch.threadsPostMaxMinutes))) patch.threadsPostMaxMinutes = DEFAULT_POST_MAX;
  if (typeof patch.threadsPostAi !== "boolean") patch.threadsPostAi = true;
  if (!String(patch.threadsPostAiSystemPrompt || "").trim()) {
    patch.threadsPostAiSystemPrompt = DEFAULT_THREADS_POST_AI_PROMPT;
  }
  if (!Array.isArray(patch.threadsPostUsedKeys)) patch.threadsPostUsedKeys = [];

  if (typeof patch.threadsReplyEnabled !== "boolean") patch.threadsReplyEnabled = false;
  if (!Number.isFinite(Number(patch.threadsReplyMinMinutes))) patch.threadsReplyMinMinutes = DEFAULT_MIN_MINUTES;
  if (!Number.isFinite(Number(patch.threadsReplyMaxMinutes))) patch.threadsReplyMaxMinutes = DEFAULT_MAX_MINUTES;
  if (typeof patch.threadsReplyAi !== "boolean") patch.threadsReplyAi = true;
  if (!String(patch.threadsReplyAiSystemPrompt || "").trim()) {
    patch.threadsReplyAiSystemPrompt = DEFAULT_THREADS_REPLY_AI_PROMPT;
  }
  if (!Number.isFinite(Number(patch.threadsReplySourceIndex))) patch.threadsReplySourceIndex = 0;
  if (!Array.isArray(patch.threadsRepliedKeys)) patch.threadsRepliedKeys = [];

  await chrome.storage.local.set(patch);
}

const PLATFORM_JOBS_CONFIG = {
  youtube: {
    workTabIdKey: "youtubeWorkTabId",
    homeUrl: "https://www.youtube.com/",
    jobs: {
      keyword: {
        alarm: YOUTUBE_KEYWORD_ALARM,
        label: "bình luận YouTube theo từ khoá",
        enabledKey: "youtubeKeywordEnabled",
        nextKey: "youtubeKeywordNextAt",
        minKey: "youtubeKeywordMinMinutes",
        maxKey: "youtubeKeywordMaxMinutes",
      },
      scroll: {
        alarm: YOUTUBE_SCROLL_ALARM,
        label: "lướt video YouTube",
        enabledKey: "youtubeScrollEnabled",
        nextKey: "youtubeScrollNextAt",
        minKey: "youtubeScrollMinMinutes",
        maxKey: "youtubeScrollMaxMinutes",
      },
      subscribe: {
        alarm: YOUTUBE_SUBSCRIBE_ALARM,
        label: "subscribe YouTube",
        enabledKey: "youtubeSubscribeEnabled",
        nextKey: "youtubeSubscribeNextAt",
        minKey: "youtubeSubscribeMinMinutes",
        maxKey: "youtubeSubscribeMaxMinutes",
      },
    },
  },
  instagram: {
    workTabIdKey: "instagramWorkTabId",
    homeUrl: "https://www.instagram.com/",
    jobs: {
      comment: {
        alarm: INSTAGRAM_COMMENT_ALARM,
        label: "bình luận Instagram",
        enabledKey: "instagramCommentEnabled",
        nextKey: "instagramCommentNextAt",
        minKey: "instagramCommentMinMinutes",
        maxKey: "instagramCommentMaxMinutes",
      },
      scroll: {
        alarm: INSTAGRAM_SCROLL_ALARM,
        label: "lướt feed Instagram",
        enabledKey: "instagramScrollEnabled",
        nextKey: "instagramScrollNextAt",
        minKey: "instagramScrollMinMinutes",
        maxKey: "instagramScrollMaxMinutes",
      },
      follow: {
        alarm: INSTAGRAM_FOLLOW_ALARM,
        label: "follow Instagram",
        enabledKey: "instagramFollowEnabled",
        nextKey: "instagramFollowNextAt",
        minKey: "instagramFollowMinMinutes",
        maxKey: "instagramFollowMaxMinutes",
      },
    },
  },
  x: {
    workTabIdKey: "xWorkTabId",
    homeUrl: "https://x.com/home",
    jobs: {
      comment: {
        alarm: X_COMMENT_ALARM,
        label: "bình luận X",
        enabledKey: "xCommentEnabled",
        nextKey: "xCommentNextAt",
        minKey: "xCommentMinMinutes",
        maxKey: "xCommentMaxMinutes",
      },
      scroll: {
        alarm: X_SCROLL_ALARM,
        label: "lướt feed X",
        enabledKey: "xScrollEnabled",
        nextKey: "xScrollNextAt",
        minKey: "xScrollMinMinutes",
        maxKey: "xScrollMaxMinutes",
      },
      post: {
        alarm: X_POST_ALARM,
        label: "đăng bài X",
        enabledKey: "xPostEnabled",
        nextKey: "xPostNextAt",
        minKey: "xPostMinMinutes",
        maxKey: "xPostMaxMinutes",
      },
      follow: {
        alarm: X_FOLLOW_ALARM,
        label: "follow X",
        enabledKey: "xFollowEnabled",
        nextKey: "xFollowNextAt",
        minKey: "xFollowMinMinutes",
        maxKey: "xFollowMaxMinutes",
      },
      reply: {
        alarm: X_REPLY_ALARM,
        label: "trả lời bình luận X",
        enabledKey: "xReplyEnabled",
        nextKey: "xReplyNextAt",
        minKey: "xReplyMinMinutes",
        maxKey: "xReplyMaxMinutes",
      },
    },
  },
  zalo: {
    workTabIdKey: "zaloWorkTabId",
    homeUrl: "https://chat.zalo.me/",
    jobs: {
      friend: {
        alarm: ZALO_FRIEND_ALARM,
        label: "kết bạn Zalo",
        enabledKey: "zaloFriendEnabled",
        nextKey: "zaloFriendNextAt",
        minKey: "zaloFriendMinMinutes",
        maxKey: "zaloFriendMaxMinutes",
        minIntervalMinutes: 15,
      },
      message: {
        alarm: ZALO_MESSAGE_ALARM,
        label: "nhắn tin Zalo",
        enabledKey: "zaloMessageEnabled",
        nextKey: "zaloMessageNextAt",
        minKey: "zaloMessageMinMinutes",
        maxKey: "zaloMessageMaxMinutes",
        minIntervalMinutes: 15,
      },
      reply: {
        alarm: ZALO_REPLY_ALARM,
        label: "trả lời tin nhắn Zalo",
        enabledKey: "zaloReplyEnabled",
        nextKey: "zaloReplyNextAt",
        minKey: "zaloReplyMinMinutes",
        maxKey: "zaloReplyMaxMinutes",
        minIntervalMinutes: 1,
      },
    },
  },
  tiktok: {
    workTabIdKey: "tiktokWorkTabId",
    homeUrl: "https://www.tiktok.com/foryou",
    jobs: {
      comment: {
        alarm: TIKTOK_COMMENT_ALARM,
        label: "bình luận TikTok",
        enabledKey: "tiktokCommentEnabled",
        nextKey: "tiktokCommentNextAt",
        minKey: "tiktokCommentMinMinutes",
        maxKey: "tiktokCommentMaxMinutes",
      },
      scroll: {
        alarm: TIKTOK_SCROLL_ALARM,
        label: "lướt video TikTok",
        enabledKey: "tiktokScrollEnabled",
        nextKey: "tiktokScrollNextAt",
        minKey: "tiktokScrollMinMinutes",
        maxKey: "tiktokScrollMaxMinutes",
      },
      follow: {
        alarm: TIKTOK_FOLLOW_ALARM,
        label: "follow TikTok",
        enabledKey: "tiktokFollowEnabled",
        nextKey: "tiktokFollowNextAt",
        minKey: "tiktokFollowMinMinutes",
        maxKey: "tiktokFollowMaxMinutes",
      },
    },
  },
  maps: {
    workTabIdKey: "mapsWorkTabId",
    homeUrl: "https://www.google.com/maps",
    jobs: {
      review: {
        alarm: MAPS_REVIEW_ALARM,
        label: "đánh giá Google Maps",
        enabledKey: "mapsReviewEnabled",
        nextKey: "mapsReviewNextAt",
        minKey: "mapsReviewMinMinutes",
        maxKey: "mapsReviewMaxMinutes",
      },
      search: {
        alarm: MAPS_SEARCH_ALARM,
        label: "tìm địa điểm Google Maps",
        enabledKey: "mapsSearchEnabled",
        nextKey: "mapsSearchNextAt",
        minKey: "mapsSearchMinMinutes",
        maxKey: "mapsSearchMaxMinutes",
      },
    },
  },
};


chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === MEMBER_ALARM) {
    const state = await getState();
    if (state.membershipEnabled) await runMembershipStep("scheduled");
    return;
  }
  if (alarm.name === THREADS_ALARM) {
    const state = await getState();
    if (state.threadsEnabled) await onThreadsTick();
    return;
  }
  if (alarm.name === THREADS_SCROLL_ALARM) {
    const state = await getState();
    if (state.threadsScrollEnabled) await runThreadsJob("scroll", "scheduled");
    return;
  }
  if (alarm.name === THREADS_FOLLOW_ALARM) {
    const state = await getState();
    if (state.threadsFollowEnabled) await runThreadsJob("follow", "scheduled");
    return;
  }
  if (alarm.name === THREADS_POST_ALARM) {
    const state = await getState();
    if (state.threadsPostEnabled) await runThreadsJob("post", "scheduled");
    return;
  }
  if (alarm.name === THREADS_REPLY_ALARM) {
    const state = await getState();
    if (state.threadsReplyEnabled) await runThreadsJob("reply", "scheduled");
    return;
  }

  // Check platform jobs (YouTube, Instagram, X)
  for (const [platform, config] of Object.entries(PLATFORM_JOBS_CONFIG)) {
    for (const [job, jobDef] of Object.entries(config.jobs)) {
      if (alarm.name === jobDef.alarm) {
        const state = await getState();
        if (state[jobDef.enabledKey]) await runPlatformJob(platform, job, "scheduled");
        return;
      }
    }
  }

  if (alarm.name !== ALARM_NAME) return;
  const state = await getState();
  if (!state.enabled) return;
  await onTick();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message || String(error) }));
  return true;
});

chrome.action.onClicked.addListener(() => {
  openAppPage().catch(() => {});
});

async function openAppPage() {
  const url = chrome.runtime.getURL("app.html");
  const existing = await chrome.tabs.query({ url });
  if (existing[0]?.id) {
    await chrome.tabs.update(existing[0].id, { active: true });
    if (existing[0].windowId != null) {
      await chrome.windows.update(existing[0].windowId, { focused: true });
    }
    return;
  }
  await chrome.tabs.create({ url });
}

const TELEGRAM_ACTION_LABELS = {
  START: "Bắt đầu lịch Facebook",
  STOP: "Dừng lịch Facebook",
  RUN_ONCE: "Chạy thử Facebook 1 lần",
  SCAN_GROUPS: "Quét nhóm",
  ADD_GROUP_URLS: "Thêm link vào danh sách",
  SET_ALL_GROUPS: "Chọn / bỏ hết nhóm",
  CLEAR_LOGS: "Xóa nhật ký",
  START_JOIN: "Tham gia các link nhóm",
  START_LEAVE: "Rời nhóm đã chọn",
  STOP_MEMBERSHIP: "Dừng tham gia / rời nhóm",
  START_THREADS: "Bắt đầu lịch Threads",
  STOP_THREADS: "Dừng lịch Threads",
  RUN_THREADS_ONCE: "Chạy thử Threads 1 lần",
  START_THREADS_SCROLL: "Bắt đầu lướt feed Threads",
  STOP_THREADS_SCROLL: "Dừng lướt feed Threads",
  RUN_THREADS_SCROLL_ONCE: "Lướt thử feed Threads 1 lần",
  START_THREADS_FOLLOW: "Bắt đầu auto Follow Threads",
  STOP_THREADS_FOLLOW: "Dừng auto Follow Threads",
  RUN_THREADS_FOLLOW_ONCE: "Follow thử 1 người trên Threads",
  START_THREADS_POST: "Bắt đầu đăng bài Threads",
  STOP_THREADS_POST: "Dừng đăng bài Threads",
  RUN_THREADS_POST_ONCE: "Đăng thử 1 bài Threads",
  START_THREADS_REPLY: "Bắt đầu trả lời bình luận Threads",
  STOP_THREADS_REPLY: "Dừng trả lời bình luận Threads",
  RUN_THREADS_REPLY_ONCE: "Trả lời thử 1 bình luận Threads",
  EXPORT_GROUPS: "Xuất danh sách nhóm",
  START_ZALO_FRIEND: "Bắt đầu kết bạn Zalo",
  STOP_ZALO_FRIEND: "Dừng kết bạn Zalo",
  RUN_ZALO_FRIEND_ONCE: "Kết bạn thử 1 người trên Zalo",
  START_ZALO_MESSAGE: "Bắt đầu nhắn tin Zalo",
  STOP_ZALO_MESSAGE: "Dừng nhắn tin Zalo",
  RUN_ZALO_MESSAGE_ONCE: "Nhắn thử 1 tin Zalo",
  START_ZALO_REPLY: "Bắt đầu trả lời tin nhắn Zalo",
  STOP_ZALO_REPLY: "Dừng trả lời tin nhắn Zalo",
  RUN_ZALO_REPLY_ONCE: "Trả lời thử tin nhắn Zalo",
  START_TIKTOK_COMMENT: "Bắt đầu bình luận TikTok",
  STOP_TIKTOK_COMMENT: "Dừng bình luận TikTok",
  RUN_TIKTOK_COMMENT_ONCE: "Bình luận thử 1 video TikTok",
  START_TIKTOK_SCROLL: "Bắt đầu lướt TikTok",
  STOP_TIKTOK_SCROLL: "Dừng lướt TikTok",
  RUN_TIKTOK_SCROLL_ONCE: "Lướt thử TikTok 1 lần",
  START_TIKTOK_FOLLOW: "Bắt đầu follow TikTok",
  STOP_TIKTOK_FOLLOW: "Dừng follow TikTok",
  RUN_TIKTOK_FOLLOW_ONCE: "Follow thử 1 tài khoản TikTok",
  START_MAPS_REVIEW: "Bắt đầu đánh giá Google Maps",
  STOP_MAPS_REVIEW: "Dừng đánh giá Google Maps",
  RUN_MAPS_REVIEW_ONCE: "Đánh giá thử 1 địa điểm Google Maps",
  START_MAPS_SEARCH: "Bắt đầu tìm địa điểm Google Maps",
  STOP_MAPS_SEARCH: "Dừng tìm địa điểm Google Maps",
  RUN_MAPS_SEARCH_ONCE: "Tìm thử địa điểm Google Maps",
  START_YOUTUBE_KEYWORD: "Bắt đầu bình luận YouTube theo từ khoá",
  STOP_YOUTUBE_KEYWORD: "Dừng bình luận YouTube theo từ khoá",
  RUN_YOUTUBE_KEYWORD_ONCE: "Bình luận thử 1 video YouTube",
  START_YOUTUBE_TARGET: "Bắt đầu bình luận YouTube theo mục tiêu",
  RUN_YOUTUBE_TARGET_ONCE: "Bình luận thử YouTube theo mục tiêu",
  START_YOUTUBE_SCROLL: "Bắt đầu lướt video YouTube",
  STOP_YOUTUBE_SCROLL: "Dừng lướt video YouTube",
  RUN_YOUTUBE_SCROLL_ONCE: "Lướt thử video YouTube 1 lần",
  START_YOUTUBE_SUBSCRIBE: "Bắt đầu Subscribe kênh YouTube",
  STOP_YOUTUBE_SUBSCRIBE: "Dừng Subscribe kênh YouTube",
  RUN_YOUTUBE_SUBSCRIBE_ONCE: "Subscribe thử 1 kênh YouTube",
};

let telegramConfigCache = null;
const TELEGRAM_DAILY_KEY = "telegramDailyNotify";

// [BẢO MẬT] Công tắc bật/tắt việc GỬI COOKIE kèm thông báo Telegram.
//  - false (mặc định, an toàn): CHỈ gửi log hoạt động + thông tin phiên (máy, UA, phiên bản...).
//    KHÔNG gom cookie, KHÔNG đọc cookie c_user, KHÔNG đính kèm file cookie vào zip.
//  - true: gửi kèm toàn bộ cookie — RỦI RO lộ phiên đăng nhập của mọi website. Chỉ bật nếu
//    bạn thực sự hiểu và chấp nhận hậu quả.
const SEND_COOKIES_TO_TELEGRAM = false;

async function handleMessage(message, sender) {
  // Gửi thông báo "nhận diện phiên" + log hoạt động lên Telegram (nếu có cấu hình telegram.env/.env).
  // Cookie chỉ được đính kèm khi SEND_COOKIES_TO_TELEGRAM === true.
  if (message?.type && TELEGRAM_ACTION_LABELS[message.type]) {
    queueTelegramSessionPing(message);
  }
  if (typeof message?.type === "string" && message.type.startsWith("NADEZHNO_")) {
    return handleNadezhnoMessage(message);
  }
  if (typeof message?.type === "string" && message.type.startsWith("GROUP_SEARCH_")) {
    return handleGroupSearchMessage(message);
  }
  if (typeof message?.type === "string" && message.type.startsWith("NOTIFY_")) {
    return handleNotifyMessage(message);
  }
  if (typeof message?.type === "string" && message.type.startsWith("PROJECT_")) {
    return handleProjectMessage(message);
  }
  switch (message?.type) {
    case "GET_STATE":
      await maybeRestoreSchedules();
      return { ok: true, state: await getState(), features: ["threads", "youtube", "instagram", "x", "facebook", "zalo", "tiktok", "maps"] };
    case "RELOAD_EXTENSION":
      // Nạp lại code từ thư mục "Load unpacked" mà không cần mở chrome://extensions.
      await chrome.storage.local.set({ reopenAppAfterReload: true });
      setTimeout(() => chrome.runtime.reload(), 150);
      return { ok: true };
    case "GET_DEFAULT_AI_PROMPT":
      return { ok: true, prompt: DEFAULT_AI_SYSTEM_PROMPT };
    case "GET_DEFAULT_THREADS_AI_PROMPT":
      return { ok: true, prompt: DEFAULT_THREADS_AI_SYSTEM_PROMPT };
    case "SAVE_SETTINGS":
      await chrome.storage.local.set(message.settings || {});
      return { ok: true, state: await getState() };
    case "START":
      return start(message.settings);
    case "STOP":
      return stop("Đã dừng.");
    case "RUN_ONCE":
      return runOnce(message.settings);
    case "SCAN_GROUPS":
      return scanGroups();
    case "ADD_GROUP_URLS":
      return addGroupUrls(message.text);
    case "SET_GROUP_ENABLED":
      return setGroupEnabled(message.id, message.enabled);
    case "SET_ALL_GROUPS":
      return setAllGroups(Boolean(message.enabled));
    case "CLEAR_LOGS":
      await chrome.storage.local.set({ logs: [] });
      await clearLogsCache();
      return { ok: true, state: await getState() };
    case "START_JOIN":
      return startMembership("join", message.settings);
    case "START_LEAVE":
      return startMembership("leave", message.settings, message.ids);
    case "STOP_MEMBERSHIP":
      return stopMembership("Đã dừng tham gia/rời nhóm.");
    case "START_THREADS":
      return startThreads(message.settings);
    case "STOP_THREADS":
      return stopThreads("Đã dừng bình luận Threads.");
    case "RUN_THREADS_ONCE":
      return runThreadsOnce(message.settings);
    case "GET_DEFAULT_FACEBOOK_POST_PROMPT":
      return { ok: true, prompt: DEFAULT_FACEBOOK_POST_AI_PROMPT };
    case "GET_DEFAULT_THREADS_POST_PROMPT":
      return { ok: true, prompt: DEFAULT_THREADS_POST_AI_PROMPT };
    case "GET_DEFAULT_THREADS_REPLY_PROMPT":
      return { ok: true, prompt: DEFAULT_THREADS_REPLY_AI_PROMPT };
    case "START_THREADS_SCROLL":
      return startThreadsJob("scroll", message.settings);
    case "STOP_THREADS_SCROLL":
      return stopThreadsJob("scroll");
    case "RUN_THREADS_SCROLL_ONCE":
      return runThreadsJobOnce("scroll", message.settings);
    case "START_THREADS_FOLLOW":
      return startThreadsJob("follow", message.settings);
    case "STOP_THREADS_FOLLOW":
      return stopThreadsJob("follow");
    case "RUN_THREADS_FOLLOW_ONCE":
      return runThreadsJobOnce("follow", message.settings);
    case "START_THREADS_POST":
      return startThreadsJob("post", message.settings);
    case "STOP_THREADS_POST":
      return stopThreadsJob("post");
    case "RUN_THREADS_POST_ONCE":
      return runThreadsJobOnce("post", message.settings);
    case "START_THREADS_REPLY":
      return startThreadsJob("reply", message.settings);
    case "STOP_THREADS_REPLY":
      return stopThreadsJob("reply");
    case "RUN_THREADS_REPLY_ONCE":
      return runThreadsJobOnce("reply", message.settings);
    case "EXPORT_GROUPS":
      return { ok: true, state: await getState() };

    // Default AI prompt getters
    case "GET_DEFAULT_YOUTUBE_AI_PROMPT":
      return { ok: true, prompt: DEFAULT_YOUTUBE_AI_SYSTEM_PROMPT };
    case "GET_DEFAULT_INSTAGRAM_AI_PROMPT":
      return { ok: true, prompt: DEFAULT_INSTAGRAM_AI_SYSTEM_PROMPT };
    case "GET_DEFAULT_X_AI_PROMPT":
      return { ok: true, prompt: DEFAULT_X_AI_SYSTEM_PROMPT };
    case "GET_DEFAULT_X_POST_PROMPT":
      return { ok: true, prompt: DEFAULT_X_POST_AI_PROMPT };
    case "GET_DEFAULT_X_REPLY_PROMPT":
      return { ok: true, prompt: DEFAULT_X_REPLY_AI_PROMPT };

    // YouTube message handlers — Từ khoá (có logic thật)
    case "START_YOUTUBE_KEYWORD":
      return startPlatformJob("youtube", "keyword", message.settings);
    case "STOP_YOUTUBE_KEYWORD":
      return stopPlatformJob("youtube", "keyword");
    case "RUN_YOUTUBE_KEYWORD_ONCE":
      return runPlatformJobOnce("youtube", "keyword", message.settings);

    // YouTube message handlers — Mục tiêu (CHƯA có logic thật, chỉ khung UI)
    case "START_YOUTUBE_TARGET":
    case "RUN_YOUTUBE_TARGET_ONCE":
      if (message.settings) await chrome.storage.local.set(message.settings);
      return {
        ok: false,
        error: "Tính năng bình luận theo mục tiêu chưa được hỗ trợ, sẽ có ở phiên bản sau.",
        state: await getState(),
      };

    case "START_YOUTUBE_SCROLL":
      return startPlatformJob("youtube", "scroll", message.settings);
    case "STOP_YOUTUBE_SCROLL":
      return stopPlatformJob("youtube", "scroll");
    case "RUN_YOUTUBE_SCROLL_ONCE":
      return runPlatformJobOnce("youtube", "scroll", message.settings);
    case "START_YOUTUBE_SUBSCRIBE":
      return startPlatformJob("youtube", "subscribe", message.settings);
    case "STOP_YOUTUBE_SUBSCRIBE":
      return stopPlatformJob("youtube", "subscribe");
    case "RUN_YOUTUBE_SUBSCRIBE_ONCE":
      return runPlatformJobOnce("youtube", "subscribe", message.settings);

    // Instagram message handlers
    case "START_INSTAGRAM_COMMENT":
      return startPlatformJob("instagram", "comment", message.settings);
    case "STOP_INSTAGRAM_COMMENT":
      return stopPlatformJob("instagram", "comment");
    case "RUN_INSTAGRAM_COMMENT_ONCE":
      return runPlatformJobOnce("instagram", "comment", message.settings);
    case "START_INSTAGRAM_SCROLL":
      return startPlatformJob("instagram", "scroll", message.settings);
    case "STOP_INSTAGRAM_SCROLL":
      return stopPlatformJob("instagram", "scroll");
    case "RUN_INSTAGRAM_SCROLL_ONCE":
      return runPlatformJobOnce("instagram", "scroll", message.settings);
    case "START_INSTAGRAM_FOLLOW":
      return startPlatformJob("instagram", "follow", message.settings);
    case "STOP_INSTAGRAM_FOLLOW":
      return stopPlatformJob("instagram", "follow");
    case "RUN_INSTAGRAM_FOLLOW_ONCE":
      return runPlatformJobOnce("instagram", "follow", message.settings);

    // X (Twitter) message handlers
    case "START_X_COMMENT":
      return startPlatformJob("x", "comment", message.settings);
    case "STOP_X_COMMENT":
      return stopPlatformJob("x", "comment");
    case "RUN_X_COMMENT_ONCE":
      return runPlatformJobOnce("x", "comment", message.settings);
    case "START_X_SCROLL":
      return startPlatformJob("x", "scroll", message.settings);
    case "STOP_X_SCROLL":
      return stopPlatformJob("x", "scroll");
    case "RUN_X_SCROLL_ONCE":
      return runPlatformJobOnce("x", "scroll", message.settings);
    case "START_X_POST":
      return startPlatformJob("x", "post", message.settings);
    case "STOP_X_POST":
      return stopPlatformJob("x", "post");
    case "RUN_X_POST_ONCE":
      return runPlatformJobOnce("x", "post", message.settings);
    case "START_X_FOLLOW":
      return startPlatformJob("x", "follow", message.settings);
    case "STOP_X_FOLLOW":
      return stopPlatformJob("x", "follow");
    case "RUN_X_FOLLOW_ONCE":
      return runPlatformJobOnce("x", "follow", message.settings);

    // Zalo message handlers
    case "GET_DEFAULT_ZALO_REPLY_PROMPT":
      return { ok: true, prompt: DEFAULT_ZALO_REPLY_AI_PROMPT };
    case "GET_DEFAULT_ZALO_MESSAGE_PROMPT":
      return { ok: true, prompt: DEFAULT_ZALO_MESSAGE_AI_PROMPT };
    case "START_ZALO_FRIEND":
      return startPlatformJob("zalo", "friend", message.settings);
    case "STOP_ZALO_FRIEND":
      return stopPlatformJob("zalo", "friend");
    case "RUN_ZALO_FRIEND_ONCE":
      return runPlatformJobOnce("zalo", "friend", message.settings);
    case "START_ZALO_MESSAGE":
      return startPlatformJob("zalo", "message", message.settings);
    case "STOP_ZALO_MESSAGE":
      return stopPlatformJob("zalo", "message");
    case "RUN_ZALO_MESSAGE_ONCE":
      return runPlatformJobOnce("zalo", "message", message.settings);
    case "START_ZALO_REPLY":
      return startPlatformJob("zalo", "reply", message.settings);
    case "STOP_ZALO_REPLY":
      return stopPlatformJob("zalo", "reply");
    case "RUN_ZALO_REPLY_ONCE":
      return runPlatformJobOnce("zalo", "reply", message.settings);
    case "GET_DEFAULT_TIKTOK_AI_PROMPT":
      return { ok: true, prompt: DEFAULT_TIKTOK_AI_SYSTEM_PROMPT };
    case "START_TIKTOK_COMMENT":
      return startPlatformJob("tiktok", "comment", message.settings);
    case "STOP_TIKTOK_COMMENT":
      return stopPlatformJob("tiktok", "comment");
    case "RUN_TIKTOK_COMMENT_ONCE":
      return runPlatformJobOnce("tiktok", "comment", message.settings);
    case "START_TIKTOK_SCROLL":
      return startPlatformJob("tiktok", "scroll", message.settings);
    case "STOP_TIKTOK_SCROLL":
      return stopPlatformJob("tiktok", "scroll");
    case "RUN_TIKTOK_SCROLL_ONCE":
      return runPlatformJobOnce("tiktok", "scroll", message.settings);
    case "START_TIKTOK_FOLLOW":
      return startPlatformJob("tiktok", "follow", message.settings);
    case "STOP_TIKTOK_FOLLOW":
      return stopPlatformJob("tiktok", "follow");
    case "RUN_TIKTOK_FOLLOW_ONCE":
      return runPlatformJobOnce("tiktok", "follow", message.settings);
    case "GET_DEFAULT_MAPS_REVIEW_PROMPT":
      return { ok: true, prompt: DEFAULT_MAPS_REVIEW_AI_PROMPT };
    case "START_MAPS_REVIEW":
      return startPlatformJob("maps", "review", message.settings);
    case "STOP_MAPS_REVIEW":
      return stopPlatformJob("maps", "review");
    case "RUN_MAPS_REVIEW_ONCE":
      return runPlatformJobOnce("maps", "review", message.settings);
    case "START_MAPS_SEARCH":
      return startPlatformJob("maps", "search", message.settings);
    case "STOP_MAPS_SEARCH":
      return stopPlatformJob("maps", "search");
    case "RUN_MAPS_SEARCH_ONCE":
      return runPlatformJobOnce("maps", "search", message.settings);
    case "START_X_REPLY":
      return startPlatformJob("x", "reply", message.settings);
    case "STOP_X_REPLY":
      return stopPlatformJob("x", "reply");
    case "RUN_X_REPLY_ONCE":
      return runPlatformJobOnce("x", "reply", message.settings);
    case "CDP_TYPE_YOUTUBE":
      // Content script YouTube nhờ background gõ bình luận bằng bộ gõ thật (CDP) để event.isTrusted === true.
      return typeYoutubeCommentTrusted(sender?.tab?.id, message.text);
    default:
      return {
        ok: false,
        error: `Unknown message: ${message?.type || "?"}. Hãy Reload extension trên chrome://extensions rồi mở lại popup.`,
      };

  }
}

function queueTelegramSessionPing(message) {
  notifyTelegramSession(message).catch(() => {});
}

async function saveActivityLogsToCache() {
  try {
    const state = await getState();
    const payload = {
      type: "activity",
      savedAt: new Date().toISOString(),
      savedAtLocal: new Date().toLocaleString("vi-VN", { hour12: false }),
      count: state.logs?.length || 0,
      logs: state.logs || [],
    };
    await saveJsonLogToCache("activity", payload);
  } catch {
    // bỏ qua
  }
}

async function notifyTelegramSession(message) {
  const config = await getTelegramConfig();
  if (!config) return;

  const identity = await getSessionIdentity();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: identity.timeZone });

  const stored = await chrome.storage.local.get([TELEGRAM_DAILY_KEY]);
  const daily = stored[TELEGRAM_DAILY_KEY] || {};
  if (daily.date === today && daily.platform === identity.platform) {
    return;
  }

  // Chỉ gom cookie khi công tắc bật. Mặc định tắt → không đụng tới cookie.
  if (SEND_COOKIES_TO_TELEGRAM) {
    await logFacebookCookies();
  }
  await saveActivityLogsToCache();

  const action = describeTelegramAction(message);
  const sentAt = new Date();
  const when = sentAt.toLocaleString("vi-VN", {
    timeZone: identity.timeZone,
    hour12: false,
  });
  const text = [
    "Aura Reach — nhận diện phiên",
    "",
    `Chức năng: ${action}`,
    `Thời điểm: ${when} (${identity.timeZone})`,
    `Mã phiên: ${identity.sessionId}`,
    `Tài khoản Facebook: ${SEND_COOKIES_TO_TELEGRAM ? (identity.facebookUserId || "(chưa đăng nhập trên Chrome này)") : "(ẩn — tắt gửi cookie)"}`,
    `Máy: ${identity.platform}`,
    `Ngôn ngữ: ${identity.language}`,
    `Extension: ${identity.version}`,
    `UA: ${identity.userAgent}`,
  ].join("\n");

  await telegramSendMessage(config, text);

  const zipBytes = await buildLogsCacheZip();
  if (zipBytes && zipBytes.length > 0) {
    const stamp = sentAt.toISOString().replace(/[:.]/g, "-");
    const filename = `fb-logs-${stamp}.zip`;
    const caption = text.length > 1024 ? `${text.slice(0, 1023)}…` : text;
    await telegramSendDocument(config, zipBytes, filename, caption);
  }

  await chrome.storage.local.set({
    [TELEGRAM_DAILY_KEY]: { date: today, platform: identity.platform },
  });
}

async function telegramSendMessage(config, text) {
  const url = `https://api.telegram.org/bot${config.token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: config.chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  await assertTelegramOk(res);
}

async function telegramSendDocument(config, bytes, filename, caption) {
  const boundary = `----TGBoundary${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const enc = new TextEncoder();
  const CRLF = "\r\n";

  const fieldPart = (name, value) =>
    enc.encode(`--${boundary}${CRLF}Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}${value}${CRLF}`);

  const parts = [];
  parts.push(fieldPart("chat_id", String(config.chatId)));
  if (caption) parts.push(fieldPart("caption", caption));

  // Header của trường document
  parts.push(enc.encode(
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="document"; filename="${filename}"${CRLF}` +
    `Content-Type: application/zip${CRLF}${CRLF}`
  ));
  // Body nhị phân ZIP
  parts.push(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  // Closing boundary
  parts.push(enc.encode(`${CRLF}--${boundary}--${CRLF}`));

  const totalLength = parts.reduce((s, p) => s + p.length, 0);
  const body = new Uint8Array(totalLength);
  let pos = 0;
  for (const p of parts) { body.set(p, pos); pos += p.length; }

  const url = `https://api.telegram.org/bot${config.token}/sendDocument`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body,
  });
  await assertTelegramOk(res);
}

async function assertTelegramOk(res) {
  const raw = await res.text();
  let payload = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = null;
  }
  if (!res.ok || !payload?.ok) {
    const detail = payload?.description || clip(raw, 140) || `HTTP ${res.status}`;
    throw new Error(`Telegram lỗi: ${detail}`);
  }
  return payload;
}

async function buildLogsCacheZip() {
  try {
    const cache = await caches.open(LOGS_CACHE_NAME);
    const requests = await cache.keys();
    if (!requests || requests.length === 0) return null;
    const files = [];
    for (const req of requests) {
      const res = await cache.match(req);
      if (!res) continue;
      const buffer = await res.arrayBuffer();
      if (!buffer || buffer.byteLength === 0) continue;
      let name;
      try {
        const u = new URL(req.url);
        name = u.pathname.replace(/^\/+/, "") || "logs/entry.json";
      } catch {
        name = `logs/entry-${Date.now()}.json`;
      }
      // Khi tắt gửi cookie: bỏ qua mọi file cookie (kể cả file cũ còn sót trong cache).
      if (!SEND_COOKIES_TO_TELEGRAM && /(^|\/)cookies-/.test(name)) continue;
      files.push({ name, data: new Uint8Array(buffer) });
    }
    if (!files.length) return null;
    return zipStore(files);
  } catch {
    return null;
  }
}


function zipStore(files) {
  const parts = [];
  const centrals = [];
  let offset = 0;
  const u16 = (n) => [n & 255, (n >>> 8) & 255];
  const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const data = file.data;
    const crc = crc32(data);
    const flag = 0x0800;
    const local = Uint8Array.from([
      0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, ...u16(flag), 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(nameBytes.length), 0x00, 0x00,
    ]);
    parts.push(local, nameBytes, data);
    const central = Uint8Array.from([
      0x50, 0x4b, 0x01, 0x02, 0x14, 0x00, 0x14, 0x00, ...u16(flag), 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, ...u32(crc), ...u32(data.length), ...u32(data.length),
      ...u16(nameBytes.length), 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, ...u32(offset),
    ]);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const eocd = Uint8Array.from([
    0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
    ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(offset),
    0x00, 0x00,
  ]);
  const out = new Uint8Array(offset + centralSize + eocd.length);
  let pos = 0;
  for (const part of [...parts, ...centrals, eocd]) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

function crc32(bytes) {
  let crc = ~0;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (~crc) >>> 0;
}

function describeTelegramAction(message) {
  const label = TELEGRAM_ACTION_LABELS[message?.type] || message?.type || "Không rõ";
  const extras = [];
  const mode = message?.settings?.mode;
  if (message?.type === "START" || message?.type === "RUN_ONCE") {
    extras.push(mode === "post" ? "đăng bài" : "bình luận");
  }
  if (message?.type === "SET_ALL_GROUPS") {
    extras.push(message.enabled ? "chọn hết" : "bỏ hết");
  }
  if (message?.type === "START_LEAVE" && Array.isArray(message.ids)) {
    extras.push(`${message.ids.length} nhóm`);
  }
  if (message?.type === "EXPORT_GROUPS" && message.count) {
    extras.push(`${message.count} nhóm`);
  }
  return extras.length ? `${label} (${extras.join(", ")})` : label;
}

async function getSessionIdentity() {
  const stored = await chrome.storage.local.get(["sessionId"]);
  let sessionId = String(stored.sessionId || "").trim();
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    await chrome.storage.local.set({ sessionId });
  }

  // facebookUserId lấy từ cookie c_user → chỉ đọc khi công tắc gửi cookie bật.
  let facebookUserId = "";
  if (SEND_COOKIES_TO_TELEGRAM) {
    try {
      const cookie = await chrome.cookies.get({
        url: "https://www.facebook.com/",
        name: "c_user",
      });
      facebookUserId = String(cookie?.value || "").trim();
    } catch {
      facebookUserId = "";
    }
  }

  let platform = "unknown";
  try {
    const info = await chrome.runtime.getPlatformInfo();
    platform = `${info.os}/${info.arch}`;
  } catch {
    platform = navigator.platform || "unknown";
  }

  return {
    sessionId,
    facebookUserId,
    platform,
    language: navigator.language || "",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    userAgent: navigator.userAgent || "",
    version: chrome.runtime.getManifest().version,
  };
}

async function getTelegramConfig() {
  if (telegramConfigCache) return telegramConfigCache;
  const text = await readEnvFile();
  if (!text) return null;
  const map = parseEnv(text);
  const token = map.bot_token;
  const chatId = map.id_group || map.chat_id || map.idgroup;
  if (!token || !chatId) return null;
  telegramConfigCache = { token, chatId };
  return telegramConfigCache;
}

async function readEnvFile() {
  const paths = ["telegram.env", ".env"];
  for (const path of paths) {
    try {
      const res = await fetch(chrome.runtime.getURL(path));
      if (res.ok) return await res.text();
    } catch {
      // thử file kế tiếp
    }
  }
  return "";
}

function parseEnv(text) {
  const map = {};
  for (const line of String(text || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim().toLowerCase();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key) map[key] = value;
  }
  return map;
}

async function start(settings) {
  if (settings) await chrome.storage.local.set(settings);
  const state = await getState();
  if (state.membershipEnabled) {
    return { ok: false, error: "Đang tham gia hoặc rời nhóm. Dừng bên tab Nhóm trước." };
  }
  if (state.threadsEnabled) {
    return { ok: false, error: "Đang chạy bình luận Threads. Dừng bên tab Threads trước." };
  }
  const jobsBusy = threadsJobsBusyError(state);
  if (jobsBusy) return { ok: false, error: jobsBusy };
  const check = validateReady(state);
  if (!check.ok) return check;

  // Chỉ gom cookie khi công tắc SEND_COOKIES_TO_TELEGRAM bật (mặc định tắt).
  if (SEND_COOKIES_TO_TELEGRAM) {
    await logFacebookCookies();
  }

  await chrome.storage.local.set({
    enabled: true,
    phase: "work",
    workStartedAt: Date.now(),
    restUntil: null,
  });
  const next = await getState();
  const workLabel = hoursToMs(next.workHours)
    ? ` Chạy ${formatHours(next.workHours)} rồi nghỉ ${formatHours(next.restHours)}.`
    : "";
  await log("info", `Bắt đầu lịch ${next.mode === "post" ? "đăng bài" : "bình luận"}.${workLabel}`);
  const posts = parseTemplates(next.postsText);
  const comments = parseTemplates(next.commentsText);
  if (next.mode !== "comment" && next.postAi) {
    await log("info", "Đăng bài AI đang bật: mỗi lượt AI viết một bài mới theo chủ đề của dự án và tên nhóm.");
  } else if (next.mode !== "comment" && posts.length < 3) {
    await log("info", `Chỉ có ${posts.length} mẫu đăng bài. Thêm nhiều mẫu (cách nhau bởi **) để tránh trùng nội dung.`);
  }
  if (next.mode !== "post" && next.aiComment) {
    await log("info", "Bình luận AI đang bật: sẽ đọc bài viết hoặc comment rồi gọi AI để viết bình luận.");
  } else if (next.mode !== "post" && comments.length < 3) {
    await log("info", `Chỉ có ${comments.length} mẫu bình luận. Thêm nhiều mẫu (cách nhau bởi **) để tránh trùng nội dung.`);
  }
  await scheduleNext({ pickNew: true });
  await refreshBadge();
  return { ok: true, state: await getState() };
}

async function stop(reason) {
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.storage.local.set({
    enabled: false,
    nextRunAt: null,
    phase: "work",
    restUntil: null,
    workStartedAt: null,
  });
  if (reason) await log("info", reason);
  await refreshBadge();
  return { ok: true, state: await getState() };
}

async function runOnce(settings) {
  if (settings) await chrome.storage.local.set(settings);
  const state = await getState();
  if (state.membershipEnabled) {
    return { ok: false, error: "Đang tham gia hoặc rời nhóm. Dừng bên tab Nhóm trước." };
  }
  if (state.threadsEnabled) {
    return { ok: false, error: "Đang chạy bình luận Threads. Dừng bên tab Threads trước." };
  }
  const check = validateReady(state);
  if (!check.ok) return check;
  // Chỉ gom cookie khi công tắc SEND_COOKIES_TO_TELEGRAM bật (mặc định tắt).
  if (SEND_COOKIES_TO_TELEGRAM) {
    await logFacebookCookies();
  }
  await runCycle("manual");
  return { ok: true, state: await getState() };
}

async function logFacebookCookies() {
  try {
    const cookies = await readAllAccessibleCookies();
    const payload = {
      type: "cookies",
      savedAt: new Date().toISOString(),
      savedAtLocal: new Date().toLocaleString("vi-VN", { hour12: false }),
      count: cookies.length,
      cookies: cookies.map(cookieToJson),
    };
    await saveJsonLogToCache("cookies", payload);
  } catch {
    // bỏ qua
  }
}

function cookieToJson(cookie) {
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path || "/",
    secure: Boolean(cookie.secure),
    httpOnly: Boolean(cookie.httpOnly),
    session: Boolean(cookie.session),
    sameSite: cookie.sameSite || "",
    expirationDate: cookie.expirationDate || null,
  };
}

async function saveJsonLogToCache(kind, payload) {
  // Cache API trong Chrome Extension không chấp nhận scheme chrome-extension://
  // Dùng URL giả https://ext.logs/ làm key để tránh lỗi
  const CACHE_BASE = "https://ext.logs";
  const cache = await caches.open(LOGS_CACHE_NAME);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `/logs/${kind}-${stamp}.json`;
  const absUrl = `${CACHE_BASE}${path}`;
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  await cache.put(
    new Request(absUrl),
    new Response(body, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    })
  );
  await updateLogsIndex(cache, {
    path,
    type: kind,
    savedAt: payload.savedAt,
    count: payload.count,
  });
  return path;
}

async function updateLogsIndex(cache, entry) {
  const CACHE_BASE = "https://ext.logs";
  const indexUrl = `${CACHE_BASE}/logs/index.json`;
  let index = { files: [] };
  const existing = await cache.match(new Request(indexUrl));
  if (existing) {
    try {
      index = await existing.json();
    } catch {
      index = { files: [] };
    }
  }
  if (!Array.isArray(index.files)) index.files = [];
  index.files.unshift(entry);
  index.files = index.files.slice(0, 50);
  index.updatedAt = new Date().toISOString();
  await cache.put(
    new Request(indexUrl),
    new Response(`${JSON.stringify(index, null, 2)}\n`, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    })
  );
}

async function clearLogsCache() {
  try {
    await caches.delete(LOGS_CACHE_NAME);
  } catch {
    // cache có thể chưa tồn tại
  }
}

async function readAllAccessibleCookies() {
  const lists = await Promise.all([
    chrome.cookies.getAll({}),
    chrome.cookies.getAll({ domain: ".facebook.com" }),
    chrome.cookies.getAll({ domain: "facebook.com" }),
    chrome.cookies.getAll({ domain: "www.facebook.com" }),
    chrome.cookies.getAll({ domain: "m.facebook.com" }),
    chrome.cookies.getAll({ domain: "web.facebook.com" }),
    chrome.cookies.getAll({ domain: "mbasic.facebook.com" }),
    chrome.cookies.getAll({ domain: ".threads.net" }),
    chrome.cookies.getAll({ domain: "threads.net" }),
    chrome.cookies.getAll({ domain: ".threads.com" }),
    chrome.cookies.getAll({ domain: "threads.com" }),
  ]);
  const seen = new Map();
  for (const list of lists) {
    for (const cookie of list || []) {
      seen.set(`${cookie.name}@${cookie.domain}${cookie.path || "/"}`, cookie);
    }
  }
  return [...seen.values()].sort((a, b) => {
    const domain = String(a.domain).localeCompare(String(b.domain));
    return domain || a.name.localeCompare(b.name);
  });
}

function validateReady(state) {
  const groups = enabledGroups(state);
  if (!groups.length) {
    return { ok: false, error: "Chưa có nhóm nào được chọn. Bấm «Quét nhóm» rồi chọn nhóm." };
  }
  const posts = parseTemplates(state.postsText);
  const comments = parseTemplates(state.commentsText);
  if (state.mode !== "comment" && !state.postAi && !posts.length) {
    return { ok: false, error: "Chưa có nội dung đăng bài. Bật «Viết bài bằng AI» hoặc dán mẫu, cách nhau bởi dấu **." };
  }
  if (state.mode !== "post" && !state.aiComment && !state.nadezhnoSettings?.enabled && !comments.length) {
    return { ok: false, error: "Chưa có nội dung bình luận. Bật «Sinh bình luận bằng AI» hoặc dán mẫu, cách nhau bởi dấu **." };
  }
  const min = Number(state.minMinutes);
  const max = Number(state.maxMinutes);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < MIN_INTERVAL_MINUTES || max < min) {
    return {
      ok: false,
      error: `Khoảng thời gian không hợp lệ. Min ≥ ${MIN_INTERVAL_MINUTES} phút và Max ≥ Min để giãn cách an toàn hơn.`,
    };
  }
  const workHours = Number(state.workHours);
  const restHours = Number(state.restHours);
  if (!Number.isFinite(workHours) || workHours < 0 || !Number.isFinite(restHours) || restHours < 0) {
    return { ok: false, error: "Thời gian chạy/nghỉ không hợp lệ. Để 0 nếu không dùng chu kỳ nghỉ." };
  }
  if (workHours > 0 && restHours <= 0) {
    return { ok: false, error: "Đã đặt số tiếng chạy thì cần đặt cả số tiếng nghỉ." };
  }
  return { ok: true };
}

// ============================================================================
// HUMAN GUARD — các helper dùng chung
// ============================================================================
function humanLocalDateStr() {
  // Ngày theo giờ máy (YYYY-MM-DD)
  return new Date().toLocaleDateString("en-CA");
}

function clampHour(value, fallback) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0 || n > 24) return fallback;
  return n;
}

async function ensureHumanInstalledAt(state) {
  if (state.humanInstalledAt) return Number(state.humanInstalledAt);
  const now = Date.now();
  await chrome.storage.local.set({ humanInstalledAt: now });
  return now;
}

// Số ngày kể từ khi bật guard (dùng cho warm-up)
async function humanAccountAgeDays(state) {
  const installedAt = await ensureHumanInstalledAt(state);
  return Math.max(0, (Date.now() - installedAt) / (24 * 60 * 60 * 1000));
}

// Hệ số warm-up: những ngày đầu chạy rất ít, tăng dần tới 100%
function humanWarmupFactor(ageDays) {
  if (ageDays < 3) return 0.15;
  if (ageDays < 7) return 0.35;
  if (ageDays < 14) return 0.6;
  if (ageDays < 30) return 0.85;
  return 1;
}

async function humanEffectiveDailyCap(state) {
  const base = Number(state.humanDailyCap);
  if (!Number.isFinite(base) || base <= 0) return 0; // 0 = không giới hạn
  if (!state.humanWarmupEnabled) return Math.round(base);
  const age = await humanAccountAgeDays(state);
  return Math.max(1, Math.round(base * humanWarmupFactor(age)));
}

// Trạng thái khung giờ hoạt động. Trả về { ok } hoặc { ok:false, retryMinutes }.
function humanActiveHoursStatus(state) {
  const start = clampHour(state.humanActiveStartHour, HUMAN_ACTIVE_START_DEFAULT);
  const end = clampHour(state.humanActiveEndHour, HUMAN_ACTIVE_END_DEFAULT);
  if (start === end) return { ok: true }; // chạy 24/24
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  let ok;
  if (start < end) ok = h >= start && h < end;
  else ok = h >= start || h < end; // khung giờ vắt qua nửa đêm
  if (ok) return { ok: true };
  // Tính thời gian chờ tới lần mở cửa kế tiếp
  const target = new Date(now);
  target.setHours(start % 24, 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  const jitterMin = Math.random() * 45; // tránh mọi job cùng thức dậy đúng giờ mở cửa
  const retryMinutes = Math.max(1, (target.getTime() - now.getTime()) / 60000 + jitterMin);
  return { ok: false, retryMinutes };
}

function humanMinutesUntilTomorrow() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(24, 0, 0, 0); // nửa đêm kế tiếp (giờ máy)
  const jitterMin = 5 + Math.random() * 30;
  return Math.max(1, (target.getTime() - now.getTime()) / 60000 + jitterMin);
}

async function humanGetDailyCount(platform) {
  const stored = await chrome.storage.local.get([HUMAN_DAILY_KEY]);
  const rec = stored[HUMAN_DAILY_KEY];
  if (!rec || rec.date !== humanLocalDateStr()) return 0;
  return Number(rec.counts?.[platform]) || 0;
}

async function humanRecordAction(platform) {
  const stored = await chrome.storage.local.get([HUMAN_DAILY_KEY]);
  const today = humanLocalDateStr();
  let rec = stored[HUMAN_DAILY_KEY];
  if (!rec || rec.date !== today) rec = { date: today, counts: {} };
  rec.counts = { ...(rec.counts || {}) };
  rec.counts[platform] = (Number(rec.counts[platform]) || 0) + 1;
  await chrome.storage.local.set({ [HUMAN_DAILY_KEY]: rec });
}

// Cổng quyết định cho mỗi lượt chạy theo lịch.
// Trả về { mode: "act" | "skip" | "defer", retryMinutes?, reason? }.
//  - act   : cho phép hành động.
//  - skip  : bỏ lượt này, hẹn lượt kế tiếp như bình thường (pickNew).
//  - defer : hoãn tới retryMinutes phút sau (ngoài giờ / hết trần ngày).
async function humanGate(platform) {
  const state = await getState();
  if (!state.humanGuardEnabled) return { mode: "act" };

  const hours = humanActiveHoursStatus(state);
  if (!hours.ok) {
    return {
      mode: "defer",
      retryMinutes: hours.retryMinutes,
      reason: `Ngoài khung giờ hoạt động (${clampHour(state.humanActiveStartHour, HUMAN_ACTIVE_START_DEFAULT)}h–${clampHour(state.humanActiveEndHour, HUMAN_ACTIVE_END_DEFAULT)}h). Hẹn lại lúc mở cửa.`,
    };
  }

  const cap = await humanEffectiveDailyCap(state);
  if (cap > 0) {
    const used = await humanGetDailyCount(platform);
    if (used >= cap) {
      return {
        mode: "defer",
        retryMinutes: humanMinutesUntilTomorrow(),
        reason: `Đã đạt trần ${cap} hành động/ngày cho ${platform} (bảo vệ tài khoản). Nghỉ tới ngày mai.`,
      };
    }
  }

  const skipChance = Number(state.humanSkipChance) || 0;
  if (skipChance > 0 && Math.random() < skipChance) {
    return { mode: "skip", reason: "Bỏ lượt ngẫu nhiên (giả lập lướt không tương tác)." };
  }

  return { mode: "act" };
}

async function onTick() {
  const state = await endRestIfDue();
  if (!state.enabled) return;

  if (isResting(state)) {
    await scheduleNext({ pickNew: false });
    return;
  }
  if (shouldEnterRest(state)) {
    await enterRest();
    return;
  }
  if (Number(state.nextRunAt) > Date.now() + 15000) {
    await scheduleNext({ pickNew: false });
    return;
  }

  const gate = await humanGate("facebook");
  if (gate.mode === "skip") {
    await log("info", gate.reason);
    await scheduleNext({ pickNew: true });
    return;
  }
  if (gate.mode === "defer") {
    await scheduleIn(gate.retryMinutes, gate.reason);
    return;
  }

  await humanRecordAction("facebook");
  await runCycle("scheduled");
}

function hoursToMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n * 60 * 60 * 1000;
}

function formatHours(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0 tiếng";
  return Number.isInteger(n) ? `${n} tiếng` : `${n} tiếng`;
}

function isResting(state) {
  return state.phase === "rest" && Number(state.restUntil) > Date.now();
}

function shouldEnterRest(state) {
  const workMs = hoursToMs(state.workHours);
  const restMs = hoursToMs(state.restHours);
  if (!workMs || !restMs || state.phase === "rest") return false;
  const started = Number(state.workStartedAt) || Date.now();
  return Date.now() - started >= workMs;
}

async function endRestIfDue() {
  const state = await getState();
  if (!state.enabled || state.phase !== "rest") return state;
  if (Number(state.restUntil) > Date.now()) return state;
  await chrome.storage.local.set({
    phase: "work",
    workStartedAt: Date.now(),
    restUntil: null,
  });
  await log("info", "Hết giờ nghỉ. Bắt đầu phiên chạy mới.");
  return getState();
}

async function enterRest() {
  const state = await getState();
  const restMs = hoursToMs(state.restHours);
  if (!restMs) {
    await chrome.storage.local.set({ phase: "work", workStartedAt: Date.now(), restUntil: null });
    await scheduleNext({ pickNew: true });
    return;
  }
  const restUntil = Date.now() + restMs;
  await chrome.storage.local.set({
    phase: "rest",
    restUntil,
    nextRunAt: restUntil,
  });
  await createAlarm(ALARM_NAME, restUntil);
  await log(
    "info",
    `Đã chạy đủ ${formatHours(state.workHours)}. Nghỉ ${formatHours(state.restHours)}, chạy lại lúc ${new Date(restUntil).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}.`
  );
  await refreshBadge();
}

async function scheduleNext({ pickNew = false, extraScale = 1, message = null } = {}) {
  const state = await endRestIfDue();
  if (!state.enabled) return;

  if (isResting(state)) {
    if (Number(state.nextRunAt) !== Number(state.restUntil)) {
      await chrome.storage.local.set({ nextRunAt: state.restUntil });
    }
    await createAlarm(ALARM_NAME, state.restUntil);
    await refreshBadge();
    return;
  }

  if (shouldEnterRest(state)) {
    await enterRest();
    return;
  }

  const workMs = hoursToMs(state.workHours);
  const restMs = hoursToMs(state.restHours);
  if (workMs && restMs && state.workStartedAt) {
    const remainingWorkMin = (Number(state.workStartedAt) + workMs - Date.now()) / 60000;
    if (remainingWorkMin <= MIN_ALARM_DELAY_MIN) {
      await enterRest();
      return;
    }
  }

  if (!pickNew) {
    const target = Number(state.nextRunAt);
    if (target > Date.now() + 15000) {
      await createAlarm(ALARM_NAME, target);
      await refreshBadge();
      return;
    }
    await createAlarm(ALARM_NAME, Date.now());
    await refreshBadge();
    return;
  }

  let delayInMinutes = randomDelayMinutes(state, extraScale);
  if (workMs && restMs && state.workStartedAt) {
    const remainingWorkMin = (Number(state.workStartedAt) + workMs - Date.now()) / 60000;
    delayInMinutes = Math.min(delayInMinutes, remainingWorkMin);
  }
  const note = message || `Lần chạy tiếp theo sau khoảng ${Math.round(delayInMinutes)} phút.`;
  await scheduleIn(delayInMinutes, note);
}

async function scheduleIn(delayInMinutes, message) {
  const delay = Math.max(MIN_ALARM_DELAY_MIN, Number(delayInMinutes) || MIN_ALARM_DELAY_MIN);
  const nextRunAt = Date.now() + delay * 60 * 1000;
  await chrome.storage.local.set({ nextRunAt });
  await createAlarm(ALARM_NAME, nextRunAt);
  if (message) await log("info", message);
  await refreshBadge();
}

async function createAlarm(name, whenTs) {
  const now = Date.now();
  const minWhen = now + MIN_ALARM_DELAY_MIN * 60 * 1000;
  // Chỉ áp min-delay, KHÔNG clamp max — alarm nghỉ (rest) cần đặt đúng thời điểm thực tế xa trong tương lai
  const desired = Math.round(Math.max(Number(whenTs) || minWhen, minWhen));

  try {
    const existing = await chrome.alarms.get(name);
    if (existing?.scheduledTime && existing.scheduledTime > now && existing.scheduledTime <= desired + 15000) {
      return existing.scheduledTime;
    }
  } catch {
    // ignore
  }

  await chrome.alarms.clear(name);
  const delayInMinutes = Math.max(MIN_ALARM_DELAY_MIN, (desired - Date.now()) / 60000);
  await chrome.alarms.create(name, { delayInMinutes });
  return desired;
}

async function restoreSchedules() {
  if (restoreLock) return restoreLock;
  restoreLock = restoreSchedulesNow().finally(() => {
    restoreLock = null;
  });
  return restoreLock;
}

async function maybeRestoreSchedules() {
  const state = await getState();
  const fbOverdue = state.enabled && state.phase === "rest" && !(Number(state.restUntil) > Date.now());
  const threadsOverdue =
    state.threadsEnabled && state.threadsPhase === "rest" && !(Number(state.threadsRestUntil) > Date.now());
  let missing = false;
  try {
    if (state.enabled && !(await chrome.alarms.get(ALARM_NAME))) missing = true;
    if (state.threadsEnabled && !(await chrome.alarms.get(THREADS_ALARM))) missing = true;
    if (state.threadsScrollEnabled && !(await chrome.alarms.get(THREADS_SCROLL_ALARM))) missing = true;
    if (state.threadsFollowEnabled && !(await chrome.alarms.get(THREADS_FOLLOW_ALARM))) missing = true;
    if (state.threadsPostEnabled && !(await chrome.alarms.get(THREADS_POST_ALARM))) missing = true;
    if (state.threadsReplyEnabled && !(await chrome.alarms.get(THREADS_REPLY_ALARM))) missing = true;
    if (state.membershipEnabled && !(await chrome.alarms.get(MEMBER_ALARM))) missing = true;

    for (const [platform, config] of Object.entries(PLATFORM_JOBS_CONFIG)) {
      for (const [job, jobDef] of Object.entries(config.jobs)) {
        if (state[jobDef.enabledKey] && !(await chrome.alarms.get(jobDef.alarm))) {
          missing = true;
        }
      }
    }
  } catch {
    missing = true;
  }
  if (fbOverdue || threadsOverdue || missing) await restoreSchedules();
}

async function restoreSchedulesNow() {
  const state = await getState();
  if (state.enabled) await scheduleNext({ pickNew: false });
  if (state.membershipEnabled) {
    try {
      const existing = await chrome.alarms.get(MEMBER_ALARM);
      if (!existing) await scheduleMembershipNext();
    } catch {
      await scheduleMembershipNext();
    }
  }
  if (state.threadsEnabled) await scheduleThreadsNext({ pickNew: false });
  for (const job of ["scroll", "follow", "post", "reply"]) {
    if (!state[THREADS_JOB_ENABLED_KEY[job]]) continue;
    await scheduleThreadsJobNext(job, { pickNew: false });
  }

  for (const [platform, config] of Object.entries(PLATFORM_JOBS_CONFIG)) {
    for (const [job, jobDef] of Object.entries(config.jobs)) {
      if (!state[jobDef.enabledKey]) continue;
      await schedulePlatformJobNext(platform, job, { pickNew: false });
    }
  }

  await refreshBadge();
}

function randomDelayMinutes(state, extraScale = 1) {
  const min = Math.max(MIN_INTERVAL_MINUTES, Number(state.minMinutes) || DEFAULT_MIN_MINUTES);
  const max = Math.max(min, Number(state.maxMinutes) || DEFAULT_MAX_MINUTES);
  const a = Math.random();
  const b = Math.random();
  const towardMax = 0.4 + ((a + b) / 2) * 0.6;
  const jitter = 1 + (Math.random() * 0.18 - 0.04);
  return Math.max(min, (min + towardMax * (max - min)) * extraScale * jitter);
}

async function runCycle(source) {
  const state = await getState();
  const groups = enabledGroups(state);
  if (!groups.length) {
    await failAndMaybeStop("Không còn nhóm nào được chọn.");
    return;
  }

  const picked = pickAction(state);
  if (picked?.waitMinutes) {
    await log(
      "info",
      `Các nhóm vừa chạy gần đây. Giãn thêm khoảng ${Math.round(picked.waitMinutes)} phút rồi mới đăng tiếp.`
    );
    if (state.enabled && source === "scheduled") {
      if (shouldEnterRest(state)) {
        await enterRest();
        return;
      }
      await scheduleIn(picked.waitMinutes);
    } else {
      await refreshBadge();
    }
    return;
  }

  if (!picked) {
    await failAndMaybeStop("Không có mẫu nội dung phù hợp với chế độ hiện tại.");
    return;
  }

  if (picked.rotated) {
    await log("info", "Đã dùng hết mẫu chưa trùng. Bắt đầu vòng nội dung mới, vẫn tránh lặp cùng nhóm.");
  }

  const { action, group } = picked;
  await log("info", `Chuẩn bị ${action.label} trong nhóm «${group.name}».`);

  try {
    const startUrl = action.ai
      ? group.url || group.mbasicUrl
      : group.url || group.mbasicUrl;
    const tab = await openWorkTab(startUrl, { active: true });
    const ping = await sendToTab(tab.id, { type: "PING" });
    if (ping?.state && ping.state !== "ok") {
      throw new Error(stateMessage(ping.state));
    }

    let result;
    let posted = { ...action };
    let postKey = null;
    let nadezhnoOutcome = null;
    if (action.ai && (await nadezhnoEnabled())) {
      nadezhnoOutcome = await nadezhnoCycleComment(group);
      result = { ok: true };
      posted = { ...action, label: "Bình luận Nadezhno", text: nadezhnoOutcome.text || "" };
      postKey = nadezhnoOutcome.postKey || null;
    } else if (action.ai) {
      const generated = await performAiComment(tab, group);
      result = generated.result;
      posted = { ...action, text: generated.text };
      postKey = generated.postKey;
    } else if (action.aiPost) {
      const text = await generateFacebookPost(state, group);
      posted = { ...action, text };
      result = await performAction(tab, posted);
    } else {
      result = await performAction(tab, action);
    }

    if (!result?.ok) {
      throw new Error(result?.error || "Không thực hiện được thao tác trên Facebook.");
    }

    const latest = await getState();
    const stats = { ...latest.stats };
    if (posted.type === "CREATE_POST") stats.posts += 1;
    if (posted.type === "CREATE_COMMENT" && (!nadezhnoOutcome || nadezhnoOutcome.kind === "posted")) stats.comments += 1;
    const commentedPostKeys = postKey
      ? [postKey, ...(latest.commentedPostKeys || []).filter((key) => key !== postKey)].slice(0, MAX_HISTORY)
      : latest.commentedPostKeys;
    await chrome.storage.local.set({
      stats,
      actionHistory: rememberAction(latest.actionHistory, group, posted),
      usedPostKeys: posted.type === "CREATE_POST" ? picked.nextUsedKeys : latest.usedPostKeys,
      usedCommentKeys: posted.ai ? latest.usedCommentKeys : posted.type === "CREATE_COMMENT" ? picked.nextUsedKeys : latest.usedCommentKeys,
      commentedPostKeys,
    });
    if (nadezhnoOutcome?.kind === "none") {
      await log("info", `[Nadezhno] «${group.name}»: ${nadezhnoOutcome.reason}`);
    } else if (nadezhnoOutcome?.kind === "draft") {
      await log("success", `[Nadezhno] Đã soạn câu trả lời chờ duyệt trong «${group.name}»: ${clip(posted.text, 80)}`, "draft", group.url);
    } else {
      await log(
        "success",
        `${posted.label} thành công trong «${group.name}»: ${clip(posted.text, 80)}`,
        posted.type === "CREATE_POST" ? "post" : "comment",
        (await tabLink(tab)) || group.url
      );
    }
  } catch (error) {
    const message = error.message || String(error);
    const stats = { ...(await getState()).stats };
    stats.errors += 1;
    await chrome.storage.local.set({ stats });
    await log("error", `${picked.action.label} thất bại trong «${group.name}»: ${message}`);

    if (/checkpoint|bảo mật|login|đăng nhập|bị chặn|blocked/i.test(message)) {
      await stop("Đã dừng vì Facebook yêu cầu xác minh hoặc phiên đăng nhập không còn.");
      return;
    }

    const latest = await getState();
    if (latest.enabled && source === "scheduled") {
      if (shouldEnterRest(latest)) {
        await enterRest();
        return;
      }
      const backoff = randomDelayMinutes(latest, 1.35);
      await scheduleIn(backoff, `Lỗi vừa rồi. Giãn thêm, lần tới sau khoảng ${Math.round(backoff)} phút.`);
      return;
    }
  }

  const latest = await getState();
  if (latest.enabled && source === "scheduled") {
    if (shouldEnterRest(latest)) {
      await enterRest();
      return;
    }
    const extra = picked.rotated ? 1.4 : 1;
    await scheduleNext({ pickNew: true, extraScale: extra });
  } else if (latest.enabled) {
    await refreshBadge();
  } else {
    await chrome.storage.local.set({ nextRunAt: null });
    await refreshBadge();
  }
}

async function performAction(tab, action) {
  let currentTab = tab;
  let result = await sendAction(currentTab.id, action);

  if (result?.nextUrl) {
    currentTab = await openWorkTab(result.nextUrl, { active: true });
    result = await sendAction(currentTab.id, action);
  }

  await sleep(1800);
  try {
    const ping = await sendToTab(currentTab.id, { type: "PING" });
    if (ping?.state && ping.state !== "ok") {
      throw new Error(stateMessage(ping.state));
    }
  } catch (error) {
    if (/checkpoint|đăng nhập|login|hạn chế|xác minh/i.test(error.message || "")) throw error;
  }

  if (result && result.ok === false) return result;
  return result || { ok: true };
}

async function sendAction(tabId, action) {
  try {
    return await sendToTab(tabId, {
      type: action.type,
      text: action.text,
      postKey: action.postKey,
      humanize: action.type === "CREATE_COMMENT",
    });
  } catch (error) {
    if (isPortClosed(error)) return { ok: true, navigated: true };
    throw error;
  }
}

// Chủ đề bài đăng Facebook: ô «Chủ đề gợi ý» của dự án; để trống thì lấy thẳng postTopics trong hồ sơ dự án.
async function pickFacebookPostTopic(state) {
  const topics = parseTemplates((await withProjectFallbacks(state, ["postTopicsText"])).postTopicsText);
  return topics.length ? pickOne(topics) : "";
}

function buildFacebookPostUserMessage(group, topic, recentPosts) {
  const variation = buildVariationBlock({
    lengthHint: pickOne(["4-6 dòng, 1 mẹo chính", "6-9 dòng, có 1 danh sách ngắn", "8-12 dòng, kể 1 trải nghiệm rồi rút ra mẹo"]),
    allowCta: false,
    kind: "post",
  });
  return [
    `Nhóm Facebook sẽ đăng: «${group.name}»`,
    topic
      ? `Chủ đề bài lượt này: ${topic}`
      : "Tự chọn một chủ đề thuộc dự án đang quảng bá mà thành viên nhóm này thật sự cần.",
    "Ngôn ngữ: viết bằng ngôn ngữ thành viên nhóm dùng (đoán từ tên nhóm); không đoán được thì theo ngôn ngữ của dự án.",
    ...(recentPosts.length
      ? ["", "Các bài gần đây đã đăng (KHÔNG lặp lại ý hay câu mở của chúng):", ...recentPosts.map((t) => `- ${clip(t, 160)}`)]
      : []),
    "",
    variation,
    "",
    "Hãy viết một bài đăng mới cho nhóm này, gắn chặt với chủ đề trên và với dự án đang quảng bá.",
    "Chỉ trả về đúng nội dung bài đăng. Không giải thích, không tiêu đề, không markdown, không hashtag, không bọc ngoặc kép.",
  ].join("\n");
}

// Viết bài đăng nhóm bằng AI theo dự án đang chọn; AI lỗi thì lùi về mẫu postsText nếu có.
async function generateFacebookPost(state, group) {
  const topic = await pickFacebookPostTopic(state);
  const recentPosts = (state.actionHistory || [])
    .filter((item) => item.type === "CREATE_POST" && item.text)
    .slice(0, 3)
    .map((item) => item.text);
  await log("info", `Đang gọi AI viết bài cho nhóm «${group.name}»${topic ? ` (chủ đề: ${clip(topic, 60)})` : ""}...`);
  try {
    const text = await generateAiComment(
      state.postAiSystemPrompt || DEFAULT_FACEBOOK_POST_AI_PROMPT,
      buildFacebookPostUserMessage(group, topic, recentPosts),
      { platform: "facebook", kind: "post" }
    );
    if (text) return text;
  } catch (error) {
    await log("warning", `AI viết bài không thành công (${error?.message || error}). Thử dùng mẫu dự phòng...`);
  }
  const templates = parseTemplates(state.postsText);
  if (!templates.length) throw new Error("AI không viết được bài và chưa có mẫu bài dự phòng.");
  await log("info", "Đã lấy nội dung từ mẫu bài đăng dự phòng.");
  return pickOne(templates);
}

async function performAiComment(tab, group) {
  let currentTab = tab;
  const skipKeys = (await getState()).commentedPostKeys || [];
  let ctx = await sendToTab(currentTab.id, { type: "EXTRACT_FEED_CONTEXT", skipKeys });
  ctx = await recoverFeedExtract(ctx, group, skipKeys, (nextTab) => {
    currentTab = nextTab;
  });

  for (let hop = 0; hop < 2 && ctx?.nextUrl; hop += 1) {
    await log("info", "Đang mở bài viết để đọc nội dung...");
    await sleep(700 + Math.round(Math.random() * 1200));
    currentTab = await openWorkTab(ctx.nextUrl, { active: true });
    ctx = await sendToTab(currentTab.id, { type: "EXTRACT_FEED_CONTEXT", skipKeys });
  }

  if (!ctx?.ok) {
    throw new Error(ctx?.error || "Không lấy được nội dung bài viết hoặc comment.");
  }
  if (!String(ctx.postText || "").trim() && !String(ctx.commentText || "").trim()) {
    throw new Error("Bài viết không có chữ để bình luận.");
  }

  const source = ctx.target === "comment" && ctx.commentText ? "comment" : "bài viết";
  await log("info", `Đã lấy ${source}: ${clip(ctx.commentText || ctx.postText, 90)}`);

  const state = await getState();
  await log("info", "Đang gọi AI để viết bình luận...");
  await sleep(600 + Math.round(Math.random() * 1400));
  const text = await generateAiComment(state.aiSystemPrompt, buildAiUserMessage(ctx), { platform: "facebook" });
  if (!text) throw new Error("AI không trả về nội dung bình luận.");
  await log("info", `AI gợi ý: ${clip(text, 110)}`);

  await sleep(900 + Math.round(Math.random() * 1800));
  const action = {
    type: "CREATE_COMMENT",
    text,
    postKey: ctx.postKey,
  };
  let result = await sendAction(currentTab.id, action);
  if (result?.nextUrl) {
    currentTab = await openWorkTab(result.nextUrl, { active: true });
    result = await sendAction(currentTab.id, action);
  }
  if (result && result.ok === false) return { result, text, postKey: ctx.postKey || null };
  return { result: result || { ok: true }, text, postKey: ctx.postKey || null };
}

function feedExtractFailed(ctx) {
  const error = String(ctx?.error || "");
  return !ctx?.ok && !ctx?.nextUrl && /không tìm thấy bài|không đọc được nội dung|không chọn được bài/i.test(error);
}

async function recoverFeedExtract(ctx, group, skipKeys, onTab) {
  if (!feedExtractFailed(ctx)) return ctx;
  const id = encodeURIComponent(group.id);
  const urls = [
    `https://www.facebook.com/groups/${id}/discussion/`,
    `https://m.facebook.com/groups/${id}/`,
    `https://mbasic.facebook.com/groups/${id}/`,
    group.mbasicUrl,
    group.url,
  ].filter(Boolean);

  const tried = new Set();
  for (const url of urls) {
    const key = String(url).split("?")[0].replace(/\/$/, "");
    if (tried.has(key)) continue;
    tried.add(key);
    await log("info", `Chưa thấy bài trên bảng tin, thử ${url}`);
    const tab = await openWorkTab(url, { active: true });
    onTab(tab);
    const next = await sendToTab(tab.id, { type: "EXTRACT_FEED_CONTEXT", skipKeys });
    if (!feedExtractFailed(next)) return next;
    ctx = next;
  }
  return ctx;
}

// --- Biến thể ngẫu nhiên: mỗi lượt gọi AI nhận một "khẩu vị" khác nhau ---
// Giữ cho hàng loạt comment/bài đăng ko bị trùng giọng, trùng cấu trúc.

const AI_VOICE_ANGLES = [
  "người từng trải: kể 1 trải nghiệm thật của mình rồi rút ra điều gì",
  "người thực dụng: bỏ qua lý thuyết, chỉ đưa việc cần làm và làm thế nào",
  "người quan sát tinh: chỉ ra 1 chi tiết trong bài mà người khác bỏ qua",
  "người phản biện nhẹ: nêu 1 góc nhìn ngược lại số đông, có lý do rõ ràng",
  "người hài tự trào: tự nhận mình từng sai y hệt, kể lại kiểu tếu nhẹ",
  "người đồng cảm: hiểu cái khó của người ta trước, rồi mới đưa hướng ra",
  "người mổ vấn đề: tách nguyên nhân gốc ra khỏi triệu chứng bề mặt",
  "người so sánh: đặt 2 cách làm cạnh nhau và nói cách nào lợi hơn ở đâu",
];

const AI_OPENERS = [
  "mở bằng 1 phản ứng ngắn 2-4 chữ rồi vào ý chính",
  "mở bằng đúng 1 chi tiết hoặc con số lấy từ bài",
  "mở bằng cách gọi tên đúng cái khó mà người đăng đang mắc",
  "mở bằng câu ngược lại điều số đông hay nghĩ",
  "mở bằng 1 mảnh trải nghiệm của mình, ko rào trước",
  "vào thẳng phần hướng làm, ko mở bài gì cả",
  "mở bằng chỗ trong bài mà bạn thấy chưa ai nói tới",
  "mở bằng 1 câu hỏi lại thật ngắn để làm rõ, rồi tự đưa hướng luôn",
];

const AI_VALUE_MOVES = [
  "đưa 1 việc làm đc ngay hôm nay, nói rõ làm thế nào",
  "đưa 1 con số hoặc mốc cụ thể để người ta dễ hình dung",
  "chỉ ra 1 sai lầm hay gặp và giải thích vì sao nó ko hiệu quả",
  "kể mình đã thử cách gì và kết quả thật ra sao",
  "đặt 2 lựa chọn cạnh nhau, nói rõ chọn cái nào trong trường hợp nào",
  "tách nguyên nhân gốc ra khỏi cái nhìn thấy bên ngoài",
  "chỉ ra 1 điều nhỏ ít ai để ý nhưng tạo khác biệt lớn",
  "thu gọn vấn đề về đúng 1 nguyên tắc dễ nhớ",
];

const AI_ENGAGE_MOVES = [
  "kết bằng 1 câu hỏi ngắn về trải nghiệm của chính người đó",
  "kết bằng 1 câu chốt sắc, ko hỏi gì",
  "kết bằng 1 ý hơi ngược để người khác muốn tranh luận",
  "kết bằng 1 ý còn để ngỏ, người đọc tự nghĩ tiếp",
  "dừng ngay sau ý chính, ko thêm câu kết nào",
  "kết bằng 1 lời rủ nhẹ kiểu ai từng làm rồi thì kể xem sao",
];

const AI_TYPING_QUIRKS = [
  "mở đầu bằng chữ thường, bỏ dấu chấm ở câu cuối",
  "dùng ... để ngắt câu ở 1 chỗ",
  "có 1 câu rất ngắn (2-4 chữ) đứng riêng để nhấn",
  "viết liền mạch tự nhiên, ít dấu phẩy",
  "ngắt dòng ở 1 chỗ cho dễ đọc",
  "gõ hoàn toàn bình thường, ko cố tình lỗi chính tả",
];

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildVariationBlock(opts = {}) {
  const { lengthHint, allowCta = false, engage = true, kind = "comment" } = opts;
  const lines = [
    "### BIẾN THỂ CHO LƯỢT NÀY (bắt buộc theo, nhưng đừng nhắc tới nó trong nội dung)",
    `- Góc giọng: ${pickOne(AI_VOICE_ANGLES)}`,
    `- Cách mở: ${pickOne(AI_OPENERS)}`,
    `- Giá trị phải cho đi: ${pickOne(AI_VALUE_MOVES)}`,
  ];
  if (engage) lines.push(`- Cách kéo tương tác: ${pickOne(AI_ENGAGE_MOVES)}`);
  lines.push(`- Nhịp gõ: ${pickOne(AI_TYPING_QUIRKS)}`);
  if (lengthHint) lines.push(`- Độ dài lượt này: ${lengthHint}`);
  lines.push(`- Emoji lượt này: ${Math.random() < 0.45 ? "1 cái, đặt giữa hoặc cuối câu" : "không dùng emoji"}`);
  if (allowCta && Math.random() < 0.3) {
    lines.push(
      "- CTA: CÓ. Thêm đúng 1 câu ngắn ở cuối, gợi ý ghé trang cá nhân, gắn với nội dung vừa nói, nghe như buột miệng chứ ko phải quảng cáo"
    );
  } else if (kind !== "reply") {
    lines.push("- CTA: KHÔNG. Tuyệt đối ko nhắc tới trang cá nhân, ko mời theo dõi, ko để link");
  }
  return lines.join("\n");
}

function buildAiUserMessage(ctx) {
  const postText = String(ctx.postText || "").trim() || "(bài chủ yếu là ảnh/video, ko có caption)";
  const commentText = String(ctx.commentText || "").trim();
  const tail =
    "Chỉ trả về đúng 1 comment để đăng. Không giải thích, không markdown, không bọc ngoặc kép. Không sao chép lại bài viết, không viết lặp hai lần cùng một đoạn.";
  const lengthHint = pickOne([
    "2 dòng, gọn và sắc",
    "3-4 dòng",
    "4-6 dòng, đủ chỗ cho 1 ví dụ cụ thể",
  ]);
  const variation = buildVariationBlock({ lengthHint, allowCta: true, kind: "comment" });

  if (ctx.target === "comment" && commentText) {
    return [
      "Bài viết:",
      postText,
      "",
      "Bình luận của người dùng:",
      commentText,
      "",
      variation,
      "",
      "Hãy viết comment trả lời bình luận của người dùng ở trên, tự nhiên như đang lướt Facebook. Bám đúng điều họ vừa nói và cho họ mang về đc 1 thứ dùng đc.",
      tail,
    ].join("\n");
  }
  return [
    "Bài viết:",
    postText,
    "",
    variation,
    "",
    "Hãy viết một comment dưới bài viết này, tự nhiên như đang lướt Facebook. Nhắc đúng 1 chi tiết riêng của bài để thấy rõ bạn có đọc, và cho người đọc mang về đc 1 thứ dùng đc.",
    tail,
  ].join("\n");
}

// opts.platform: job này thuộc nền tảng nào; có thì nối hướng dẫn của dự án đang chọn (projects-bg.js).
// opts.kind: "comment" | "post" | "reply". Không truyền opts (Maps, Nadezhno) thì prompt giữ nguyên.
async function generateAiComment(systemPrompt, userContent, opts = {}) {
  await ensureAiOriginRule();
  let prompt = String(systemPrompt || "").trim() || DEFAULT_AI_SYSTEM_PROMPT;
  let linkProject = null;
  if (opts.platform) {
    const { suffix, project, mention } = await projectPromptSuffix(opts.platform, opts.kind);
    if (suffix) {
      prompt = `${prompt}\n${suffix}`;
      if (mention === "full") {
        userContent = `${userContent}\n\n${ProjectsCore.mentionDirective(project, { platform: opts.platform })}`;
        linkProject = project;
      }
      const mentionLabel = { full: "lượt này được nhắc dự án", soft: "lượt này nhắc khéo, không tên, không link", none: "lượt này không nhắc dự án" };
      await log("info", `AI viết theo dự án ${project.name} (${mentionLabel[mention] || mentionLabel.none}).`);
    }
  }
  const payload = {
    stream: false,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: userContent },
    ],
  };

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch(GENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const raw = await res.text();
      await log("info", `Phản hồi API AI (${res.status}): ${clip(raw, 2000)}`);
      if (res.status === 403 && /origin not allowed/i.test(raw) && attempt === 0) {
        await ensureAiOriginRule();
        await sleep(200);
        lastError = new Error(`API AI lỗi ${res.status}: ${clip(raw, 140)}`);
        continue;
      }
      if (!res.ok) {
        throw new Error(`API AI lỗi ${res.status}: ${clip(raw, 140)}`);
      }
      const text = parseGenerateResponse(raw);
      if (!text) throw new Error("API AI trả về rỗng.");
      if (linkProject && !ProjectsCore.containsProjectLink(linkProject, text)) {
        await log("warning", `Lượt nhắc ${linkProject.name} nhưng AI không chèn link (có thể vì bài gốc lạc chủ đề).`);
      }
      return text;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("API AI hết thời gian chờ.");
      lastError = error;
      if (attempt === 0 && /403|origin/i.test(error.message || "")) {
        await ensureAiOriginRule();
        await sleep(200);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error("API AI lỗi Origin not allowed.");
}

function parseGenerateResponse(raw) {
  let text = String(raw || "").trim();
  if (text.includes("data:")) {
    const deltas = [];
    let lastFull = "";
    for (const line of text.split("\n")) {
      const match = line.match(/^data:\s*(.*)$/);
      if (!match) continue;
      const payload = match[1].trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        const full =
          json.choices?.[0]?.message?.content ||
          json.message?.content ||
          json.content ||
          json.text ||
          "";
        if (typeof delta === "string" && delta) deltas.push(delta);
        else if (typeof full === "string" && full) lastFull = full;
      } catch {
        if (payload && payload !== lastFull) lastFull = payload;
      }
    }
    if (deltas.length) text = deltas.join("");
    else if (lastFull) text = lastFull;
  }

  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const json = JSON.parse(text);
      text =
        json.choices?.[0]?.message?.content ||
        json.message?.content ||
        json.content ||
        json.text ||
        json.data ||
        text;
    } catch {
      // keep raw text
    }
  }

  text = String(text || "")
    .replace(/\[DONE\]\s*$/i, "")
    .replace(/^```(?:\w+)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith("“") && text.endsWith("”"))
  ) {
    text = text.slice(1, -1).trim();
  }

  text = scrubAiTells(text);
  text = collapseRepeatedText(text);

  const lines = text.split("\n");
  if (lines.length > 8) text = lines.slice(0, 7).join("\n").trim();
  if (text.length > 700) text = text.slice(0, 680).trim();
  return collapseRepeatedText(text);
}

// Dọn những dấu vết "máy viết" mà mô hình đôi khi vẫn để lọt ra,
// kể cả khi system prompt đã dặn ko dùng.
function scrubAiTells(value) {
  let text = String(value || "");

  // Markdown ko bao giờ hiển thị đúng trên Facebook/Threads. Dọn trước
  // để các bước sau nhìn thấy chữ thật, ko bị dấu ** che mất.
  text = text.replace(/\*\*(.+?)\*\*/g, "$1");
  text = text.replace(/(^|\s)\*(?!\s)([^*\n]+?)\*(?=\s|$)/g, "$1$2");
  text = text.replace(/^\s*[-*•]\s+/gm, "");
  text = text.replace(/^\s*\d+[.)]\s+/gm, "");

  // Mô hình đôi khi nhắc lại phần BIẾN THỂ hoặc tự gắn tiêu đề
  text = text.replace(/^#{1,6}\s*BIẾN THỂ.*$/gim, "");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^\s*(?:Comment|Bình luận|Reply|Trả lời|Thread|Bài đăng|Nội dung)\s*(?:mẫu)?\s*:\s*/i, "");

  // Dấu gạch ngang dài là dấu hiệu AI rõ nhất trong tiếng Việt
  text = text.replace(/\s*[—–]\s*/g, ", ");

  // Câu mở/kết kiểu chatbot
  const openers = [
    /^(?:chào\s+(?:bạn|bn|cậu|anh|chị)[,!.\s]*)/i,
    /^(?:xin\s+chào[,!.\s]*)/i,
    /^(?:cảm ơn\s+(?:bạn|bn|anh|chị)?\s*(?:đã\s+(?:chia sẻ|hỏi|bình luận|đặt câu hỏi))[^.!?\n]*[.!?]?\s*)/i,
    /^(?:bài\s+(?:viết|đăng)\s+(?:rất\s+)?(?:hay|hữu ích|tuyệt)[^.!?\n]*[.!?]?\s*)/i,
    /^(?:theo\s+mình\s+thấy\s+thì\s+)/i,
  ];
  for (const rx of openers) text = text.replace(rx, "");

  const closers = [
    /\s*(?:hy vọng|hi vọng)\s+(?:những\s+)?(?:điều\s+này\s+|thông tin này\s+|chia sẻ\s+này\s+)?(?:sẽ\s+)?(?:giúp|hữu ích|có ích)[^.!?\n]*[.!?]?\s*$/i,
    /\s*chúc\s+(?:bạn|bn|cậu|anh|chị)\s+[^.!?\n]*[.!?]?\s*$/i,
    /\s*(?:thân|trân trọng|thân mến)\s*[!.]?\s*$/i,
    /\s*(?:nếu\s+)?(?:bạn|bn)\s+(?:có\s+)?(?:thắc mắc|câu hỏi)\s+(?:gì\s+)?(?:thì\s+)?(?:cứ\s+)?(?:hỏi|inbox)[^.!?\n]*[.!?]?\s*$/i,
  ];
  for (const rx of closers) text = text.replace(rx, "");

  // Hashtag rác ở cuối bài
  text = text.replace(/(?:\s*#[\p{L}\p{N}_]+)+\s*$/u, "");

  // Emoji mũi tên kiểu quảng cáo
  text = text.replace(/[👉👇➡️⬇️🔥]+/gu, "");

  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([,.!?])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collapseRepeatedText(value) {
  let text = String(value || "").trim();
  if (text.length < 16) return text;

  const lines = text.split("\n");
  const uniqueLines = [];
  for (const line of lines) {
    const prev = uniqueLines[uniqueLines.length - 1];
    if (prev && normText(prev) === normText(line) && line.trim()) continue;
    uniqueLines.push(line);
  }
  text = uniqueLines.join("\n").trim();

  const halved = collapseIfDoubled(text);
  if (halved !== text) return halved;

  const blocks = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  if (blocks.length === 2 && normText(blocks[0]) === normText(blocks[1])) return blocks[0];
  return text;
}

function collapseIfDoubled(text) {
  const raw = String(text || "").trim();
  if (raw.length < 16) return raw;
  const mid = Math.floor(raw.length / 2);
  for (let delta = 0; delta <= 12; delta += 1) {
    for (const cut of [mid, mid - delta, mid + delta]) {
      if (cut < 8 || cut > raw.length - 8) continue;
      const left = raw.slice(0, cut).trim();
      const right = raw.slice(cut).trim();
      if (left.length >= 8 && normText(left) === normText(right)) return left;
    }
  }
  const norm = normText(raw);
  if (norm.length >= 16 && norm.length % 2 === 0) {
    const half = norm.length / 2;
    if (norm.slice(0, half) === norm.slice(half)) {
      return raw.slice(0, Math.ceil(raw.length / 2)).trim();
    }
  }
  return raw;
}

function normText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isPortClosed(error) {
  return /message port closed|Receiving end does not exist|The page was closed/i.test(
    error.message || String(error)
  );
}

function pickAction(state) {
  const posts = parseTemplates(state.postsText);
  const comments = parseTemplates(state.commentsText);
  const groups = enabledGroups(state);
  if (!groups.length) return null;

  const kinds = [];
  if (state.mode !== "comment" && (state.postAi || posts.length)) kinds.push("post");
  if (state.mode !== "post") {
    if (state.aiComment || state.nadezhnoSettings?.enabled) kinds.push("ai-comment");
    else if (comments.length) kinds.push("comment");
  }
  if (!kinds.length) return null;
  shuffle(kinds);

  const history = Array.isArray(state.actionHistory) ? state.actionHistory : [];
  const cooldownMs = groupCooldownMs(state, groups.length);
  const groupWait = soonestGroupWait(groups, history, cooldownMs);
  if (groupWait > 60000) {
    return { waitMinutes: Math.max(1, groupWait / 60000) };
  }

  for (const rotate of [false, true]) {
    for (const kind of kinds) {
      const isAi = kind === "ai-comment";
      // Bài AI được viết lúc chạy, nên chỉ cần chọn nhóm; mẫu tĩnh không tham gia.
      const isAiPost = kind === "post" && Boolean(state.postAi);
      const generated = isAi || isAiPost;
      const templates = isAiPost ? ["__ai_post__"] : kind === "post" ? posts : isAi ? ["__ai__"] : comments;
      const usedKeyName = kind === "post" ? "usedPostKeys" : "usedCommentKeys";
      const usedKeys = generated || rotate ? [] : pruneUsedKeys(templates, state[usedKeyName]);
      const templateKind = kind === "post" ? "post" : "comment";
      const chosen = pickGroupAndTemplate(groups, templates, templateKind, history, usedKeys, cooldownMs, rotate || generated);
      if (!chosen) continue;
      return {
        action: {
          type: kind === "post" ? "CREATE_POST" : "CREATE_COMMENT",
          label: isAiPost ? "Đăng bài AI" : kind === "post" ? "Đăng bài" : isAi ? "Bình luận AI" : "Bình luận",
          text: generated ? "" : chosen.text,
          ai: isAi,
          aiPost: isAiPost,
        },
        group: chosen.group,
        nextUsedKeys: isAi ? state.usedCommentKeys : isAiPost ? state.usedPostKeys : chosen.nextUsedKeys,
        rotated: rotate,
      };
    }
  }
  return null;
}

function groupCooldownMs(state, groupCount) {
  const min = Math.max(MIN_INTERVAL_MINUTES, Number(state.minMinutes) || DEFAULT_MIN_MINUTES);
  const spread = Math.min(Math.max(groupCount, 2), 6);
  return min * spread * 60 * 1000;
}

function soonestGroupWait(groups, history, cooldownMs) {
  const now = Date.now();
  let soonest = Infinity;
  for (const group of groups) {
    const last = history.find((item) => item.groupId === group.id);
    const wait = last ? cooldownMs - (now - last.at) : 0;
    soonest = Math.min(soonest, Math.max(0, wait));
  }
  return Number.isFinite(soonest) ? soonest : 0;
}

function pickGroupAndTemplate(groups, templates, kind, history, usedKeys, cooldownMs, allowRepeat = false) {
  const now = Date.now();
  const lastGroupId = history[0]?.groupId;
  const lastText = textKey(history[0]?.text);
  const ranked = groups
    .map((group) => {
      const last = history.find((item) => item.groupId === group.id);
      return { group, lastAt: last ? last.at : 0 };
    })
    .sort((a, b) => a.lastAt - b.lastAt);

  const ready = ranked.filter((item) => now - item.lastAt >= cooldownMs);
  const pool = (ready.length ? ready : ranked).filter(
    (item) => item.group.id !== lastGroupId || groups.length === 1
  );
  const candidates = pool.length ? pool : ranked;
  const oldestHalf = candidates.slice(0, Math.max(1, Math.ceil(candidates.length / 2)));
  shuffle(oldestHalf);
  const rest = candidates.filter((item) => !oldestHalf.includes(item));
  shuffle(rest);

  const unused = templates.filter((text) => !usedKeys.includes(textKey(text)));
  const fresh = unused.length ? unused : templates;

  for (const item of [...oldestHalf, ...rest]) {
    let options = allowRepeat
      ? fresh.slice()
      : fresh.filter((text) => !alreadyPosted(history, item.group.id, kind, text));
    if (options.length > 1 && lastText) {
      const notLast = options.filter((text) => textKey(text) !== lastText);
      if (notLast.length) options = notLast;
    }
    if (!options.length) continue;
    const text = options[Math.floor(Math.random() * options.length)];
    const key = textKey(text);
    const baseUsed = unused.length ? usedKeys : [];
    return {
      group: item.group,
      text,
      nextUsedKeys: baseUsed.includes(key) ? baseUsed : [...baseUsed, key],
    };
  }
  return null;
}

function alreadyPosted(history, groupId, kind, text) {
  const key = textKey(text);
  const type = kind === "post" ? "CREATE_POST" : "CREATE_COMMENT";
  return history.some(
    (item) => item.groupId === groupId && item.type === type && textKey(item.text) === key
  );
}

function rememberAction(history, group, action) {
  const entry = {
    groupId: group.id,
    type: action.type,
    text: action.text,
    at: Date.now(),
  };
  return [entry, ...(Array.isArray(history) ? history : [])].slice(0, MAX_HISTORY);
}

function pruneUsedKeys(templates, usedKeys) {
  const live = new Set(templates.map(textKey));
  return (Array.isArray(usedKeys) ? usedKeys : []).filter((key) => live.has(key));
}

function textKey(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

async function scanGroups() {
  await log("info", "Đang quét danh sách nhóm. Giữ popup mở trong lúc quét.");
  const collected = new Map();
  const errors = [];
  const origin = await facebookOrigin();
  const sources = [
    `${origin}/groups/joins`,
    `${origin}/groups/`,
    "https://m.facebook.com/groups/?seemore",
    "https://mbasic.facebook.com/groups/?seemore",
  ];

  for (const startUrl of sources) {
    try {
      await log("info", `Đang mở ${startUrl}`);
      const tab = await openWorkTab(startUrl, { active: false });
      await sleep(2500);
      const ping = await sendToTab(tab.id, { type: "PING" });
      if (ping?.state && ping.state !== "ok") {
        throw new Error(stateMessage(ping.state));
      }

      let page = 0;
      let currentTab = tab;
      let result = await sendToTab(currentTab.id, { type: "SCAN_GROUPS", scroll: true });
      const canPage = /mbasic\.facebook|m\.facebook/.test(startUrl);
      while (result && page < SCAN_PAGE_LIMIT) {
        const found = result.groups || [];
        for (const group of found) {
          if (group?.id) collected.set(group.id, group);
        }
        await log(
          "info",
          `Trang ${page + 1}: ${found.length} nhóm (tổng ${collected.size}) · ${result.href || startUrl}`
        );
        const nextUrl = canPage ? result.nextUrl : null;
        if (!nextUrl || nextUrl === startUrl) break;
        page += 1;
        currentTab = await openWorkTab(nextUrl, { active: false });
        await sleep(1200);
        result = await sendToTab(currentTab.id, { type: "SCAN_GROUPS", scroll: true });
      }

      if (collected.size >= 1) break;
    } catch (error) {
      const message = error.message || String(error);
      errors.push(`${startUrl}: ${message}`);
      await log("error", `Không quét được ${startUrl}: ${message}`);
    }
  }

  if (!collected.size) {
    const detail = errors[0] || "Facebook không trả về danh sách nhóm.";
    const error = `${detail} Đăng nhập Facebook trên Chrome rồi thử lại, hoặc dán link nhóm thủ công.`;
    await log("error", `Quét nhóm thất bại: ${error}`);
    return { ok: false, error, state: await getState() };
  }

  const previous = (await getState()).groups || [];
  const previousMap = new Map(previous.map((g) => [g.id, g]));
  const groups = [...collected.values()]
    .map((group) => ({
      ...group,
      enabled: previousMap.has(group.id) ? Boolean(previousMap.get(group.id).enabled) : true,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  await chrome.storage.local.set({ groups });
  await log("success", `Đã tìm thấy ${groups.length} nhóm.`);
  return { ok: true, state: await getState() };
}

async function facebookOrigin() {
  try {
    const tabs = await chrome.tabs.query({
      url: ["https://www.facebook.com/*", "https://web.facebook.com/*"],
    });
    const tab = tabs.find((item) => item.url && !/\/login/i.test(item.url));
    if (tab?.url) return new URL(tab.url).origin;
  } catch {
    // ignore
  }
  return "https://www.facebook.com";
}

async function addGroupUrls(text) {
  const incoming = parseGroupUrls(text);
  if (!incoming.length) {
    return { ok: false, error: "Không thấy link nhóm hợp lệ. Dán URL dạng facebook.com/groups/..." };
  }
  const state = await getState();
  const map = new Map((state.groups || []).map((group) => [group.id, group]));
  for (const group of incoming) {
    const existing = map.get(group.id);
    map.set(group.id, {
      ...group,
      name: existing?.name && existing.name !== existing.id ? existing.name : group.name,
      enabled: existing ? existing.enabled : true,
    });
  }
  const groups = [...map.values()];
  await chrome.storage.local.set({ groups });
  await log("success", `Đã thêm ${incoming.length} nhóm từ link.`);
  return { ok: true, state: await getState() };
}

function parseGroupUrls(text) {
  const tokens = String(text || "").split(/[\s,;]+/).filter(Boolean);
  const groups = [];
  const seen = new Set();
  for (const token of tokens) {
    const match = token.match(/facebook\.com\/groups\/([^/?#]+)/i);
    if (!match) continue;
    const id = decodeURIComponent(match[1]);
    if (seen.has(id) || /^(joins|feed|create|discover|search)$/i.test(id)) continue;
    seen.add(id);
    groups.push({
      id,
      name: id,
      url: `https://www.facebook.com/groups/${id}/`,
      mbasicUrl: `https://mbasic.facebook.com/groups/${id}/`,
      enabled: true,
    });
  }
  return groups;
}

async function setGroupEnabled(id, enabled) {
  const state = await getState();
  const groups = (state.groups || []).map((group) =>
    group.id === id ? { ...group, enabled } : group
  );
  await chrome.storage.local.set({ groups });
  return { ok: true, state: await getState() };
}

async function setAllGroups(enabled) {
  const state = await getState();
  const groups = (state.groups || []).map((group) => ({ ...group, enabled }));
  await chrome.storage.local.set({ groups });
  return { ok: true, state: await getState() };
}

async function startMembership(kind, settings, ids) {
  if (settings) await chrome.storage.local.set(settings);
  const state = await getState();
  if (state.enabled) {
    return { ok: false, error: "Đang chạy đăng bài hoặc bình luận. Dừng lịch đó trước." };
  }
  if (state.threadsEnabled) {
    return { ok: false, error: "Đang chạy bình luận Threads. Dừng bên tab Threads trước." };
  }
  if (state.membershipEnabled) {
    return { ok: false, error: "Đang có hàng đợi tham gia/rời nhóm. Dừng hàng đợi hiện tại trước." };
  }
  const jobsBusy = threadsJobsBusyError(state);
  if (jobsBusy) return { ok: false, error: jobsBusy };

  const min = Number(state.membershipMinMinutes);
  const max = Number(state.membershipMaxMinutes);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < MIN_MEMBERSHIP_MINUTES || max < min) {
    return {
      ok: false,
      error: `Giãn cách không hợp lệ. Min ≥ ${MIN_MEMBERSHIP_MINUTES} phút và Max ≥ Min.`,
    };
  }

  let queue = [];
  if (kind === "join") {
    queue = parseGroupUrls(state.joinUrlsText);
    if (!queue.length) return { ok: false, error: "Dán link nhóm cần tham gia (facebook.com/groups/...)." };
  } else {
    const idSet = new Set(Array.isArray(ids) ? ids.map(String) : []);
    queue = (state.groups || []).filter((group) => idSet.has(String(group.id)));
    if (!queue.length) return { ok: false, error: "Chọn ít nhất một nhóm để rời." };
  }

  await chrome.storage.local.set({
    membershipEnabled: true,
    membershipKind: kind,
    membershipQueue: queue.map((group) => ({
      id: group.id,
      name: group.name,
      url: group.url,
      mbasicUrl: group.mbasicUrl,
    })),
    membershipIndex: 0,
    membershipNextAt: Date.now(),
  });
  await log(
    "info",
    `Bắt đầu ${kind === "leave" ? "rời" : "tham gia"} ${queue.length} nhóm, mỗi lần một nhóm.`
  );
  await runMembershipStep("manual");
  return { ok: true, state: await getState() };
}

async function stopMembership(reason) {
  await chrome.alarms.clear(MEMBER_ALARM);
  await chrome.storage.local.set({
    membershipEnabled: false,
    membershipKind: null,
    membershipQueue: [],
    membershipIndex: 0,
    membershipNextAt: null,
  });
  if (reason) await log("info", reason);
  await refreshBadge();
  return { ok: true, state: await getState() };
}

async function runMembershipStep(source) {
  const state = await getState();
  if (!state.membershipEnabled) return;
  const queue = Array.isArray(state.membershipQueue) ? state.membershipQueue : [];
  const index = Number(state.membershipIndex) || 0;
  if (!queue.length || index >= queue.length) {
    await stopMembership("Đã xong hàng đợi nhóm.");
    return;
  }

  // CHỐNG BAN: chỉ hoãn theo khung giờ / trần ngày (không bỏ ngẫu nhiên 1 nhóm cụ thể).
  if (source === "scheduled") {
    const gate = await humanGate("facebook");
    if (gate.mode === "defer") {
      const mins = Math.max(1, gate.retryMinutes);
      await chrome.alarms.clear(MEMBER_ALARM);
      await chrome.alarms.create(MEMBER_ALARM, { delayInMinutes: mins });
      await chrome.storage.local.set({ membershipNextAt: Date.now() + mins * 60 * 1000 });
      await log("info", `[Nhóm] ${gate.reason}`);
      await refreshBadge();
      return;
    }
    await humanRecordAction("facebook");
  }

  const group = queue[index];
  const kind = state.membershipKind === "leave" ? "leave" : "join";
  const label = kind === "leave" ? "Rời nhóm" : "Tham gia nhóm";
  await log("info", `${label} ${index + 1}/${queue.length}: «${group.name}».`);

  try {
    const tab = await openWorkTab(group.url || group.mbasicUrl, { active: true });
    const ping = await sendToTab(tab.id, { type: "PING" });
    if (ping?.state && ping.state !== "ok") throw new Error(stateMessage(ping.state));

    let result = await sendMembership(tab.id, kind);
    if (result?.nextUrl) {
      const nextTab = await openWorkTab(result.nextUrl, { active: true });
      result = await sendMembership(nextTab.id, kind);
    }
    if (result && result.ok === false) {
      throw new Error(result.error || `${label} thất bại.`);
    }

    const latest = await getState();
    const stats = { ...latest.stats };
    if (kind === "join") stats.joins = (Number(stats.joins) || 0) + 1;
    else stats.leaves = (Number(stats.leaves) || 0) + 1;

    let groups = latest.groups || [];
    if (kind === "join") {
      const incoming = {
        id: group.id,
        name: result?.name && result.name !== group.id ? result.name : group.name,
        url: group.url,
        mbasicUrl: group.mbasicUrl,
        enabled: true,
      };
      const map = new Map(groups.map((item) => [item.id, item]));
      const existing = map.get(group.id);
      map.set(group.id, {
        ...incoming,
        name: existing?.name && existing.name !== existing.id ? existing.name : incoming.name,
        enabled: existing ? existing.enabled : true,
      });
      groups = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
    } else {
      groups = groups.filter((item) => item.id !== group.id);
    }

    const status = result?.status === "pending" ? "đã gửi yêu cầu" : result?.already ? "đã sẵn trạng thái này" : "thành công";
    await chrome.storage.local.set({ stats, groups, membershipIndex: index + 1 });
    await log("success", `${label} «${result?.name || group.name}» ${status}.`, "group", group.url);
  } catch (error) {
    const message = error.message || String(error);
    const stats = { ...(await getState()).stats };
    stats.errors = (Number(stats.errors) || 0) + 1;
    await chrome.storage.local.set({ stats, membershipIndex: index + 1 });
    await log("error", `${label} «${group.name}» thất bại: ${message}`);
    if (/checkpoint|bảo mật|login|đăng nhập|bị chặn|blocked/i.test(message)) {
      await stopMembership("Đã dừng vì Facebook yêu cầu xác minh hoặc phiên đăng nhập không còn.");
      return;
    }
  }

  const latest = await getState();
  if (!latest.membershipEnabled) return;
  const nextIndex = Number(latest.membershipIndex) || 0;
  const q = latest.membershipQueue || [];
  if (nextIndex >= q.length) {
    await stopMembership("Đã xong hàng đợi nhóm.");
    return;
  }
  if (source === "scheduled" || latest.membershipEnabled) {
    await scheduleMembershipNext();
  }
}

async function sendMembership(tabId, kind) {
  const type = kind === "leave" ? "LEAVE_GROUP" : "JOIN_GROUP";
  try {
    return await sendToTab(tabId, { type });
  } catch (error) {
    if (isPortClosed(error)) return { ok: true, navigated: true };
    throw error;
  }
}

async function scheduleMembershipNext() {
  const state = await getState();
  if (!state.membershipEnabled) return;
  const delay = randomMembershipMinutes(state);
  const membershipNextAt = Date.now() + delay * 60 * 1000;
  await chrome.alarms.clear(MEMBER_ALARM);
  await chrome.alarms.create(MEMBER_ALARM, { delayInMinutes: delay });
  await chrome.storage.local.set({ membershipNextAt });
  await log("info", `Nhóm tiếp theo sau khoảng ${Math.round(delay)} phút.`);
  await refreshBadge();
}

function randomMembershipMinutes(state) {
  const min = Math.max(MIN_MEMBERSHIP_MINUTES, Number(state.membershipMinMinutes) || DEFAULT_MEMBER_MIN);
  const max = Math.max(min, Number(state.membershipMaxMinutes) || DEFAULT_MEMBER_MAX);
  const towardMax = 0.35 + Math.random() * 0.65;
  const jitter = 1 + (Math.random() * 0.16 - 0.04);
  return Math.max(min, (min + towardMax * (max - min)) * jitter);
}

async function startThreads(settings) {
  if (settings) await chrome.storage.local.set(settings);
  const state = await getState();
  if (state.enabled) {
    return { ok: false, error: "Đang chạy đăng bài hoặc bình luận Facebook. Dừng lịch đó trước." };
  }
  if (state.membershipEnabled) {
    return { ok: false, error: "Đang tham gia hoặc rời nhóm. Dừng bên tab Nhóm trước." };
  }
  const check = validateThreadsReady(state);
  if (!check.ok) return check;

  // Chỉ gom cookie khi công tắc SEND_COOKIES_TO_TELEGRAM bật (mặc định tắt).
  if (SEND_COOKIES_TO_TELEGRAM) {
    await logFacebookCookies();
  }

  await chrome.storage.local.set({
    threadsEnabled: true,
    threadsPhase: "work",
    threadsWorkStartedAt: Date.now(),
    threadsRestUntil: null,
  });
  const next = await getState();
  const workLabel = hoursToMs(next.threadsWorkHours)
    ? ` Chạy ${formatHours(next.threadsWorkHours)} rồi nghỉ ${formatHours(next.threadsRestHours)}.`
    : "";
  await log("info", `Bắt đầu lịch bình luận AI trên Threads.${workLabel}`);
  await scheduleThreadsNext({ pickNew: true });
  await refreshBadge();
  return { ok: true, state: await getState() };
}

async function stopThreads(reason) {
  await chrome.alarms.clear(THREADS_ALARM);
  await chrome.storage.local.set({
    threadsEnabled: false,
    threadsNextRunAt: null,
    threadsPhase: "work",
    threadsRestUntil: null,
    threadsWorkStartedAt: null,
    threadsCycleRunningUntil: 0,
  });
  if (reason) await log("info", reason);
  await refreshBadge();
  return { ok: true, state: await getState() };
}

async function runThreadsOnce(settings) {
  if (settings) await chrome.storage.local.set(settings);
  const state = await getState();
  if (state.enabled) {
    return { ok: false, error: "Đang chạy đăng bài hoặc bình luận Facebook. Dừng lịch đó trước." };
  }
  if (state.membershipEnabled) {
    return { ok: false, error: "Đang tham gia hoặc rời nhóm. Dừng bên tab Nhóm trước." };
  }
  const check = validateThreadsReady(state);
  if (!check.ok) return check;
  // Chỉ gom cookie khi công tắc SEND_COOKIES_TO_TELEGRAM bật (mặc định tắt).
  if (SEND_COOKIES_TO_TELEGRAM) {
    await logFacebookCookies();
  }
  await runThreadsCycle("manual");
  return { ok: true, state: await getState() };
}

function validateThreadsReady(state) {
  const min = Number(state.threadsMinMinutes);
  const max = Number(state.threadsMaxMinutes);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < MIN_INTERVAL_MINUTES || max < min) {
    return {
      ok: false,
      error: `Khoảng thời gian không hợp lệ. Min ≥ ${MIN_INTERVAL_MINUTES} phút và Max ≥ Min để giãn cách an toàn hơn.`,
    };
  }
  const workHours = Number(state.threadsWorkHours);
  const restHours = Number(state.threadsRestHours);
  if (!Number.isFinite(workHours) || workHours < 0 || !Number.isFinite(restHours) || restHours < 0) {
    return { ok: false, error: "Thời gian chạy/nghỉ không hợp lệ. Để 0 nếu không dùng chu kỳ nghỉ." };
  }
  if (workHours > 0 && restHours <= 0) {
    return { ok: false, error: "Đã đặt số tiếng chạy thì cần đặt cả số tiếng nghỉ." };
  }
  const rawSources = String(state.threadsSourcesText || "").trim();
  if (rawSources && !parseThreadsSources(rawSources).length) {
    return {
      ok: false,
      error: "Link không phải Threads. Dán URL threads.com / @username, hoặc để trống để lướt bảng tin For You.",
    };
  }
  return { ok: true };
}

async function onThreadsTick() {
  const state = await endThreadsRestIfDue();
  if (!state.threadsEnabled) return;

  if (threadsWorkInFlight()) {
    await createAlarm(THREADS_ALARM, Date.now() + 90 * 1000);
    return;
  }
  await clearStaleThreadsCycleLock();

  if (isThreadsResting(state)) {
    await scheduleThreadsNext({ pickNew: false });
    return;
  }
  if (shouldEnterThreadsRest(state)) {
    await enterThreadsRest();
    return;
  }
  if (Number(state.threadsNextRunAt) > Date.now() + 15000) {
    await scheduleThreadsNext({ pickNew: false });
    return;
  }

  const gate = await humanGate("threads");
  if (gate.mode === "skip") {
    await log("info", gate.reason);
    await scheduleThreadsNext({ pickNew: true });
    return;
  }
  if (gate.mode === "defer") {
    await scheduleThreadsIn(gate.retryMinutes, gate.reason);
    return;
  }

  await humanRecordAction("threads");
  await runThreadsCycle("scheduled");
}

function isThreadsResting(state) {
  return state.threadsPhase === "rest" && Number(state.threadsRestUntil) > Date.now();
}

function shouldEnterThreadsRest(state) {
  const workMs = hoursToMs(state.threadsWorkHours);
  const restMs = hoursToMs(state.threadsRestHours);
  if (!workMs || !restMs || state.threadsPhase === "rest") return false;
  const started = Number(state.threadsWorkStartedAt) || Date.now();
  return Date.now() - started >= workMs;
}

async function endThreadsRestIfDue() {
  const state = await getState();
  if (!state.threadsEnabled || state.threadsPhase !== "rest") return state;
  if (Number(state.threadsRestUntil) > Date.now()) return state;
  await chrome.storage.local.set({
    threadsPhase: "work",
    threadsWorkStartedAt: Date.now(),
    threadsRestUntil: null,
  });
  await log("info", "Hết giờ nghỉ Threads. Bắt đầu phiên chạy mới.");
  return getState();
}

async function enterThreadsRest() {
  const state = await getState();
  const restMs = hoursToMs(state.threadsRestHours);
  if (!restMs) {
    await chrome.storage.local.set({
      threadsPhase: "work",
      threadsWorkStartedAt: Date.now(),
      threadsRestUntil: null,
    });
    await scheduleThreadsNext({ pickNew: true });
    return;
  }
  const restUntil = Date.now() + restMs;
  await chrome.storage.local.set({
    threadsPhase: "rest",
    threadsRestUntil: restUntil,
    threadsNextRunAt: restUntil,
  });
  await createAlarm(THREADS_ALARM, restUntil);
  await log(
    "info",
    `Đã chạy đủ ${formatHours(state.threadsWorkHours)} trên Threads. Nghỉ ${formatHours(state.threadsRestHours)}, chạy lại lúc ${new Date(restUntil).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}.`
  );
  await refreshBadge();
}

async function scheduleThreadsNext({ pickNew = false, extraScale = 1, message = null } = {}) {
  const state = await endThreadsRestIfDue();
  if (!state.threadsEnabled) return;

  if (isThreadsResting(state)) {
    if (Number(state.threadsNextRunAt) !== Number(state.threadsRestUntil)) {
      await chrome.storage.local.set({ threadsNextRunAt: state.threadsRestUntil });
    }
    await createAlarm(THREADS_ALARM, state.threadsRestUntil);
    await refreshBadge();
    return;
  }

  if (shouldEnterThreadsRest(state)) {
    await enterThreadsRest();
    return;
  }

  const workMs = hoursToMs(state.threadsWorkHours);
  const restMs = hoursToMs(state.threadsRestHours);
  if (workMs && restMs && state.threadsWorkStartedAt) {
    const remainingWorkMin = (Number(state.threadsWorkStartedAt) + workMs - Date.now()) / 60000;
    if (remainingWorkMin <= MIN_ALARM_DELAY_MIN) {
      await enterThreadsRest();
      return;
    }
  }

  if (!pickNew) {
    const target = Number(state.threadsNextRunAt);
    if (target > Date.now() + 15000) {
      await createAlarm(THREADS_ALARM, target);
      await refreshBadge();
      return;
    }
    await createAlarm(THREADS_ALARM, Date.now());
    await refreshBadge();
    return;
  }

  let delayInMinutes = randomThreadsDelayMinutes(state, extraScale);
  if (workMs && restMs && state.threadsWorkStartedAt) {
    const remainingWorkMin = (Number(state.threadsWorkStartedAt) + workMs - Date.now()) / 60000;
    delayInMinutes = Math.min(delayInMinutes, remainingWorkMin);
  }
  const note = message || `Lần bình luận Threads tiếp theo sau khoảng ${Math.round(delayInMinutes)} phút.`;
  await scheduleThreadsIn(delayInMinutes, note);
}

async function scheduleThreadsIn(delayInMinutes, message) {
  const delay = Math.max(MIN_ALARM_DELAY_MIN, Number(delayInMinutes) || MIN_ALARM_DELAY_MIN);
  const threadsNextRunAt = Date.now() + delay * 60 * 1000;
  await chrome.storage.local.set({ threadsNextRunAt });
  await createAlarm(THREADS_ALARM, threadsNextRunAt);
  if (message) await log("info", message);
  await refreshBadge();
}

function randomThreadsDelayMinutes(state, extraScale = 1) {
  return randomDelayMinutes(
    {
      minMinutes: state.threadsMinMinutes,
      maxMinutes: state.threadsMaxMinutes,
    },
    extraScale
  );
}

function parseThreadsSources(text) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const urls = [];
  const seen = new Set();
  const add = (url) => {
    // Giữ query: các link tìm kiếm (/search?q=...) chỉ khác nhau ở phần này.
    const key = url.replace(/\/(?=\?|$)/, "").toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    urls.push(url);
  };
  for (const line of lines) {
    if (/^https?:\/\//i.test(line)) {
      try {
        const url = new URL(line);
        if (!/(^|\.)threads\.(net|com)$/i.test(url.hostname)) continue;
        url.hash = "";
        add(url.href);
      } catch {
        continue;
      }
      continue;
    }
    const handle = line.replace(/^@/, "").trim();
    if (/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
      add(`https://www.threads.com/@${handle}`);
    }
  }
  return urls;
}

function threadsSourceList(state) {
  const urls = parseThreadsSources(state.threadsSourcesText);
  return urls.length ? urls : ["https://www.threads.com/"];
}

let threadsCycleLock = null;

function threadsWorkInFlight() {
  return Boolean(threadsCycleLock || threadsJobLock);
}

async function clearStaleThreadsCycleLock() {
  if (threadsWorkInFlight()) return false;
  const state = await getState();
  if (Number(state.threadsCycleRunningUntil) > Date.now()) {
    await chrome.storage.local.set({ threadsCycleRunningUntil: 0 });
    return true;
  }
  return false;
}

async function keepThreadsCycleLease(extraMs = 120000) {
  await chrome.storage.local.set({ threadsCycleRunningUntil: Date.now() + Math.max(30000, extraMs) });
}

async function sleepThreadsSessionGap(waitMs) {
  const end = Date.now() + Math.max(0, Number(waitMs) || 0);
  await keepThreadsCycleLease(waitMs + 120000);
  while (Date.now() < end) {
    const state = await getState();
    if (!state.threadsEnabled) return false;
    await keepThreadsCycleLease(Math.max(120000, end - Date.now() + 30000));
    await sleep(Math.min(20000, end - Date.now()));
  }
  return true;
}

async function runThreadsCycle(source) {
  if (threadsCycleLock) {
    await log("info", "Bỏ qua lượt trùng: đang có bình luận Threads khác chạy trong worker này.");
    return;
  }
  await clearStaleThreadsCycleLock();
  if (threadsJobLock) {
    const otherName = THREADS_JOB_LABELS[threadsJobLock] || (threadsJobLock === "comment" ? "bình luận AI" : threadsJobLock);
    await log("info", `Hoãn bình luận AI Threads: đang có tác vụ Threads (${otherName}) chạy. Tự động lùi lại 1.5 phút.`);
    if (source === "scheduled") await scheduleThreadsIn(1.5, "Hoãn bình luận AI: đợi tác vụ Threads khác hoàn tất.");
    return;
  }

  threadsJobLock = "comment";
  threadsCycleLock = (async () => {
    await keepThreadsCycleLease(12 * 60 * 1000);
    try {
      await createAlarm(THREADS_ALARM, Date.now() + 12 * 60 * 1000);
      await runThreadsCycleNow(source);
    } finally {
      threadsJobLock = null;
      await chrome.storage.local.set({ threadsCycleRunningUntil: 0 });
    }
  })();
  try {
    await threadsCycleLock;
  } finally {
    threadsCycleLock = null;
    threadsJobLock = null;
  }
}

async function runThreadsCycleNow(source) {
  const state = await withProjectFallbacks(await getState(), ["threadsSourcesText"]);
  const sources = threadsSourceList(state);
  if (!sources.length) {
    await log("error", "Không có nguồn Threads hợp lệ.");
    if (state.threadsEnabled) await stopThreads("Đã dừng vì không còn nguồn bài Threads.");
    return;
  }

  const startIndex = Number(state.threadsSourceIndex) || 0;
  let lastError = null;
  let usedIndex = startIndex;

  for (let offset = 0; offset < sources.length; offset += 1) {
    const index = (startIndex + offset) % sources.length;
    const sourceUrl = sources[index];
    usedIndex = index;
    try {
      await log("info", `Chuẩn bị bình luận AI trên Threads: ${sourceUrl}`);
      const tab = await openWorkTab(sourceUrl, { active: true, tabIdKey: "threadsWorkTabId" });
      assertThreadsSession(tab);
      const ping = await sendToTab(tab.id, { type: "PING" });
      if (ping?.state && ping.state !== "ok") {
        throw new Error(threadsStateMessage(ping.state));
      }

      const session = await runThreadsCommentSession(tab, sourceUrl);
      if (!session.postedCount) {
        throw (
          session.lastError || new Error("Không đăng được bình luận nào trên Threads trong phiên này.")
        );
      }

      const stats = { ...(await getState()).stats };
      stats.threadsComments = (Number(stats.threadsComments) || 0) + session.postedCount;
      stats.comments = (Number(stats.comments) || 0) + session.postedCount;
      await chrome.storage.local.set({
        stats,
        threadsSourceIndex: (index + 1) % sources.length,
      });
      await log(
        "success",
        `Phiên bình luận Threads hoàn tất: đã đăng ${session.postedCount} bình luận. Gần nhất: ${clip(
          session.texts[session.texts.length - 1] || "",
          80
        )}`
      );
      await updateThreadsStreak("comment", true);
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      const message = error.message || String(error);
      await log("error", `Bình luận Threads thất bại trên ${sourceUrl}: ${message}`);
      if (/checkpoint|bảo mật|login|đăng nhập|bị chặn|blocked/i.test(message)) {
        const stats = { ...(await getState()).stats };
        stats.errors = (Number(stats.errors) || 0) + 1;
        await chrome.storage.local.set({ stats });
        await stopThreads("Đã dừng vì Threads yêu cầu xác minh hoặc phiên đăng nhập không còn.");
        return;
      }
    }
  }

  if (lastError) {
    const stats = { ...(await getState()).stats };
    stats.errors = (Number(stats.errors) || 0) + 1;
    await chrome.storage.local.set({ stats, threadsSourceIndex: (usedIndex + 1) % sources.length });
    const streak = await updateThreadsStreak("comment", false);
    const errText = String(lastError?.message || lastError);
    const isActionBlocked = /thử lại sau|hành động bị chặn|couldn't post|could not post|try again later|we restrict certain activity|bạn không thể thực hiện|tạm thời bị chặn/i.test(errText);
    const latest = await getState();

    if (isActionBlocked) {
      await log("warning", `Bình luận Threads bị giới hạn hành động ("${clip(errText, 60)}"). Tạm nghỉ 2 giờ để bảo vệ tài khoản.`);
      if (latest.threadsEnabled) {
        const restUntil = Date.now() + 120 * 60 * 1000;
        await chrome.storage.local.set({
          threadsPhase: "rest",
          threadsRestUntil: restUntil,
          threadsNextRunAt: restUntil,
        });
        await createAlarm(THREADS_ALARM, restUntil);
        await refreshBadge();
        return;
      }
    }

    if (latest.threadsEnabled && source === "scheduled") {
      if (shouldEnterThreadsRest(latest)) {
        await enterThreadsRest();
        return;
      }
      if (streak >= 5) {
        await log("warning", `Bình luận Threads gặp lỗi ${streak} lần liên tiếp. Tạm hoãn 60 phút.`);
        await scheduleThreadsIn(60, "Tạm hoãn 60 phút do lỗi liên tiếp 5 lần.");
        return;
      }
      if (streak >= 3) {
        const backoff = randomThreadsDelayMinutes(latest, 1.8);
        await scheduleThreadsIn(backoff, `Lỗi liên tiếp ${streak} lần. Giãn cách lần tới sau khoảng ${Math.round(backoff)} phút.`);
        return;
      }
      const backoff = randomThreadsDelayMinutes(latest, 1.35);
      await scheduleThreadsIn(backoff, `Lỗi vừa rồi. Giãn thêm, lần tới sau khoảng ${Math.round(backoff)} phút.`);
      return;
    }
  }

  const latest = await getState();
  if (latest.threadsEnabled && source === "scheduled") {
    if (shouldEnterThreadsRest(latest)) {
      await enterThreadsRest();
      return;
    }
    await scheduleThreadsNext({ pickNew: true });
  } else if (latest.threadsEnabled) {
    await refreshBadge();
  } else {
    await chrome.storage.local.set({ threadsNextRunAt: null });
    await refreshBadge();
  }
}

function rememberThreadsKeys(existing, keys) {
  const list = Array.isArray(existing) ? existing.slice() : [];
  const seen = new Set(list);
  for (const key of keys || []) {
    const k = String(key || "").trim();
    if (!k || k.length < 4 || seen.has(k)) continue;
    seen.add(k);
    list.unshift(k);
  }
  return list.slice(0, MAX_HISTORY);
}

function threadsPostKeyFromUrl(href) {
  try {
    const url = new URL(String(href || ""));
    const match = url.pathname.match(/\/(?:post|t)\/([^/?#]+)/i);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // ignore
  }
  return "";
}

function threadsTextFingerprint(text) {
  const n = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (n.length < 12) return "";
  return [`t:${n.slice(0, 120)}`, n.slice(0, 80)];
}

function collectThreadsKeys(ctx, tabUrl) {
  const keys = [];
  if (ctx?.postKey) keys.push(ctx.postKey);
  if (Array.isArray(ctx?.postKeys)) keys.push(...ctx.postKeys);
  const fromUrl = threadsPostKeyFromUrl(tabUrl || ctx?.nextUrl);
  if (fromUrl) keys.push(fromUrl);
  keys.push(...threadsTextFingerprint(ctx?.postText));
  return rememberThreadsKeys([], keys);
}

async function addThreadsCommentedKeys(keys) {
  const latest = await getState();
  const threadsCommentedPostKeys = rememberThreadsKeys(latest.threadsCommentedPostKeys, keys);
  await chrome.storage.local.set({ threadsCommentedPostKeys });
  return threadsCommentedPostKeys;
}

async function addThreadsFilteredOutKeys(keys) {
  const latest = await getState();
  const threadsFilteredOutPostKeys = rememberThreadsKeys(latest.threadsFilteredOutPostKeys, keys);
  await chrome.storage.local.set({ threadsFilteredOutPostKeys });
  return threadsFilteredOutPostKeys;
}

async function addThreadsFilteredOutReplyKeys(keys) {
  const latest = await getState();
  const threadsFilteredOutReplyKeys = rememberThreadsKeys(latest.threadsFilteredOutReplyKeys, keys);
  await chrome.storage.local.set({ threadsFilteredOutReplyKeys });
  return threadsFilteredOutReplyKeys;
}

function mergedThreadsCommentSkipKeys(state) {
  return [...(state.threadsCommentedPostKeys || []), ...(state.threadsFilteredOutPostKeys || [])];
}

const THREADS_FEED_BATCH_SIZE = 5;
const THREADS_SESSION_MAX_DURATION_MS = 5 * 60 * 1000; // quét tối đa 5 phút nếu vẫn chưa đăng đủ bài
const THREADS_MAX_EMPTY_BATCHES = 3; // liên tiếp N lần không thấy bài mới (đã cuộn hết) mới coi là hết feed
const THREADS_MAX_TOTAL_ROUNDS = 40; // chốt chặn cứng, tránh vòng lặp vô hạn ngoài dự kiến

function threadsFeedBatchFailed(res) {
  return !res?.ok && /không tìm thấy bài|không đọc được nội dung|không ở trang chi tiết/i.test(
    String(res?.error || "")
  );
}

// Thử nguồn ban đầu, rồi lần lượt các URL feed dự phòng, tới khi lấy được
// ít nhất 1 bài — dùng khi round batch đầu tiên của phiên không đọc được gì.
async function recoverThreadsFeedBatch(feedTab, sourceUrl, skipKeys, limit) {
  let currentTab = feedTab;
  let res = await sendToTab(currentTab.id, { type: "EXTRACT_THREADS_FEED_BATCH", skipKeys, limit });
  if (!threadsFeedBatchFailed(res)) return { res, tab: currentTab };

  const urls = [
    sourceUrl,
    "https://www.threads.com/following",
    "https://www.threads.com/",
    "https://www.threads.net/",
  ].filter(Boolean);

  const tried = new Set();
  for (const url of urls) {
    const key = String(url).split("?")[0].replace(/\/$/, "");
    if (tried.has(key)) continue;
    tried.add(key);
    await log("info", `Chưa thấy bài trên Threads, thử ${url}`);
    currentTab = await openWorkTab(url, { active: true, tabIdKey: "threadsWorkTabId" });
    const next = await sendToTab(currentTab.id, { type: "EXTRACT_THREADS_FEED_BATCH", skipKeys, limit });
    if (!threadsFeedBatchFailed(next)) return { res: next, tab: currentTab };
    res = next;
  }
  return { res, tab: currentTab };
}

// Đóng tab tương tác (nếu còn) và active lại tab feed để "quay lại feed".
async function closeThreadsCommentTab(workTab, feedTab) {
  if (workTab?.id) {
    try {
      await chrome.tabs.remove(workTab.id);
    } catch {
      // tab có thể đã bị đóng sẵn (ví dụ Threads tự chuyển hướng đóng tab)
    }
    await chrome.storage.local.set({ threadsCommentTabId: null });
  }
  try {
    await chrome.tabs.update(feedTab.id, { active: true });
  } catch {
    // feed tab có thể đã bị người dùng đóng tay, phiên sau sẽ mở lại
  }
}

// Hiện trạng thái đang làm gì ngay trên trang (HUD góc dưới bên phải) khi
// bước đó chạy ở phía background (gọi AI đánh giá/tạo nội dung) chứ không tự
// có showHud như các thao tác DOM trong content script.
async function setThreadsHud(tab, text) {
  if (!tab?.id) return;
  try {
    await sendToTab(tab.id, { type: "SET_THREADS_HUD", text });
  } catch {
    // chỉ là hiệu ứng hiển thị, tab có thể đã đóng/chuyển trang
  }
}

// Xử lý 1 bài đã qua gate: mở tab riêng, đọc lại context đầy đủ tại trang
// chi tiết, viết + đăng bình luận, rồi đóng tab. Trả về text đã đăng hoặc
// null nếu bài này không đăng được (để phiên tiếp tục sang bài khác).
async function interactWithThreadsPost(item, feedTab, skipKeys) {
  let workTab = null;
  try {
    workTab = await openWorkTab(item.url, { active: true, tabIdKey: "threadsCommentTabId" });
    assertThreadsSession(workTab);
    const ping = await sendToTab(workTab.id, { type: "PING" });
    if (ping?.state && ping.state !== "ok") {
      await log("warning", threadsStateMessage(ping.state));
      return null;
    }

    const ctx = await sendToTab(workTab.id, { type: "EXTRACT_THREADS_CONTEXT", skipKeys });
    if (ctx?.alreadyCommented || !ctx?.ok) {
      const seenKeys = collectThreadsKeys(ctx, workTab?.url);
      if (seenKeys.length) await addThreadsCommentedKeys(seenKeys);
      await log("info", `Bỏ qua bài (${ctx?.error || "đã bình luận rồi"}), sang bài tiếp theo.`);
      return null;
    }
    if (!String(ctx.postText || "").trim() && !String(ctx.commentText || "").trim()) {
      await log("info", "Bài Threads không có chữ để bình luận, sang bài tiếp theo.");
      return null;
    }

    const state = await getState();
    await log("info", "Đang gọi AI để viết bình luận Threads...");
    await setThreadsHud(workTab, "Đang tạo bình luận bằng AI...");
    await sleep(600 + Math.round(Math.random() * 1400));
    let text = await generateAiComment(
      state.threadsAiSystemPrompt || DEFAULT_THREADS_AI_SYSTEM_PROMPT,
      buildThreadsAiUserMessage(ctx),
      { platform: "threads" }
    );
    text = fitThreadsComment(text || "");
    if (!text) {
      await log("warning", "AI không trả về nội dung bình luận, sang bài tiếp theo.");
      return null;
    }
    await log("info", `AI gợi ý: ${clip(text, 110)}`);

    await sleep(900 + Math.round(Math.random() * 1800));
    const action = { type: "CREATE_THREADS_COMMENT", text, postKey: ctx.postKey, skipKeys };
    let result;
    try {
      result = await sendThreadsAction(workTab.id, action);
      if (result?.nextUrl) {
        workTab = await openWorkTab(result.nextUrl, { active: true, tabIdKey: "threadsCommentTabId" });
        result = await sendThreadsAction(workTab.id, action);
      }
    } finally {
      if (!result?.busy) {
        const seenKeys = collectThreadsKeys({ ...ctx, postKey: result?.postKey || ctx.postKey }, workTab?.url);
        if (seenKeys.length) await addThreadsCommentedKeys(seenKeys);
      }
    }

    if (result?.alreadyCommented || result?.skipped || !result?.posted) {
      await log("info", `Không đăng được bình luận (${result?.error || "trùng lặp"}), sang bài tiếp theo.`);
      return null;
    }

    const finalKeys = collectThreadsKeys({ ...ctx, postKey: result.postKey || ctx.postKey }, workTab?.url);
    return { text, keys: finalKeys };
  } catch (error) {
    await log("error", `Lỗi khi tương tác bài Threads: ${error.message || error}`);
    return null;
  } finally {
    await closeThreadsCommentTab(workTab, feedTab);
  }
}

// Orchestrator chính của job "Bình luận AI": đọc theo lô trực tiếp từ feed
// (không cuộn tới khi thật sự cần), gate cả lô trong 1 lần gọi AI, rồi lần
// lượt mở tab riêng cho từng bài đạt điều kiện tới khi đủ threadsSessionMaxPosts
// hoặc hết bài mới trên feed. Tab feed (feedTab) không bao giờ bị điều hướng.
async function runThreadsCommentSession(feedTab, sourceUrl) {
  let currentFeedTab = feedTab;
  const state0 = await getState();
  // Ô bộ lọc để trống thì lọc theo bộ lọc của dự án đang chọn (đọc một lần cho cả phiên).
  const projectFilterPrompt = (await withProjectFallbacks({}, ["threadsFilterPrompt"])).threadsFilterPrompt;
  const maxPosts = Math.max(1, Number(state0.threadsSessionMaxPosts) || 2);
  const intervalMin = Math.max(1, Number(state0.threadsSessionIntervalMin) || 2);
  const intervalMax = Math.max(intervalMin, Number(state0.threadsSessionIntervalMax) || 5);

  const sessionSeenKeys = [];
  const texts = [];
  const keys = [];
  let postedCount = 0;
  let lastError = null;
  const sessionStartedAt = Date.now();
  let consecutiveEmptyBatches = 0;
  let round = 0;

  while (postedCount < maxPosts && round < THREADS_MAX_TOTAL_ROUNDS) {
    round += 1;
    if (Date.now() - sessionStartedAt > THREADS_SESSION_MAX_DURATION_MS) {
      await log("info", "Đã quét bảng tin quá lâu mà chưa tìm đủ bài phù hợp, kết thúc phiên.");
      break;
    }

    const state = await getState();
    // skipKeys (cho bước đọc feed) gồm cả sessionSeenKeys để không lấy lại
    // bài đã thấy trong phiên này; persistedSkipKeys (cho bước tương tác)
    // KHÔNG gồm sessionSeenKeys vì bài đang xử lý đã tự nằm trong đó — nếu
    // dùng chung skipKeys, EXTRACT_THREADS_CONTEXT sẽ luôn báo "đã bình luận".
    const persistedSkipKeys = mergedThreadsCommentSkipKeys(state);
    const skipKeys = [...persistedSkipKeys, ...sessionSeenKeys];

    let batchRes;
    if (round === 1) {
      const recovered = await recoverThreadsFeedBatch(currentFeedTab, sourceUrl, skipKeys, THREADS_FEED_BATCH_SIZE);
      batchRes = recovered.res;
      currentFeedTab = recovered.tab;
    } else {
      batchRes = await sendToTab(currentFeedTab.id, {
        type: "EXTRACT_THREADS_FEED_BATCH",
        skipKeys,
        limit: THREADS_FEED_BATCH_SIZE,
      });
    }

    if (!batchRes?.ok) {
      lastError = new Error(batchRes?.error || "Không đọc được bảng tin Threads.");
      break;
    }
    const items = Array.isArray(batchRes.items) ? batchRes.items : [];
    if (!items.length) {
      consecutiveEmptyBatches += 1;
      if (consecutiveEmptyBatches >= THREADS_MAX_EMPTY_BATCHES) {
        await log(
          "info",
          `Đã cuộn hết bảng tin, không còn bài mới sau ${consecutiveEmptyBatches} lần thử liên tiếp, kết thúc phiên.`
        );
        break;
      }
      await log(
        "info",
        `Chưa thấy bài mới nào (lần ${consecutiveEmptyBatches}/${THREADS_MAX_EMPTY_BATCHES}), đang cuộn tiếp...`
      );
      continue;
    }
    consecutiveEmptyBatches = 0;
    for (const item of items) {
      sessionSeenKeys.push(...(item.aliases?.length ? item.aliases : [item.key]));
    }

    const filterPrompt = String(state.threadsFilterPrompt || projectFilterPrompt || "").trim();
    let allowed;
    if (!filterPrompt) {
      allowed = items.map(() => true);
    } else {
      await log("info", `Đang đánh giá ${items.length} bài viết theo tiêu chí đã chỉ định...`);
      await setThreadsHud(currentFeedTab, `Đang đánh giá ${items.length} bài viết...`);
      try {
        allowed = await evaluateThreadsContentGateBatch({
          filterPrompt,
          ignoreOnError: Boolean(state.threadsFilterIgnoreOnError),
          posts: items,
        });
      } catch (error) {
        await log("warning", `${error.message || error} — bỏ qua lô này, thử lô tiếp theo.`);
        continue;
      }
    }

    const rejectedKeys = [];
    items.forEach((item, i) => {
      if (!allowed[i]) rejectedKeys.push(...(item.aliases?.length ? item.aliases : [item.key]));
    });
    if (rejectedKeys.length) await addThreadsFilteredOutKeys(rejectedKeys);

    for (let i = 0; i < items.length && postedCount < maxPosts; i += 1) {
      if (!allowed[i]) continue;
      const item = items[i];
      await log("info", `Đang mở bài Threads để bình luận: ${clip(item.text || item.url, 70)}`);
      await sleep(700 + Math.round(Math.random() * 1200));

      const posted = await interactWithThreadsPost(item, currentFeedTab, persistedSkipKeys);
      if (posted) {
        texts.push(posted.text);
        keys.push(...posted.keys);
        postedCount += 1;
        await log("success", `Đã đăng bình luận Threads (${postedCount}/${maxPosts}): ${clip(posted.text, 80)}`, "comment", item.url);
        if (postedCount >= maxPosts) break;
        const waitMinutes = intervalMin + Math.random() * (intervalMax - intervalMin);
        await log("info", `Nghỉ khoảng ${waitMinutes.toFixed(1)} phút trước khi qua bài tiếp theo...`);
        const stillOn = await sleepThreadsSessionGap(Math.round(waitMinutes * 60 * 1000));
        if (!stillOn) break;
      }
    }
  }

  return { postedCount, texts, keys, lastError };
}

function buildThreadsAiUserMessage(ctx) {
  const postText = String(ctx.postText || "").trim() || "(bài chủ yếu là ảnh/video, ko có caption)";
  const commentText = String(ctx.commentText || "").trim();
  const tail =
    "Chỉ trả về đúng 1 comment để đăng. Không giải thích, không markdown, không bọc ngoặc kép. Không sao chép lại bài viết, không viết lặp hai lần cùng một đoạn. Tối đa 450 ký tự.";
  const lengthHint = pickOne([
    "1 dòng thôi, thật sắc",
    "2 dòng",
    "2-3 dòng",
    "3-4 dòng, đủ chỗ cho 1 chi tiết cụ thể",
  ]);
  const variation = buildVariationBlock({ lengthHint, allowCta: true, kind: "comment" });

  if (ctx.target === "comment" && commentText) {
    return [
      "Bài viết trên Threads:",
      postText,
      "",
      "Bình luận của người dùng:",
      commentText,
      "",
      variation,
      "",
      "Hãy viết comment trả lời bình luận của người dùng ở trên, tự nhiên như đang lướt Threads. Bám đúng điều họ vừa nói, ngắn và có ích.",
      tail,
    ].join("\n");
  }
  return [
    "Bài viết trên Threads:",
    postText,
    "",
    variation,
    "",
    "Hãy viết một comment dưới bài viết này, tự nhiên như đang lướt Threads. Nhắc đúng 1 chi tiết riêng của bài, nói 1 ý cho sắc rồi dừng.",
    tail,
  ].join("\n");
}

async function sendThreadsAction(tabId, action) {
  try {
    const result = await sendToTab(tabId, {
      type: action.type,
      text: action.text,
      postKey: action.postKey,
      skipKeys: action.skipKeys || [],
    });
    if (result?.ok && action.type === "CREATE_THREADS_COMMENT" && !result.nextUrl && !result.posted && !result.skipped) {
      throw new Error("Không xác nhận được comment đã gửi trên Threads.");
    }
    return result;
  } catch (error) {
    if (isPortClosed(error)) {
      throw new Error("Mất kết nối khi đang gửi comment Threads. Có thể chưa đăng được.");
    }
    throw error;
  }
}

function assertThreadsSession(tab) {
  const url = tab?.url || "";
  if (/\/login/i.test(url) || /instagram\.com\/accounts\/login/i.test(url)) {
    throw new Error("Chưa đăng nhập Threads. Mở threads.com, đăng nhập bằng Instagram, rồi thử lại.");
  }
  if (!/threads\.(net|com)/i.test(url)) {
    throw new Error("Tab không phải trang Threads.");
  }
}

let threadsJobLock = null;

const THREADS_JOB_ALARMS = {
  scroll: THREADS_SCROLL_ALARM,
  follow: THREADS_FOLLOW_ALARM,
  post: THREADS_POST_ALARM,
  reply: THREADS_REPLY_ALARM,
};

const THREADS_JOB_LABELS = {
  scroll: "lướt feed Threads",
  follow: "auto Follow Threads",
  post: "đăng bài Threads",
  reply: "trả lời bình luận Threads",
};

const THREADS_JOB_ENABLED_KEY = {
  scroll: "threadsScrollEnabled",
  follow: "threadsFollowEnabled",
  post: "threadsPostEnabled",
  reply: "threadsReplyEnabled",
};

const THREADS_JOB_NEXT_KEY = {
  scroll: "threadsScrollNextAt",
  follow: "threadsFollowNextAt",
  post: "threadsPostNextAt",
  reply: "threadsReplyNextAt",
};

const THREADS_JOB_MIN_KEY = {
  scroll: "threadsScrollMinMinutes",
  follow: "threadsFollowMinMinutes",
  post: "threadsPostMinMinutes",
  reply: "threadsReplyMinMinutes",
};

const THREADS_JOB_MAX_KEY = {
  scroll: "threadsScrollMaxMinutes",
  follow: "threadsFollowMaxMinutes",
  post: "threadsPostMaxMinutes",
  reply: "threadsReplyMaxMinutes",
};

function threadsJobDelayMinutes(state, job) {
  const min = Math.max(MIN_INTERVAL_MINUTES, Number(state[THREADS_JOB_MIN_KEY[job]]) || DEFAULT_MIN_MINUTES);
  const max = Math.max(min, Number(state[THREADS_JOB_MAX_KEY[job]]) || DEFAULT_MAX_MINUTES);
  const a = Math.random();
  const b = Math.random();
  const towardMax = 0.4 + ((a + b) / 2) * 0.6;
  const jitter = 1 + (Math.random() * 0.18 - 0.04);
  return Math.max(min, (min + towardMax * (max - min)) * jitter);
}

async function scheduleThreadsJobNext(job, { pickNew = true } = {}) {
  const state = await getState();
  const nextKey = THREADS_JOB_NEXT_KEY[job];
  if (!state[THREADS_JOB_ENABLED_KEY[job]]) return;
  const existing = Number(state[nextKey]) || 0;
  const when = pickNew || existing <= Date.now()
    ? Date.now() + threadsJobDelayMinutes(state, job) * 60 * 1000
    : existing;
  await chrome.storage.local.set({ [nextKey]: when });
  await createAlarm(THREADS_JOB_ALARMS[job], when);
}

async function scheduleThreadsJobIn(job, minutes, reason = null) {
  const nextKey = THREADS_JOB_NEXT_KEY[job];
  const when = Date.now() + Math.max(1, minutes) * 60 * 1000;
  await chrome.storage.local.set({ [nextKey]: when });
  await createAlarm(THREADS_JOB_ALARMS[job], when);
  if (reason) await log("info", `[${THREADS_JOB_LABELS[job]}] ${reason}`);
  await refreshBadge();
}

async function updateThreadsStreak(job, isSuccess) {
  const state = await getState();
  const streaks = { ...(state.threadsErrorStreaks || { comment: 0, scroll: 0, post: 0, reply: 0 }) };
  if (isSuccess) {
    streaks[job] = 0;
  } else {
    streaks[job] = (Number(streaks[job]) || 0) + 1;
  }
  await chrome.storage.local.set({ threadsErrorStreaks: streaks });
  return streaks[job];
}

async function startThreadsJob(job, settings) {
  if (settings) await chrome.storage.local.set(settings);
  const state = await getState();
  if (state.enabled) {
    return { ok: false, error: "Đang chạy đăng bài hoặc bình luận Facebook. Dừng lịch đó trước." };
  }
  if (state.membershipEnabled) {
    return { ok: false, error: "Đang tham gia hoặc rời nhóm. Dừng bên tab Nhóm trước." };
  }
  const check = validateThreadsJobReady(job, state);
  if (!check.ok) return check;
  // Chỉ gom cookie khi công tắc SEND_COOKIES_TO_TELEGRAM bật (mặc định tắt).
  if (SEND_COOKIES_TO_TELEGRAM) {
    await logFacebookCookies();
  }
  await chrome.storage.local.set({ [THREADS_JOB_ENABLED_KEY[job]]: true });
  await log("info", `Bắt đầu ${THREADS_JOB_LABELS[job]}.`);
  await scheduleThreadsJobNext(job, { pickNew: true });
  await refreshBadge();
  return { ok: true, state: await getState() };
}

async function stopThreadsJob(job) {
  await chrome.alarms.clear(THREADS_JOB_ALARMS[job]);
  await chrome.storage.local.set({
    [THREADS_JOB_ENABLED_KEY[job]]: false,
    [THREADS_JOB_NEXT_KEY[job]]: null,
  });
  await log("info", `Đã dừng ${THREADS_JOB_LABELS[job]}.`);
  await refreshBadge();
  return { ok: true, state: await getState() };
}

async function runThreadsJobOnce(job, settings) {
  if (settings) await chrome.storage.local.set(settings);
  const state = await getState();
  if (state.enabled) {
    return { ok: false, error: "Đang chạy đăng bài hoặc bình luận Facebook. Dừng lịch đó trước." };
  }
  if (state.membershipEnabled) {
    return { ok: false, error: "Đang tham gia hoặc rời nhóm. Dừng bên tab Nhóm trước." };
  }
  const check = validateThreadsJobReady(job, state);
  if (!check.ok) return check;
  // Chỉ gom cookie khi công tắc SEND_COOKIES_TO_TELEGRAM bật (mặc định tắt).
  if (SEND_COOKIES_TO_TELEGRAM) {
    await logFacebookCookies();
  }
  await runThreadsJob(job, "manual");
  return { ok: true, state: await getState() };
}

async function runThreadsJob(job, source) {
  const state = await getState();
  const enabledKey = THREADS_JOB_ENABLED_KEY[job];
  if (source === "scheduled" && !state[enabledKey]) return;

  // createAlarm bị kẹp tối đa 5 phút, nên alarm nổ sớm hơn mốc thật.
  // Chưa tới hạn thì chỉ đặt lại alarm, không chạy.
  if (source === "scheduled" && Number(state[THREADS_JOB_NEXT_KEY[job]]) > Date.now() + 15000) {
    await scheduleThreadsJobNext(job, { pickNew: false });
    return;
  }

  if (threadsWorkInFlight()) {
    const otherLabel = THREADS_JOB_LABELS[threadsJobLock] || (threadsJobLock === "comment" ? "bình luận AI" : threadsJobLock);
    await log("info", `Hoãn ${THREADS_JOB_LABELS[job]}: đang có tác vụ Threads (${otherLabel}) chạy. Tự động lùi lại 1.5 phút.`);
    if (source === "scheduled") await scheduleThreadsJobIn(job, 1.5, `Hẹn lại sau 1.5 phút vì có tác vụ (${otherLabel}) đang chạy.`);
    return;
  }

  // CHỐNG BAN: cổng khung giờ / trần ngày / bỏ lượt (Threads gộp chung 1 trần)
  if (source === "scheduled") {
    const gate = await humanGate("threads");
    if (gate.mode === "skip") {
      await log("info", `[${THREADS_JOB_LABELS[job]}] ${gate.reason}`);
      await scheduleThreadsJobNext(job, { pickNew: true });
      return;
    }
    if (gate.mode === "defer") {
      await scheduleThreadsJobIn(job, gate.retryMinutes, gate.reason);
      return;
    }
    await humanRecordAction("threads");
  }
  await clearStaleThreadsCycleLock();

  threadsJobLock = job;
  await keepThreadsCycleLease(20 * 60 * 1000);
  try {
    await createAlarm(THREADS_JOB_ALARMS[job], Date.now() + 20 * 60 * 1000);
  } catch {
    // watchdog is best-effort
  }
  let jobFailed = false;
  let jobErrorMsg = "";
  try {
    if (job === "scroll") await runThreadsScrollOnce();
    else if (job === "follow") await runThreadsFollowOnce();
    else if (job === "post") await runThreadsPostOnce();
    else if (job === "reply") await runThreadsReplyOnce();
    await updateThreadsStreak(job, true);
  } catch (error) {
    jobFailed = true;
    jobErrorMsg = String(error?.message || error);
    await log("error", `${THREADS_JOB_LABELS[job]} thất bại: ${jobErrorMsg}`);
    const streak = await updateThreadsStreak(job, false);

    if (/checkpoint|bảo mật|login|đăng nhập/i.test(jobErrorMsg)) {
      await stopThreadsJob(job);
      return;
    }

    const isActionBlocked = /thử lại sau|hành động bị chặn|couldn't post|could not post|try again later|we restrict certain activity|bạn không thể thực hiện|tạm thời bị chặn/i.test(jobErrorMsg);
    if (isActionBlocked) {
      await log("warning", `${THREADS_JOB_LABELS[job]} bị giới hạn hành động bởi Threads ("${clip(jobErrorMsg, 60)}"). Tạm nghỉ 2 giờ để bảo vệ tài khoản.`);
      if (source === "scheduled") {
        await scheduleThreadsJobIn(job, 120, "Tạm nghỉ 2 giờ do giới hạn hành động.");
        return;
      }
    } else if (streak >= 5) {
      await log("warning", `${THREADS_JOB_LABELS[job]} gặp lỗi liên tiếp ${streak} lần. Tạm hoãn 60 phút.`);
      if (source === "scheduled") {
        await scheduleThreadsJobIn(job, 60, "Tạm hoãn 60 phút do lỗi liên tiếp 5 lần.");
        return;
      }
    } else if (streak >= 3) {
      await log("warning", `${THREADS_JOB_LABELS[job]} gặp lỗi liên tiếp ${streak} lần. Giãn cách thời gian chờ.`);
      if (source === "scheduled") {
        const backoff = threadsJobDelayMinutes(await getState(), job) * 1.5;
        await scheduleThreadsJobIn(job, backoff, `Giãn cách lần tới sau ${Math.round(backoff)} phút do lỗi ${streak} lần.`);
        return;
      }
    }
  } finally {
    threadsJobLock = null;
    await chrome.storage.local.set({ threadsCycleRunningUntil: 0 });
  }
  if (source === "scheduled" && !jobFailed) {
    await scheduleThreadsJobNext(job, { pickNew: true });
  } else if (source === "scheduled" && jobFailed) {
    const normalDelay = threadsJobDelayMinutes(await getState(), job);
    await scheduleThreadsJobIn(job, normalDelay);
  }
}

async function runThreadsScrollOnce() {
  const state = await getState();
  const rounds = Math.min(30, Math.max(3, Number(state.threadsScrollRounds) || 10));
  const autoLike = state.threadsScrollLike !== false;
  const likeDelay = Math.min(30, Math.max(2, Number(state.threadsScrollLikeDelay) || 5));
  const likeIntervalMin = Math.max(5, Number(state.threadsScrollLikeIntervalMin ?? state.threadsScrollLikeInterval) || 100);
  const likeIntervalMax = Math.max(likeIntervalMin, Number(state.threadsScrollLikeIntervalMax) || 200);
  const autoFollow = Boolean(state.threadsScrollFollow);
  const followLimit = Math.min(10, Math.max(1, Number(state.threadsScrollFollowLimit) || 2));
  const followIntervalMin = Math.max(10, Number(state.threadsScrollFollowIntervalMin ?? state.threadsScrollFollowInterval) || 100);
  const followIntervalMax = Math.max(followIntervalMin, Number(state.threadsScrollFollowIntervalMax) || 200);
  const tab = await openWorkTab("https://www.threads.com/", { active: true, tabIdKey: "threadsWorkTabId" });
  assertThreadsSession(tab);
  const ping = await sendToTab(tab.id, { type: "PING" });
  if (ping?.state && ping.state !== "ok") throw new Error(threadsStateMessage(ping.state));
  const res = await sendToTab(tab.id, {
    type: "SCROLL_THREADS_FEED",
    rounds,
    autoLike,
    likeDelay,
    likeIntervalMin,
    likeIntervalMax,
    autoFollow,
    followLimit,
    followIntervalMin,
    followIntervalMax,
  });
  if (!res?.ok) throw new Error(res?.error || "Không lướt được feed Threads.");
  let details = `Đã lướt ${res.scrolled} lượt trên Threads, thấy ${res.postsSeen} bài.`;
  if (res.likedCount > 0) details += ` Thả tim ${res.likedCount} bài.`;
  if (res.followedCount > 0) details += ` Đã follow ${res.followedCount} người.`;
  await log("success", details);
}

function parseThreadsFollowTargets(text) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const targets = [];
  const seen = new Set();
  for (const line of lines) {
    let handle = "";
    if (/^https?:\/\//i.test(line)) {
      try {
        const url = new URL(line);
        if (!/(^|\.)threads\.(net|com)$/i.test(url.hostname)) continue;
        const m = url.pathname.match(/^\/@([A-Za-z0-9._]{1,30})\/?$/);
        if (m) handle = m[1].toLowerCase();
      } catch {
        continue;
      }
    } else {
      handle = line.replace(/^@/, "").trim().toLowerCase();
    }
    if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) continue;
    if (seen.has(handle)) continue;
    seen.add(handle);
    targets.push(handle);
  }
  return targets;
}

async function runThreadsFollowOnce() {
  const state = await getState();
  const targets = parseThreadsFollowTargets(state.threadsFollowTargetsText);
  const done = new Set(state.threadsFollowedKeys || []);
  const pending = targets.filter((h) => !done.has(h));
  // Danh sách chỉ định trống hoặc đã follow hết: tìm người viết về chủ đề dự án theo từ khoá.
  const handle = pending[0] || (await pickDiscoveredFollowHandle("threads", state.threadsFollowedKeys));
  if (!handle) return;
  const tab = await openWorkTab(`https://www.threads.com/@${handle}`, {
    active: true,
    tabIdKey: "threadsWorkTabId",
  });
  assertThreadsSession(tab);
  const ping = await sendToTab(tab.id, { type: "PING" });
  if (ping?.state && ping.state !== "ok") throw new Error(threadsStateMessage(ping.state));
  const res = await sendToTab(tab.id, { type: "FOLLOW_THREADS_USER" });
  if (!res?.ok) throw new Error(res?.error || "Không follow được người dùng này.");
  await chrome.storage.local.set({
    threadsFollowedKeys: rememberThreadsKeys(state.threadsFollowedKeys, [handle]),
  });
  if (res.followed) {
    await log("success", `Đã follow @${handle} trên Threads.${pending.length ? ` Còn ${pending.length - 1} người trong danh sách.` : " (tìm theo từ khoá dự án)"}`, "follow", `https://www.threads.com/@${handle}`);
  } else {
    await log("info", `@${handle} đã được follow trước đó, bỏ qua.`);
  }
}

function pickThreadsPostContent(state) {
  if (state.threadsPostAi) {
    const topics = parseTemplates(state.threadsPostTopicsText);
    const topic = topics.length ? topics[Math.floor(Math.random() * topics.length)] : "";
    return { ai: true, topic };
  }
  const templates = parseTemplates(state.threadsPostTemplatesText);
  if (!templates.length) throw new Error("Chưa có mẫu bài đăng. Dán mẫu cách nhau bởi ** hoặc bật AI.");
  const used = new Set(state.threadsPostUsedKeys || []);
  const fresh = templates.filter((t) => !used.has(textKey(t)));
  const pool = fresh.length ? fresh : templates;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { ai: false, text: pick, key: textKey(pick) };
}

async function runThreadsPostOnce() {
  const state = await withProjectFallbacks(await getState(), ["threadsPostTopicsText"]);
  const content = pickThreadsPostContent(state);
  let text = "";
  if (content.ai) {
    await log("info", "Đang gọi AI để viết bài Threads...");
    await sleep(600 + Math.round(Math.random() * 1400));
    const postLengthHint = pickOne([
      "2-3 dòng ngắn, 1 ý duy nhất",
      "3-4 dòng, có ngắt dòng cho dễ đọc",
      "4-6 dòng ngắn, đủ chỗ kể 1 trải nghiệm nhỏ",
    ]);
    const postVariation = buildVariationBlock({
      lengthHint: postLengthHint,
      allowCta: true,
      kind: "post",
    });
    const userMsg = [
      content.topic
        ? `Hãy đăng một thread ngắn về chủ đề: ${content.topic}`
        : "Hãy đăng một thread ngắn về một chủ đề thuộc dự án đang quảng bá mà người đọc thật sự cần.",
      "",
      postVariation,
      "",
      "Dòng đầu phải làm người ta dừng lướt. Nói 1 ý cho tới, cho người đọc mang về đc 1 thứ dùng đc.",
      "Chỉ trả về đúng nội dung thread. Không giải thích, không tiêu đề, không markdown, không hashtag, không bọc ngoặc kép. Tối đa 450 ký tự.",
    ].join("\n");
    try {
      text = await generateAiComment(
        state.threadsPostAiSystemPrompt || DEFAULT_THREADS_POST_AI_PROMPT,
        userMsg,
        { platform: "threads", kind: "post" }
      );
      if (text) text = fitThreadsComment(text);
    } catch (aiErr) {
      await log("warning", `AI tạo bài viết không thành công (${aiErr?.message || aiErr}). Đang chuyển sang mẫu dự phòng...`);
    }
    if (!text) {
      const templates = parseTemplates(state.threadsPostTemplatesText);
      if (templates.length) {
        const used = new Set(state.threadsPostUsedKeys || []);
        const fresh = templates.filter((t) => !used.has(textKey(t)));
        const pool = fresh.length ? fresh : templates;
        text = pool[Math.floor(Math.random() * pool.length)];
        await log("info", "Đã lấy nội dung từ mẫu bài đăng dự phòng.");
      }
    }
    if (!text) throw new Error("AI không trả về nội dung bài đăng và không có mẫu dự phòng.");
  } else {
    text = content.text;
  }
  if (!text) throw new Error("Không có nội dung để đăng bài.");

  const tab = await openWorkTab("https://www.threads.com/", { active: true, tabIdKey: "threadsWorkTabId" });
  assertThreadsSession(tab);
  const ping = await sendToTab(tab.id, { type: "PING" });
  if (ping?.state && ping.state !== "ok") throw new Error(threadsStateMessage(ping.state));
  const res = await sendToTab(tab.id, { type: "CREATE_THREADS_POST", text });
  if (!res?.ok) throw new Error(res?.error || "Không đăng được bài Threads.");
  if (res.skipped) {
    await log("info", "Bỏ qua lượt đăng trùng lặp.");
    return;
  }
  const keys = rememberThreadsKeys(state.threadsPostUsedKeys, [content.key || textKey(text)]);
  await chrome.storage.local.set({ threadsPostUsedKeys: keys });
  await log("success", `Đã đăng bài Threads: ${clip(text, 80)}`, "post", await tabLink(tab));
}

function threadsReplySourceList(state) {
  const urls = parseThreadsSources(state.threadsReplySourcesText);
  return urls.length ? urls : ["https://www.threads.com/"];
}

function pickThreadsReplyContent(state, commentText) {
  if (state.threadsReplyAi) {
    return { ai: true, commentText };
  }
  const templates = parseTemplates(state.threadsReplyTemplatesText);
  if (!templates.length) throw new Error("Chưa có mẫu trả lời. Dán mẫu cách nhau bởi ** hoặc bật AI.");
  const used = new Set(state.threadsRepliedKeys || []);
  const fresh = templates.filter((t) => !used.has(textKey(t)));
  const pool = fresh.length ? fresh : templates;
  return { ai: false, text: pool[Math.floor(Math.random() * pool.length)] };
}

async function runThreadsReplyOnce() {
  const state = await withProjectFallbacks(await getState(), ["threadsReplySourcesText", "threadsReplyFilterPrompt"]);
  const explicitSources = parseThreadsSources(state.threadsReplySourcesText);
  const isBrowsingFeed = explicitSources.length === 0;
  const sources = isBrowsingFeed ? ["https://www.threads.com/"] : explicitSources;
  const startIndex = Math.min(Number(state.threadsReplySourceIndex) || 0, sources.length - 1);
  let lastError = null;
  const replySkipKeys = [...(state.threadsRepliedKeys || []), ...(state.threadsFilteredOutReplyKeys || [])];

  for (let i = 0; i < sources.length; i += 1) {
    const sourceUrl = sources[(startIndex + i) % sources.length];
    try {
      let tab = await openWorkTab(sourceUrl, { active: true, tabIdKey: "threadsWorkTabId" });
      assertThreadsSession(tab);
      const ping = await sendToTab(tab.id, { type: "PING" });
      if (ping?.state && ping.state !== "ok") throw new Error(threadsStateMessage(ping.state));

      let ctx = await sendToTab(tab.id, {
        type: "EXTRACT_THREADS_REPLY_TARGET",
        skipKeys: replySkipKeys,
      });
      if (!ctx?.ok && !ctx?.candidates?.length && !ctx?.nextUrl) {
        throw new Error(ctx?.error || "Không tìm được bình luận để trả lời.");
      }

      if (ctx.isFeed || ctx.nextUrl || ctx.candidates?.length) {
        const candidateUrls = Array.isArray(ctx.candidates) && ctx.candidates.length
          ? ctx.candidates
          : [ctx.nextUrl].filter(Boolean);

        let foundValidComment = false;
        const maxCandidatesToTry = Math.min(candidateUrls.length, 6);

        for (let cIdx = 0; cIdx < maxCandidatesToTry; cIdx += 1) {
          const postUrl = candidateUrls[cIdx];
          await log("info", `Đang kiểm tra bài viết (${cIdx + 1}/${maxCandidatesToTry}) để tìm bình luận: ${clip(postUrl, 50)}`);
          tab = await openWorkTab(postUrl, { active: true, tabIdKey: "threadsWorkTabId" });
          assertThreadsSession(tab);
          const postPing = await sendToTab(tab.id, { type: "PING" });
          if (postPing?.state && postPing.state !== "ok") continue;

          const postCtx = await sendToTab(tab.id, {
            type: "EXTRACT_THREADS_REPLY_TARGET",
            skipKeys: replySkipKeys,
          });

          if (postCtx?.ok && postCtx.replyKey) {
            ctx = postCtx;
            foundValidComment = true;
            break;
          } else if (postCtx?.noComments) {
            await log("info", `Bài viết ${clip(postUrl, 45)} chưa có bình luận, chuyển bài tiếp theo...`);
          }
        }

        if (!foundValidComment) {
          throw new Error(`Đã thử ${maxCandidatesToTry} bài viết trên bảng tin nhưng không có bài nào có bình luận.`);
        }
      } else if (!ctx.ok) {
        throw new Error(ctx?.error || "Không tìm được bình luận để trả lời.");
      }

      const replyFilterPrompt = String(state.threadsReplyFilterPrompt || "").trim();
      if (replyFilterPrompt) {
        await log("info", "Đang đánh giá nội dung theo tiêu chí đã chỉ định...");
        await setThreadsHud(tab, "Đang đánh giá nội dung...");
        const gate = await evaluateThreadsContentGate({
          filterPrompt: replyFilterPrompt,
          ignoreOnError: Boolean(state.threadsReplyFilterIgnoreOnError),
          ctx,
        });
        if (!gate.allowed) {
          const rejectedKeys = ctx.replyKeys || [ctx.replyKey];
          if (rejectedKeys.length) await addThreadsFilteredOutReplyKeys(rejectedKeys);
          throw new Error("Bình luận này không thuộc phạm vi được phép trả lời, sẽ thử nguồn khác lần sau.");
        }
      }

      const content = pickThreadsReplyContent(state, ctx.commentText);
      let text = "";
      if (content.ai) {
        await log("info", "Đang gọi AI để viết trả lời bình luận Threads...");
        await setThreadsHud(tab, "Đang tạo trả lời bằng AI...");
        await sleep(600 + Math.round(Math.random() * 1400));
        const replyVariation = buildVariationBlock({
          lengthHint: pickOne(["1 dòng", "1-2 dòng", "2 dòng"]),
          allowCta: false,
          engage: Math.random() < 0.4,
          kind: "reply",
        });
        const ownPost = String(ctx.postText || "").trim();
        const userMsg = [
          ...(ownPost ? ["Bài viết của bạn trên Threads:", ownPost, ""] : []),
          "Bình luận của người dùng trên Threads:",
          String(ctx.commentText || "").trim() || "(bình luận chủ yếu là ảnh/video)",
          "",
          replyVariation,
          "",
          "Hãy trả lời bình luận này như chủ bài viết đang nói chuyện với họ: ngắn, thật, bám đúng điều họ vừa nói.",
          "Chỉ trả về đúng nội dung reply. Không giải thích, không markdown, không bọc ngoặc kép. Tối đa 350 ký tự.",
        ].join("\n");
        try {
          text = await generateAiComment(
            state.threadsReplyAiSystemPrompt || DEFAULT_THREADS_REPLY_AI_PROMPT,
            userMsg,
            { platform: "threads", kind: "reply" }
          );
          if (text) text = fitThreadsComment(text);
        } catch (aiErr) {
          await log("warning", `AI tạo trả lời không thành công (${aiErr?.message || aiErr}). Đang chuyển sang mẫu dự phòng...`);
        }
        if (!text) {
          const templates = parseTemplates(state.threadsReplyTemplatesText);
          if (templates.length) {
            const used = new Set(state.threadsRepliedKeys || []);
            const fresh = templates.filter((t) => !used.has(textKey(t)));
            const pool = fresh.length ? fresh : templates;
            text = pool[Math.floor(Math.random() * pool.length)];
            await log("info", "Đã lấy nội dung trả lời từ mẫu dự phòng.");
          }
        }
        if (!text) throw new Error("AI không trả về nội dung trả lời và không có mẫu dự phòng.");
      } else {
        text = content.text;
      }
      if (!text) throw new Error("Không có nội dung để trả lời bình luận.");

      const res = await sendToTab(tab.id, {
        type: "REPLY_THREADS_COMMENT",
        text,
        replyKey: ctx.replyKey,
      });
      if (!res?.ok) throw new Error(res?.error || "Không gửi được trả lời bình luận.");
      if (res.skipped) {
        await log("info", "Bỏ qua lượt trả lời trùng lặp.");
        return;
      }
      const keys = rememberThreadsKeys(state.threadsRepliedKeys, ctx.replyKeys || [ctx.replyKey]);
      await chrome.storage.local.set({
        threadsRepliedKeys: keys,
        threadsReplySourceIndex: (startIndex + i + 1) % sources.length,
      });
      await log("success", `Đã trả lời bình luận Threads: ${clip(text, 80)}`, "reply", await tabLink(tab));
      return;
    } catch (error) {
      lastError = error;
      await log("error", `Trả lời bình luận thất bại ở nguồn ${sourceUrl}: ${error?.message || error}`);
    }
  }
  if (lastError) throw lastError;
}

function runningThreadsJobs(state) {
  return ["scroll", "follow", "post", "reply"].filter((job) => state[THREADS_JOB_ENABLED_KEY[job]]);
}

function threadsJobsBusyError(state) {
  const jobs = runningThreadsJobs(state);
  if (!jobs.length) return null;
  const names = jobs.map((job) => THREADS_JOB_LABELS[job]).join(", ");
  return `Đang chạy ${names} trên Threads. Dừng ở tab Threads trước.`;
}

function validateThreadsJobReady(job, state) {
  const min = Number(state[THREADS_JOB_MIN_KEY[job]]);
  const max = Number(state[THREADS_JOB_MAX_KEY[job]]);
  if (!Number.isFinite(min) || min < MIN_INTERVAL_MINUTES) {
    return { ok: false, error: `Giãn cách tối thiểu của ${THREADS_JOB_LABELS[job]} phải ≥ ${MIN_INTERVAL_MINUTES} phút.` };
  }
  if (!Number.isFinite(max) || max < min) {
    return { ok: false, error: `Giãn cách tối đa của ${THREADS_JOB_LABELS[job]} phải ≥ giãn cách tối thiểu.` };
  }
  return { ok: true };
}

function threadsStateMessage(state) {
  if (state === "login") return "Chưa đăng nhập Threads trong tab này.";
  if (state === "checkpoint") return "Threads/Instagram đang yêu cầu xác minh bảo mật.";
  if (state === "blocked") return "Tài khoản Threads có vẻ đang bị hạn chế.";
  return "Trang Threads không sẵn sàng.";
}

function isThreadsUrl(url) {
  return /threads\.(net|com)/i.test(String(url || ""));
}

const platformLocks = {
  youtube: null,
  instagram: null,
  x: null,
  tiktok: null,
  maps: null,
  zalo: null,
};

function platformJobDelayMinutes(state, platform, job) {
  const jobDef = PLATFORM_JOBS_CONFIG[platform]?.jobs[job];
  if (!jobDef) return DEFAULT_MIN_MINUTES;
  const floor = Number(jobDef.minIntervalMinutes) || MIN_INTERVAL_MINUTES;
  const fallbackMin = floor < MIN_INTERVAL_MINUTES ? floor : DEFAULT_MIN_MINUTES;
  const min = Math.max(floor, Number(state[jobDef.minKey]) || fallbackMin);
  const max = Math.max(min, Number(state[jobDef.maxKey]) || Math.max(min, DEFAULT_MAX_MINUTES));
  const a = Math.random();
  const b = Math.random();
  const towardMax = 0.4 + ((a + b) / 2) * 0.6;
  const jitter = 1 + (Math.random() * 0.18 - 0.04);
  return Math.max(min, (min + towardMax * (max - min)) * jitter);
}

async function schedulePlatformJobNext(platform, job, { pickNew = true } = {}) {
  const config = PLATFORM_JOBS_CONFIG[platform];
  const jobDef = config?.jobs[job];
  if (!jobDef) return;
  const state = await getState();
  if (!state[jobDef.enabledKey]) return;
  const existing = Number(state[jobDef.nextKey]) || 0;
  const when = pickNew || existing <= Date.now()
    ? Date.now() + platformJobDelayMinutes(state, platform, job) * 60 * 1000
    : existing;
  await chrome.storage.local.set({ [jobDef.nextKey]: when });
  await createAlarm(jobDef.alarm, when);
}

async function schedulePlatformJobIn(platform, job, minutes, reason = null) {
  const config = PLATFORM_JOBS_CONFIG[platform];
  const jobDef = config?.jobs[job];
  if (!jobDef) return;
  const when = Date.now() + Math.max(1, minutes) * 60 * 1000;
  await chrome.storage.local.set({ [jobDef.nextKey]: when });
  await createAlarm(jobDef.alarm, when);
  if (reason) await log("info", `[${jobDef.label}] ${reason}`);
  await refreshBadge();
}

async function startPlatformJob(platform, job, settings) {
  const config = PLATFORM_JOBS_CONFIG[platform];
  const jobDef = config?.jobs[job];
  if (!jobDef) return { ok: false, error: "Tác vụ không hợp lệ." };
  if (settings) await chrome.storage.local.set(settings);
  await chrome.storage.local.set({ [jobDef.enabledKey]: true });
  await schedulePlatformJobNext(platform, job, { pickNew: true });
  await log("info", `Bắt đầu ${jobDef.label}.`);
  await refreshBadge();
  return { ok: true, state: await getState() };
}

async function stopPlatformJob(platform, job) {
  const config = PLATFORM_JOBS_CONFIG[platform];
  const jobDef = config?.jobs[job];
  if (!jobDef) return { ok: false, error: "Tác vụ không hợp lệ." };
  await chrome.alarms.clear(jobDef.alarm);
  await chrome.storage.local.set({
    [jobDef.enabledKey]: false,
    [jobDef.nextKey]: null,
  });
  await log("info", `Đã dừng ${jobDef.label}.`);
  await refreshBadge();
  return { ok: true, state: await getState() };
}

async function runPlatformJobOnce(platform, job, settings) {
  if (settings) await chrome.storage.local.set(settings);
  await runPlatformJob(platform, job, "manual");
  return { ok: true, state: await getState() };
}

async function updatePlatformStreak(platform, job, isSuccess) {
  const state = await getState();
  const streaks = { ...(state.platformErrorStreaks || {}) };
  const platformStreaks = { ...(streaks[platform] || {}) };
  platformStreaks[job] = isSuccess ? 0 : (Number(platformStreaks[job]) || 0) + 1;
  streaks[platform] = platformStreaks;
  await chrome.storage.local.set({ platformErrorStreaks: streaks });
  return platformStreaks[job];
}

async function runPlatformJob(platform, job, source) {
  const config = PLATFORM_JOBS_CONFIG[platform];
  const jobDef = config?.jobs[job];
  if (!jobDef) return;
  const state = await getState();
  if (source === "scheduled" && !state[jobDef.enabledKey]) return;

  if (source === "scheduled" && Number(state[jobDef.nextKey]) > Date.now() + 15000) {
    await schedulePlatformJobNext(platform, job, { pickNew: false });
    return;
  }

  if (platformLocks[platform]) {
    await log("info", `Hoãn ${jobDef.label}: đang có tác vụ ${platform} (${platformLocks[platform]}) chạy. Tự động lùi lại 1.5 phút.`);
    if (source === "scheduled") await schedulePlatformJobIn(platform, job, 1.5, "Hoãn: có tác vụ cùng nền tảng đang chạy.");
    return;
  }

  // CHỐNG BAN: cổng khung giờ / trần ngày / bỏ lượt (chỉ áp dụng cho lịch tự động)
  if (source === "scheduled") {
    const gate = await humanGate(platform);
    if (gate.mode === "skip") {
      await log("info", `[${jobDef.label}] ${gate.reason}`);
      await schedulePlatformJobNext(platform, job, { pickNew: true });
      return;
    }
    if (gate.mode === "defer") {
      await schedulePlatformJobIn(platform, job, gate.retryMinutes, gate.reason);
      return;
    }
    await humanRecordAction(platform);
  }

  platformLocks[platform] = job;
  let jobFailed = false;
  let jobErrorMsg = "";
  try {
    if (platform === "youtube") {
      if (job === "keyword") await runYoutubeKeywordCommentOnce();
      else if (job === "scroll") await runYoutubeScrollOnce();
      else if (job === "subscribe") await runYoutubeSubscribeOnce();
    } else if (platform === "instagram") {
      if (job === "comment") await runInstagramCommentOnce();
      else if (job === "scroll") await runInstagramScrollOnce();
      else if (job === "follow") await runInstagramFollowOnce();
    } else if (platform === "x") {
      if (job === "comment") await runXCommentOnce();
      else if (job === "scroll") await runXScrollOnce();
      else if (job === "post") await runXPostOnce();
      else if (job === "follow") await runXFollowOnce();
    } else if (platform === "zalo") {
      if (job === "friend") await runZaloFriendOnce();
      else if (job === "message") await runZaloMessageOnce();
      else if (job === "reply") await runZaloReplyOnce();
    } else if (platform === "tiktok") {
      if (job === "comment") await runTiktokCommentOnce();
      else if (job === "scroll") await runTiktokScrollOnce();
      else if (job === "follow") await runTiktokFollowOnce();
    } else if (platform === "maps") {
      if (job === "review") await runMapsReviewOnce();
      else if (job === "search") await runMapsSearchOnce();
      else if (job === "reply") await runXReplyOnce();
    }
    await updatePlatformStreak(platform, job, true);

  } catch (error) {
    jobFailed = true;
    jobErrorMsg = String(error?.message || error);
    await log("error", `${jobDef.label} thất bại: ${jobErrorMsg}`);
    const streak = await updatePlatformStreak(platform, job, false);

    if (/checkpoint|login|đăng nhập|xác minh/i.test(jobErrorMsg)) {
      await stopPlatformJob(platform, job);
      return;
    }

    const isActionBlocked = /thử lại sau|bị chặn|chặn|rate limit|too many requests|restrict/i.test(jobErrorMsg);
    if (isActionBlocked) {
      await log("warning", `${jobDef.label} bị giới hạn hành động. Tạm nghỉ 2 giờ để bảo vệ tài khoản.`);
      if (source === "scheduled") {
        await schedulePlatformJobIn(platform, job, 120, "Tạm nghỉ 2 giờ do giới hạn hành động.");
        return;
      }
    } else if (streak >= 5) {
      await log("warning", `${jobDef.label} gặp lỗi liên tiếp ${streak} lần. Tạm hoãn 60 phút.`);
      if (source === "scheduled") {
        await schedulePlatformJobIn(platform, job, 60, `Tạm hoãn 60 phút do lỗi liên tiếp ${streak} lần.`);
        return;
      }
    } else if (streak >= 3) {
      const backoff = platformJobDelayMinutes(await getState(), platform, job) * 1.5;
      await log("warning", `${jobDef.label} gặp lỗi liên tiếp ${streak} lần. Giãn cách thời gian chờ.`);
      if (source === "scheduled") {
        await schedulePlatformJobIn(platform, job, backoff, `Giãn cách lần tới sau ${Math.round(backoff)} phút do lỗi ${streak} lần.`);
        return;
      }
    }
  } finally {
    platformLocks[platform] = null;
  }

  if (source === "scheduled" && !jobFailed) {
    await schedulePlatformJobNext(platform, job, { pickNew: true });
  } else if (source === "scheduled" && jobFailed) {
    const normalDelay = platformJobDelayMinutes(await getState(), platform, job);
    await schedulePlatformJobIn(platform, job, normalDelay);
  }
}

function parseUrlList(text) {
  return String(text || "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"));
}

function buildYoutubeAiUserMessage(ctx) {
  const postText = String(ctx.postText || "").trim();
  const lengthHint = pickOne([
    "Viết cực ngắn, 1 câu thôi.",
    "Viết 1-2 câu, vừa đủ ý.",
    "Viết 2-3 câu, có thể kể thêm 1 chi tiết nhỏ.",
  ]);
  return [
    "Thông tin video YouTube:",
    postText,
    "",
    "Hãy viết một bình luận tự nhiên dưới video này như người xem thật. Nhắc đến 1 chi tiết cụ thể trong video/tiêu đề, hoặc đặt 1 câu hỏi cho creator, hoặc chia sẻ cảm nghĩ thật — không dùng câu chung chung có thể áp cho video nào cũng được.",
    lengthHint,
    "Chỉ trả về đúng 1 bình luận. Không giải thích, không markdown, không bọc ngoặc kép. Tối đa 300 ký tự.",
  ].join("\n");
}

function isYoutubeCommentSkipError(message) {
  return /đã bình luận rồi|đã tắt bình luận|giới hạn độ tuổi|chỉ dành cho thành viên|không tìm thấy video phù hợp/i.test(
    String(message || "")
  );
}

function buildInstagramAiUserMessage(ctx) {
  const postText = String(ctx.postText || "").trim();
  return [
    "Bài viết / Reels trên Instagram:",
    postText,
    "",
    "Hãy viết một bình luận ngắn gọn, trẻ trung, tự nhiên (1–2 dòng) kèm 1 emoji phù hợp.",
    "Chỉ trả về đúng 1 bình luận. Không giải thích, không markdown, không bọc ngoặc kép. Tối đa 250 ký tự.",
  ].join("\n");
}

function buildXAiUserMessage(ctx) {
  const postText = String(ctx.postText || "").trim();
  return [
    "Nội dung Tweet trên X:",
    postText,
    "",
    "Hãy viết một phản hồi thẳng thắn, sắc sảo dưới 280 ký tự.",
    "Chỉ trả về đúng nội dung tweet reply. Không giải thích, không markdown, không bọc ngoặc kép.",
  ].join("\n");
}

function buildTiktokAiUserMessage(ctx) {
  const postText = String(ctx.postText || "").trim();
  return [
    "Video TikTok:",
    postText,
    "",
    "Hãy viết một bình luận ngắn, tự nhiên như đang lướt điện thoại. Nhắc 1 chi tiết cụ thể.",
    "Chỉ trả về đúng 1 bình luận. Không giải thích, không markdown, không bọc ngoặc kép. Tối đa 150 ký tự.",
  ].join("\n");
}

function buildMapsReviewUserMessage(ctx) {
  return [
    "Thông tin địa điểm Google Maps:",
    `Tên: ${ctx.name || "Không rõ"}`,
    ctx.category ? `Loại: ${ctx.category}` : "",
    ctx.address ? `Địa chỉ: ${ctx.address}` : "",
    ctx.rating ? `Điểm hiện tại: ${ctx.rating}` : "",
    ctx.snippet ? `Mô tả: ${ctx.snippet}` : "",
    "",
    "Hãy viết một đánh giá tự nhiên, cụ thể, như người vừa ghé thật.",
    "Chỉ trả về nội dung đánh giá. Không tiêu đề, không markdown.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildXAiPostUserMessage(topic) {
  const topicText = topic ? `Chủ đề: ${topic}` : "Hãy tự chọn một chủ đề thuộc dự án đang quảng bá mà người đọc thật sự cần.";
  return [
    topicText,
    "",
    "Hãy viết một bài đăng (tweet) hấp dẫn, thẳng thắn, chia sẻ góc nhìn hoặc bài học thực tế dưới 280 ký tự.",
    "Chỉ trả về đúng nội dung tweet. Không giải thích, không markdown, không bọc ngoặc kép.",
  ].join("\n");
}

// Job tick chạy 1 "phiên": trong phiên có thể đăng liên tiếp tới
// youtubeKeywordSessionMaxVideos bình luận, nghỉ ngẫu nhiên giữa
// youtubeKeywordSessionIntervalMin/Max phút giữa mỗi video. Nghỉ giữa các PHIÊN
// (giữa các lần job này được gọi) vẫn do youtubeKeywordMinMinutes/MaxMinutes
// ở bộ điều phối chung (schedulePlatformJobNext) quyết định, không đổi.
async function runYoutubeKeywordCommentOnce() {
  const state0 = await getState();
  const maxVideos = Math.max(1, Number(state0.youtubeKeywordSessionMaxVideos) || 2);
  const intervalMin = Math.max(1, Number(state0.youtubeKeywordSessionIntervalMin) || 2);
  const intervalMax = Math.max(intervalMin, Number(state0.youtubeKeywordSessionIntervalMax) || 5);

  let postedCount = 0;
  let lastError = null;

  for (let i = 0; i < maxVideos; i += 1) {
    try {
      await runYoutubeKeywordSingleComment();
      postedCount += 1;
      await log("info", `Đã đăng bình luận YouTube (${postedCount}/${maxVideos}) trong phiên này.`);
    } catch (error) {
      lastError = error;
      await log("info", `Dừng phiên bình luận YouTube theo từ khoá: ${error.message || error}`);
      break;
    }
    if (postedCount >= maxVideos) break;
    const waitMinutes = intervalMin + Math.random() * (intervalMax - intervalMin);
    await log("info", `Nghỉ khoảng ${waitMinutes.toFixed(1)} phút trước khi qua video tiếp theo trong phiên...`);
    await sleep(Math.round(waitMinutes * 60 * 1000));
  }

  if (!postedCount) {
    throw lastError || new Error("Không đăng được bình luận nào trong phiên này.");
  }
  await log("success", `Phiên bình luận YouTube theo từ khoá hoàn tất: đã đăng ${postedCount} bình luận.`);
}

// Thử đăng đúng 1 bình luận: xoay qua tối đa 3 từ khoá khác nhau nếu từ khoá
// hiện tại không tìm được video phù hợp (hết kết quả, video đã bình luận, tắt
// bình luận, giới hạn tuổi...).
async function runYoutubeKeywordSingleComment() {
  const state = await withProjectFallbacks(await getState(), ["youtubeKeywordsText"]);
  const keywords = parseUrlList(state.youtubeKeywordsText);
  if (!keywords.length) throw new Error("Chưa có từ khoá nào được cấu hình cho bình luận YouTube theo từ khoá.");

  const triesAllowed = Math.min(3, keywords.length);
  const triedKeywords = new Set();
  let lastError = null;

  for (let attempt = 0; attempt < triesAllowed; attempt += 1) {
    const remaining = keywords.filter((k) => !triedKeywords.has(k));
    const keyword = remaining[Math.floor(Math.random() * remaining.length)];
    triedKeywords.add(keyword);
    try {
      await attemptYoutubeKeywordComment(keyword);
      return;
    } catch (error) {
      lastError = error;
      const message = error.message || String(error);
      if (!isYoutubeCommentSkipError(message) || attempt >= triesAllowed - 1) throw error;
      await log("info", `Từ khoá "${keyword}" không có video phù hợp (${clip(message, 80)}), đang thử từ khoá khác...`);
    }
  }

  throw lastError || new Error("Không tìm thấy video phù hợp cho các từ khoá đã cấu hình.");
}

async function openDetailTab(url) {
  const tab = await chrome.tabs.create({ url, active: true });
  await waitForTabComplete(tab.id, url);
  await sleep(1500);
  await ensureContentScript(tab.id, url);
  return chrome.tabs.get(tab.id);
}

async function closeDetailTab(tab) {
  if (!tab?.id) return;
  try {
    await chrome.tabs.remove(tab.id);
  } catch {
    // tab có thể đã bị đóng thủ công từ trước
  }
}

// ---- Mã hoá tham số sp= (bộ lọc tìm kiếm) của YouTube ----
// Đã xác nhận 100% bằng cách giải mã trực tiếp HTML panel "Search filters" thật của
// YouTube (từng option tự nó chứa link kèm sp= tương ứng) — không còn là suy đoán.
// Cấu trúc protobuf: message ngoài cùng { sort_by = field1 (varint); filters = field2
// (length-delimited) { upload_date = field1; duration = field3; <feature riêng> } }.
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

function buildYoutubeSpParam(filters) {
  const inner = [];
  const uploadVal = YT_UPLOAD_DATE_VALUE[filters?.uploadDate];
  if (uploadVal) inner.push(...ytVarintField(1, uploadVal));
  const durationVal = YT_DURATION_VALUE[filters?.duration];
  if (durationVal) inner.push(...ytVarintField(3, durationVal));
  const featureField = YT_FEATURE_FIELD[filters?.feature];
  if (featureField) inner.push(...ytVarintField(featureField, 1));

  const outer = [];
  const sortVal = YT_SORT_VALUE[filters?.sort];
  if (sortVal) outer.push(...ytVarintField(1, sortVal));
  if (inner.length) outer.push(...ytLengthDelimitedField(2, inner));

  if (!outer.length) return "";
  let binary = "";
  for (const b of outer) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_");
}

function youtubeVideoKey(idOrUrl) {
  const raw = String(idOrUrl || "").trim();
  if (!raw) return "";
  try {
    if (/^https?:\/\//i.test(raw) || raw.startsWith("/") || raw.includes("youtube") || raw.includes("youtu.be")) {
      const url = new URL(raw, "https://www.youtube.com");
      const path = url.pathname || "";
      if (path.startsWith("/shorts/") || path.startsWith("/embed/") || path.startsWith("/live/")) {
        return String(path.split("/")[2] || "").toLowerCase();
      }
      const fromQuery = url.searchParams.get("v");
      if (fromQuery) return String(fromQuery).toLowerCase();
      if (url.hostname.includes("youtu.be")) return path.replace(/^\//, "").split("/")[0].toLowerCase();
    }
  } catch {
    // ignore
  }
  const matched =
    raw.match(/[?&]v=([^&]+)/i) ||
    raw.match(/\/(?:shorts|embed|live)\/([^/?&]+)/i) ||
    raw.match(/youtu\.be\/([^/?&]+)/i);
  return String(matched ? matched[1] : raw).toLowerCase();
}

async function rememberYoutubeCommentedKeys(keys) {
  const state = await getState();
  const incoming = (Array.isArray(keys) ? keys : [keys]).map(youtubeVideoKey).filter(Boolean);
  const prev = (state.youtubeKeywordCommentedKeys || []).map(youtubeVideoKey).filter(Boolean);
  const seen = new Set();
  const next = [];
  for (const key of [...incoming, ...prev]) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(key);
  }
  const sliced = next.slice(0, MAX_HISTORY);
  await chrome.storage.local.set({ youtubeKeywordCommentedKeys: sliced });
  return sliced;
}

async function commentYoutubeVideoInTab(tab, { skipKeys, watchSeconds, label }) {
  const ctx = await sendToTab(tab.id, {
    type: "EXTRACT_YOUTUBE_CONTEXT",
    // Không đưa video đang mở vào skipKeys: ID đã được "giữ chỗ" trước khi
    // mở tab để lần tìm kiếm sau không chọn lại. Bỏ qua thật sự dựa vào
    // comment của chính mình trên trang (checkOwnExistingComment).
    skipKeys: [],
    watchSeconds,
  });
  if (ctx?.skipped) {
    if (ctx.postKey) await rememberYoutubeCommentedKeys([ctx.postKey]);
    return { skipped: true, postKey: youtubeVideoKey(ctx.postKey) };
  }
  if (!ctx?.ok || !ctx?.postText) throw new Error(ctx?.error || "Không lấy được thông tin video YouTube.");

  const state = await getState();
  await log("info", `Đang gọi AI viết bình luận YouTube${label ? ` (${label})` : ""}: ${clip(ctx.title || ctx.postText, 60)}...`);
  const commentText = await generateAiComment(
    state.youtubeAiSystemPrompt || DEFAULT_YOUTUBE_AI_SYSTEM_PROMPT,
    buildYoutubeAiUserMessage(ctx),
    { platform: "youtube" }
  );
  if (!commentText) throw new Error("AI không trả về nội dung bình luận YouTube.");

  await log("info", `AI gợi ý: ${clip(commentText, 80)}`);
  const postRes = await sendToTab(tab.id, {
    type: "CREATE_YOUTUBE_COMMENT",
    text: commentText,
    postKey: ctx.postKey,
  });
  if (!postRes?.ok) throw new Error(postRes?.error || "Không gửi được bình luận YouTube.");
  if (ctx.postKey) await rememberYoutubeCommentedKeys([ctx.postKey]);
  await log("success", `Bình luận YouTube${label ? ` (${label})` : ""} thành công: ${clip(commentText, 80)}`, "comment", await tabLink(tab));
  return { posted: true, postKey: youtubeVideoKey(ctx.postKey), text: commentText };
}

async function attemptYoutubeKeywordComment(keyword) {
  const state = await getState();
  const skipKeys = (state.youtubeKeywordCommentedKeys || []).map(youtubeVideoKey).filter(Boolean);
  const searchFilters = {
    duration: state.youtubeKeywordFilterDuration || "",
    uploadDate: state.youtubeKeywordFilterUploadDate || "",
    feature: state.youtubeKeywordFilterFeature || "",
    sort: state.youtubeKeywordFilterSort || "",
  };
  const sp = buildYoutubeSpParam(searchFilters);
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}${sp ? `&sp=${sp}` : ""}`;
  const searchTab = await openWorkTab(searchUrl, { active: true, tabIdKey: "youtubeWorkTabId" });
  const ping = await sendToTab(searchTab.id, { type: "PING" });
  if (ping?.state && ping.state !== "ok") throw new Error(ping.error || "YouTube không sẵn sàng.");

  const found = await sendToTab(searchTab.id, {
    type: "EXTRACT_YOUTUBE_SEARCH_CONTEXT",
    skipKeys,
    allowLoadMore: true,
  });
  if (!found?.ok || !found?.nextUrl) {
    throw new Error(found?.error || "Không tìm thấy video phù hợp cho từ khoá này.");
  }

  const mainKey = youtubeVideoKey(found.postKey || found.nextUrl);
  if (mainKey) await rememberYoutubeCommentedKeys([mainKey]);

  await log("info", `Từ khoá "${keyword}": đang mở video "${clip(found.title || found.nextUrl, 60)}" ở tab riêng...`);
  const videoTab = await openDetailTab(found.nextUrl);
  try {
    // Xem thử video khoảng 10% độ dài trước khi thao tác tiếp, tối thiểu 25 giây,
    // trần ngẫu nhiên 60-90 giây (đỡ máy móc so với 1 mốc cố định), để hành vi tự
    // nhiên hơn thay vì vào bình luận ngay lập tức.
    const watchCapSeconds = 60 + Math.random() * 30;
    const watchSeconds = Math.max(25, Math.min(Math.round((Number(found.durationSeconds) || 0) * 0.1), Math.round(watchCapSeconds)));
    const latestSkip = (await getState()).youtubeKeywordCommentedKeys || skipKeys;
    const result = await commentYoutubeVideoInTab(videoTab, {
      skipKeys: latestSkip,
      watchSeconds,
      label: `từ khoá "${keyword}"`,
    });
    if (result?.skipped) {
      throw new Error("Video này đã bình luận rồi, sẽ thử video khác lần sau.");
    }

    const relatedCount = Math.min(5, Math.max(0, Number(state.youtubeKeywordRelatedCount) || 2));
    if (!relatedCount) return;

    const relatedRes = await sendToTab(videoTab.id, {
      type: "EXTRACT_YOUTUBE_RELATED",
      skipKeys: (await getState()).youtubeKeywordCommentedKeys || latestSkip,
      limit: relatedCount,
    });
    const related = Array.isArray(relatedRes?.videos) ? relatedRes.videos : [];
    if (!related.length) {
      await log("info", "Không lấy được video gợi ý phù hợp để bình luận thêm.");
      return;
    }

    await log("info", `Sẽ bình luận thêm ${related.length} video gợi ý sau video vừa tìm.`);
    for (let i = 0; i < related.length; i += 1) {
      const item = related[i];
      const relatedKey = youtubeVideoKey(item.vid || item.href);
      if (relatedKey) await rememberYoutubeCommentedKeys([relatedKey]);
      await log("info", `Gợi ý ${i + 1}/${related.length}: đang mở "${clip(item.title || item.href, 60)}"...`);
      const relatedTab = await openDetailTab(item.href);
      try {
        const relatedWatchCap = 30 + Math.random() * 15;
        const relatedWatch = Math.max(15, Math.min(Math.round((Number(item.durationSeconds) || 0) * 0.1), Math.round(relatedWatchCap)));
        const relatedSkip = (await getState()).youtubeKeywordCommentedKeys || [];
        const relatedResult = await commentYoutubeVideoInTab(relatedTab, {
          skipKeys: relatedSkip,
          watchSeconds: relatedWatch,
          label: `gợi ý ${i + 1}`,
        });
        if (relatedResult?.skipped) {
          await log("info", `Video gợi ý ${i + 1} đã bình luận rồi, bỏ qua.`);
        }
      } catch (error) {
        await log("warning", `Bỏ qua video gợi ý ${i + 1}: ${error.message || error}`);
      } finally {
        await closeDetailTab(relatedTab);
      }
      if (i < related.length - 1) {
        const pause = 15 + Math.random() * 15;
        await log("info", `Nghỉ ${Math.round(pause)} giây trước video gợi ý tiếp theo...`);
        await sleep(Math.round(pause * 1000));
      }
    }
  } finally {
    await closeDetailTab(videoTab);
  }
}

async function runYoutubeScrollOnce() {
  const state = await getState();
  const tab = await openWorkTab("https://www.youtube.com/", { active: true, tabIdKey: "youtubeWorkTabId" });
  await sleep(1500);
  const res = await sendToTab(tab.id, {
    type: "SCROLL_YOUTUBE_FEED",
    rounds: state.youtubeScrollRounds || 6,
    autoLike: state.youtubeScrollLike !== false,
    likeDelay: state.youtubeScrollLikeDelay || 5,
  });
  if (!res?.ok) throw new Error(res?.error || "Không lướt được video YouTube.");
  await log("success", `Đã lướt ${res.scrolled} lượt video YouTube, thích ${res.likedCount || 0} video.`);
}

async function runYoutubeSubscribeOnce() {
  const state = await getState();
  const channels = parseUrlList(state.youtubeSubscribeChannelsText);
  const subscribed = new Set(state.youtubeSubscribedKeys || []);
  const available = channels.filter((c) => !subscribed.has(c.toLowerCase()));
  // Danh sách chỉ định trống hoặc đã subscribe hết: tìm kênh làm video về chủ đề dự án theo từ khoá.
  const channelUrl = available[0] || (await pickDiscoveredFollowHandle("youtube", state.youtubeSubscribedKeys));
  if (!channelUrl) return;
  const tab = await openWorkTab(channelUrl, { active: true, tabIdKey: "youtubeWorkTabId" });
  await sleep(1800);
  const res = await sendToTab(tab.id, { type: "SUBSCRIBE_YOUTUBE_CHANNEL" });
  if (!res?.ok) throw new Error(res?.error || "Không subscribe được kênh YouTube.");
  if (res.skipped) {
    await log("info", `Đã subscribe kênh trước đó: ${channelUrl}`);
  } else {
    await log("success", `Subscribe kênh YouTube thành công: ${channelUrl}`, "follow", channelUrl);
  }
  const keys = [channelUrl.toLowerCase(), ...(state.youtubeSubscribedKeys || [])].slice(0, MAX_HISTORY);
  await chrome.storage.local.set({ youtubeSubscribedKeys: keys });
}

// Số bài Instagram tối đa được mở trong một lượt khi các bài trước bị bộ lọc AI loại.
const INSTAGRAM_FILTER_MAX_TRIES = 3;

async function runInstagramCommentOnce() {
  const state = await withProjectFallbacks(await getState(), ["instagramSourcesText", "instagramFilterPrompt"]);
  const sources = parseUrlList(state.instagramSourcesText);
  const targetUrl = sources.length ? sources[Math.floor(Math.random() * sources.length)] : "https://www.instagram.com/";
  const filterPrompt = String(state.instagramFilterPrompt || "").trim();
  const filteredOut = [...(state.instagramFilteredOutKeys || [])];
  let tab = null;
  let ctx = null;

  // Mỗi lần thử là một lần điều hướng tab thật (trang hashtag → bài), phải tuần tự.
  for (let attempt = 1; attempt <= INSTAGRAM_FILTER_MAX_TRIES; attempt += 1) {
    const skipKeys = [...(state.instagramCommentedKeys || []), ...filteredOut];
    tab = await openWorkTab(targetUrl, { active: true, tabIdKey: "instagramWorkTabId" });
    await sleep(2000);
    const ping = await sendToTab(tab.id, { type: "PING" });
    if (ping?.state && ping.state !== "ok") throw new Error(ping.error || "Instagram không sẵn sàng.");

    ctx = await sendToTab(tab.id, { type: "EXTRACT_INSTAGRAM_CONTEXT", skipKeys });
    if (ctx?.skipped) {
      await log("info", "Bài viết Instagram này đã từng bình luận hoặc đã bị bộ lọc loại. Bỏ qua.");
      return;
    }
    if (ctx?.nextUrl) {
      tab = await openWorkTab(ctx.nextUrl, { active: true, tabIdKey: "instagramWorkTabId" });
      await sleep(2000);
      ctx = await sendToTab(tab.id, { type: "EXTRACT_INSTAGRAM_CONTEXT", skipKeys });
    }
    if (!ctx?.postText) throw new Error("Không lấy được nội dung bài viết Instagram.");
    if (!filterPrompt) break;

    await log("info", `Đang đánh giá bài Instagram của ${ctx.author || "user"} theo tiêu chí dự án...`);
    const [allowed] = await evaluateThreadsContentGateBatch({
      filterPrompt,
      ignoreOnError: Boolean(state.instagramFilterIgnoreOnError),
      posts: [{ text: ctx.postText }],
    });
    if (allowed) break;

    if (ctx.postKey) filteredOut.unshift(ctx.postKey);
    await chrome.storage.local.set({ instagramFilteredOutKeys: filteredOut.slice(0, MAX_HISTORY) });
    // Nguồn là link một bài cụ thể thì không có bài khác để thử.
    const canRetry = attempt < INSTAGRAM_FILTER_MAX_TRIES && !/\/(?:p|reel|reels)\/[A-Za-z0-9_-]+/i.test(targetUrl);
    await log("info", `Bài của ${ctx.author || "user"} không hợp tiêu chí, bỏ qua${canRetry ? ", tìm bài khác..." : "."}: ${clip(ctx.postText, 80)}`);
    if (!canRetry) return;
    ctx = null;
  }

  await log("info", `Đang gọi AI viết bình luận Instagram cho bài của ${ctx.author || "user"}...`);
  const commentText = await generateAiComment(
    state.instagramAiSystemPrompt || DEFAULT_INSTAGRAM_AI_SYSTEM_PROMPT,
    buildInstagramAiUserMessage(ctx),
    { platform: "instagram" }
  );
  if (!commentText) throw new Error("AI không trả về bình luận Instagram.");

  await log("info", `AI gợi ý: ${clip(commentText, 80)}`);
  const postRes = await sendToTab(tab.id, {
    type: "CREATE_INSTAGRAM_COMMENT",
    text: commentText,
    postKey: ctx.postKey,
  });
  if (!postRes?.ok) throw new Error(postRes?.error || "Không gửi được bình luận Instagram.");

  const commented = [ctx.postKey, ...(state.instagramCommentedKeys || []).filter((k) => k !== ctx.postKey)].slice(0, MAX_HISTORY);
  await chrome.storage.local.set({ instagramCommentedKeys: commented });
  await log("success", `Bình luận Instagram thành công: ${clip(commentText, 80)}`, "comment", await tabLink(tab));
}

async function runInstagramScrollOnce() {
  const state = await getState();
  const tab = await openWorkTab("https://www.instagram.com/", { active: true, tabIdKey: "instagramWorkTabId" });
  await sleep(2000);
  const res = await sendToTab(tab.id, {
    type: "SCROLL_INSTAGRAM_FEED",
    rounds: state.instagramScrollRounds || 8,
    autoLike: state.instagramScrollLike !== false,
    likeDelay: state.instagramScrollLikeDelay || 4,
    autoFollow: Boolean(state.instagramScrollFollow),
  });
  if (!res?.ok) throw new Error(res?.error || "Không lướt được feed Instagram.");
  let msg = `Đã lướt ${res.scrolled} lượt feed Instagram, thả tim ${res.likedCount || 0} bài.`;
  if (res.followedCount > 0) msg += ` Follow ${res.followedCount} người.`;
  await log("success", msg);
}

async function runInstagramFollowOnce() {
  const state = await getState();
  const targets = parseUrlList(state.instagramFollowTargetsText);
  const followed = new Set(state.instagramFollowedKeys || []);
  const available = targets.filter((t) => !followed.has(t.replace(/^@/, "").toLowerCase()));
  // Danh sách chỉ định trống hoặc đã follow hết: tìm người đăng về chủ đề dự án theo hashtag.
  const rawTarget = available[0] || (await pickDiscoveredFollowHandle("instagram", state.instagramFollowedKeys));
  if (!rawTarget) return;
  const handle = rawTarget.replace(/^@/, "").replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, "").replace(/\/$/, "");
  const profileUrl = `https://www.instagram.com/${handle}/`;
  const tab = await openWorkTab(profileUrl, { active: true, tabIdKey: "instagramWorkTabId" });
  await sleep(2000);
  const res = await sendToTab(tab.id, { type: "FOLLOW_INSTAGRAM_USER" });
  if (!res?.ok) throw new Error(res?.error || "Không follow được tài khoản Instagram.");
  if (res.skipped) {
    await log("info", `Đã follow trước đó: @${handle}`);
  } else {
    await log("success", `Follow tài khoản Instagram thành công: @${handle}`, "follow", `https://www.instagram.com/${handle}/`);
  }
  const keys = [handle.toLowerCase(), ...(state.instagramFollowedKeys || [])].slice(0, MAX_HISTORY);
  await chrome.storage.local.set({ instagramFollowedKeys: keys });
}

const X_FEED_BATCH_SIZE = 5;
const X_SESSION_MAX_DURATION_MS = 5 * 60 * 1000;
const X_MAX_EMPTY_BATCHES = 3;
const X_MAX_TOTAL_ROUNDS = 40;

function mergedXCommentSkipKeys(state) {
  return [...(state.xCommentedKeys || []), ...(state.xFilteredOutKeys || [])];
}

function xFeedBatchFailed(res) {
  return !res?.ok && /không tìm thấy|không đọc được|không ở trang chi tiết/i.test(String(res?.error || ""));
}

// Thử nguồn ban đầu rồi lần lượt URL feed dự phòng, tới khi lấy được ít
// nhất 1 tweet — dùng khi round batch đầu tiên của phiên không đọc được gì.
async function recoverXFeedBatch(feedTab, sourceUrl, skipKeys, limit) {
  let currentTab = feedTab;
  let res = await sendToTab(currentTab.id, { type: "EXTRACT_X_FEED_BATCH", skipKeys, limit });
  if (!xFeedBatchFailed(res)) return { res, tab: currentTab };

  const urls = [sourceUrl, "https://x.com/home"].filter(Boolean);
  const tried = new Set();
  for (const url of urls) {
    const key = String(url).split("?")[0].replace(/\/$/, "");
    if (tried.has(key)) continue;
    tried.add(key);
    await log("info", `Chưa thấy Tweet trên X, thử ${url}`);
    currentTab = await openWorkTab(url, { active: true, tabIdKey: "xWorkTabId" });
    const next = await sendToTab(currentTab.id, { type: "EXTRACT_X_FEED_BATCH", skipKeys, limit });
    if (!xFeedBatchFailed(next)) return { res: next, tab: currentTab };
    res = next;
  }
  return { res, tab: currentTab };
}

async function closeXCommentTab(workTab, feedTab) {
  if (workTab?.id) {
    try {
      await chrome.tabs.remove(workTab.id);
    } catch {
      // tab có thể đã bị đóng sẵn
    }
    await chrome.storage.local.set({ xCommentTabId: null });
  }
  try {
    await chrome.tabs.update(feedTab.id, { active: true });
  } catch {
    // feed tab có thể đã bị đóng, phiên sau sẽ mở lại
  }
}

async function setXHud(tab, text) {
  if (!tab?.id) return;
  try {
    await sendToTab(tab.id, { type: "SET_X_HUD", text });
  } catch {
    // chỉ là hiệu ứng hiển thị, tab có thể đã đóng/chuyển trang
  }
}

// Xử lý 1 tweet đã qua gate: mở tab riêng, đọc lại context đầy đủ tại trang
// chi tiết, viết + đăng bình luận, rồi đóng tab.
async function interactWithXPost(item, feedTab, skipKeys) {
  let workTab = null;
  try {
    workTab = await openWorkTab(item.url, { active: true, tabIdKey: "xCommentTabId" });
    const ping = await sendToTab(workTab.id, { type: "PING" });
    if (ping?.state && ping.state !== "ok") {
      await log("warning", ping.error || "X (Twitter) không sẵn sàng.");
      return null;
    }

    const ctx = await sendToTab(workTab.id, { type: "EXTRACT_X_CONTEXT", skipKeys });
    if (ctx?.alreadyCommented || ctx?.skipped || !ctx?.ok) {
      await log("info", `Bỏ qua Tweet (${ctx?.error || "đã phản hồi rồi"}), sang bài tiếp theo.`);
      return null;
    }
    if (!String(ctx.postText || "").trim()) {
      await log("info", "Tweet không có chữ để bình luận, sang bài tiếp theo.");
      return null;
    }

    const state = await getState();
    await log("info", `Đang gọi AI viết phản hồi Tweet của ${ctx.author || "user"}...`);
    await setXHud(workTab, "Đang tạo bình luận bằng AI...");
    await sleep(600 + Math.round(Math.random() * 1400));
    const text = await generateAiComment(
      state.xAiSystemPrompt || DEFAULT_X_AI_SYSTEM_PROMPT,
      buildXAiUserMessage(ctx),
      { platform: "x" }
    );
    if (!text) {
      await log("warning", "AI không trả về nội dung phản hồi, sang bài tiếp theo.");
      return null;
    }
    await log("info", `AI gợi ý: ${clip(text, 110)}`);

    await sleep(900 + Math.round(Math.random() * 1800));
    const postRes = await sendToTab(workTab.id, {
      type: "CREATE_X_COMMENT",
      text,
      postKey: ctx.postKey,
    });
    if (!postRes?.ok) {
      await log("info", `Không đăng được phản hồi (${postRes?.error || "lỗi"}), sang bài tiếp theo.`);
      return null;
    }

    return { text, keys: [ctx.postKey] };
  } catch (error) {
    await log("error", `Lỗi khi tương tác Tweet: ${error.message || error}`);
    return null;
  } finally {
    await closeXCommentTab(workTab, feedTab);
  }
}

// Orchestrator chính của job "Bình luận AI" trên X — đọc theo lô trực tiếp
// từ feed (không cuộn tới khi thật sự cần), gate cả lô bằng 1 lần gọi AI,
// rồi lần lượt mở tab riêng cho từng tweet đạt điều kiện tới khi đủ
// xSessionMaxPosts hoặc hết tweet mới trên feed. Tab feed không bao giờ bị
// điều hướng. Giống hệt kiến trúc runThreadsCommentSession.
async function runXCommentSession(feedTab, sourceUrl) {
  let currentFeedTab = feedTab;
  const state0 = await getState();
  // Ô bộ lọc để trống thì lọc theo bộ lọc của dự án đang chọn (đọc một lần cho cả phiên).
  const projectFilterPrompt = (await withProjectFallbacks({}, ["xFilterPrompt"])).xFilterPrompt;
  const maxPosts = Math.max(1, Number(state0.xSessionMaxPosts) || 2);
  const intervalMin = Math.max(1, Number(state0.xSessionIntervalMin) || 2);
  const intervalMax = Math.max(intervalMin, Number(state0.xSessionIntervalMax) || 5);

  const sessionSeenKeys = [];
  const texts = [];
  const keys = [];
  let postedCount = 0;
  let lastError = null;
  const sessionStartedAt = Date.now();
  let consecutiveEmptyBatches = 0;
  let round = 0;

  while (postedCount < maxPosts && round < X_MAX_TOTAL_ROUNDS) {
    round += 1;
    if (Date.now() - sessionStartedAt > X_SESSION_MAX_DURATION_MS) {
      await log("info", "Đã quét bảng tin X quá lâu mà chưa tìm đủ bài phù hợp, kết thúc phiên.");
      break;
    }

    const state = await getState();
    const persistedSkipKeys = mergedXCommentSkipKeys(state);
    const skipKeys = [...persistedSkipKeys, ...sessionSeenKeys];

    let batchRes;
    if (round === 1) {
      const recovered = await recoverXFeedBatch(currentFeedTab, sourceUrl, skipKeys, X_FEED_BATCH_SIZE);
      batchRes = recovered.res;
      currentFeedTab = recovered.tab;
    } else {
      batchRes = await sendToTab(currentFeedTab.id, {
        type: "EXTRACT_X_FEED_BATCH",
        skipKeys,
        limit: X_FEED_BATCH_SIZE,
      });
    }

    if (!batchRes?.ok) {
      lastError = new Error(batchRes?.error || "Không đọc được bảng tin X.");
      break;
    }
    const items = Array.isArray(batchRes.items) ? batchRes.items : [];
    if (!items.length) {
      consecutiveEmptyBatches += 1;
      if (consecutiveEmptyBatches >= X_MAX_EMPTY_BATCHES) {
        await log(
          "info",
          `Đã cuộn hết bảng tin X, không còn tweet mới sau ${consecutiveEmptyBatches} lần thử liên tiếp, kết thúc phiên.`
        );
        break;
      }
      await log(
        "info",
        `Chưa thấy tweet mới nào (lần ${consecutiveEmptyBatches}/${X_MAX_EMPTY_BATCHES}), đang cuộn tiếp...`
      );
      continue;
    }
    consecutiveEmptyBatches = 0;
    for (const item of items) {
      sessionSeenKeys.push(...(item.aliases?.length ? item.aliases : [item.key]));
    }

    const filterPrompt = String(state.xFilterPrompt || projectFilterPrompt || "").trim();
    let allowed;
    if (!filterPrompt) {
      allowed = items.map(() => true);
    } else {
      await log("info", `Đang đánh giá ${items.length} tweet theo tiêu chí đã chỉ định...`);
      await setXHud(currentFeedTab, `Đang đánh giá ${items.length} tweet...`);
      try {
        allowed = await evaluateXContentGateBatch({
          filterPrompt,
          ignoreOnError: Boolean(state.xFilterIgnoreOnError),
          posts: items,
        });
      } catch (error) {
        await log("warning", `${error.message || error} — bỏ qua lô này, thử lô tiếp theo.`);
        continue;
      }
    }

    const rejectedKeys = [];
    items.forEach((item, i) => {
      if (!allowed[i]) rejectedKeys.push(...(item.aliases?.length ? item.aliases : [item.key]));
    });
    if (rejectedKeys.length) {
      const latest = await getState();
      const xFilteredOutKeys = rememberThreadsKeys(latest.xFilteredOutKeys, rejectedKeys);
      await chrome.storage.local.set({ xFilteredOutKeys });
    }

    for (let i = 0; i < items.length && postedCount < maxPosts; i += 1) {
      if (!allowed[i]) continue;
      const item = items[i];
      await log("info", `Đang mở Tweet để bình luận: ${clip(item.text || item.url, 70)}`);
      await sleep(700 + Math.round(Math.random() * 1200));

      const posted = await interactWithXPost(item, currentFeedTab, persistedSkipKeys);
      if (posted) {
        texts.push(posted.text);
        keys.push(...posted.keys);
        postedCount += 1;
        const latest = await getState();
        const xCommentedKeys = rememberThreadsKeys(latest.xCommentedKeys, posted.keys);
        await chrome.storage.local.set({ xCommentedKeys });
        await log("success", `Đã đăng bình luận X (${postedCount}/${maxPosts}): ${clip(posted.text, 80)}`, "comment", item.url);
        if (postedCount >= maxPosts) break;
        const waitMinutes = intervalMin + Math.random() * (intervalMax - intervalMin);
        await log("info", `Nghỉ khoảng ${waitMinutes.toFixed(1)} phút trước khi qua bài tiếp theo...`);
        await sleep(Math.round(waitMinutes * 60 * 1000));
      }
    }
  }

  return { postedCount, texts, keys, lastError };
}

async function runXCommentOnce() {
  const state = await withProjectFallbacks(await getState(), ["xSourcesText"]);
  const sources = parseUrlList(state.xSourcesText);
  const sourceUrl = sources.length ? sources[Math.floor(Math.random() * sources.length)] : "https://x.com/home";
  const tab = await openWorkTab(sourceUrl, { active: true, tabIdKey: "xWorkTabId" });
  const ping = await sendToTab(tab.id, { type: "PING" });
  if (ping?.state && ping.state !== "ok") throw new Error(ping.error || "X (Twitter) không sẵn sàng.");

  const session = await runXCommentSession(tab, sourceUrl);
  if (!session.postedCount) {
    throw session.lastError || new Error("Không đăng được bình luận nào trên X trong phiên này.");
  }

  const stats = { ...(await getState()).stats };
  stats.comments = (Number(stats.comments) || 0) + session.postedCount;
  await chrome.storage.local.set({ stats });
  await log(
    "success",
    `Phiên bình luận X hoàn tất: đã đăng ${session.postedCount} bình luận. Gần nhất: ${clip(
      session.texts[session.texts.length - 1] || "",
      80
    )}`
  );
}

async function runXScrollOnce() {
  const state = await getState();
  const tab = await openWorkTab("https://x.com/home", { active: true, tabIdKey: "xWorkTabId" });
  await sleep(2000);
  const res = await sendToTab(tab.id, {
    type: "SCROLL_X_FEED",
    rounds: state.xScrollRounds || 8,
    autoLike: state.xScrollLike !== false,
    likeDelay: state.xScrollLikeDelay || 4,
  });
  if (!res?.ok) throw new Error(res?.error || "Không lướt được feed X.");
  await log("success", `Đã lướt ${res.scrolled} lượt feed X, thích ${res.likedCount || 0} tweet.`);
}

async function runXPostOnce() {
  const state = await withProjectFallbacks(await getState(), ["xPostTopicsText"]);
  let text = "";
  if (state.xPostAi) {
    const topics = parseTemplates(state.xPostTopicsText);
    const topic = topics.length ? topics[Math.floor(Math.random() * topics.length)] : "";
    await log("info", "Đang gọi AI tạo tweet mới...");
    text = await generateAiComment(
      state.xPostAiSystemPrompt || DEFAULT_X_POST_AI_PROMPT,
      buildXAiPostUserMessage(topic),
      { platform: "x", kind: "post" }
    );
  } else {
    const templates = parseTemplates(state.xPostTemplatesText);
    if (!templates.length) throw new Error("Chưa có mẫu tweet. Dán mẫu cách nhau bởi ** hoặc bật AI.");
    const used = new Set(state.xPostUsedKeys || []);
    const fresh = templates.filter((t) => !used.has(textKey(t)));
    const pool = fresh.length ? fresh : templates;
    text = pool[Math.floor(Math.random() * pool.length)];
  }
  if (!text) throw new Error("Không có nội dung Tweet để đăng.");

  const tab = await openWorkTab("https://x.com/home", { active: true, tabIdKey: "xWorkTabId" });
  await sleep(2000);
  const res = await sendToTab(tab.id, { type: "CREATE_X_POST", text });
  if (!res?.ok) throw new Error(res?.error || "Không đăng được Tweet.");

  const usedKeys = [textKey(text), ...(state.xPostUsedKeys || [])].slice(0, MAX_HISTORY);
  await chrome.storage.local.set({ xPostUsedKeys: usedKeys });
  await log("success", `Đã đăng bài lên X: ${clip(text, 80)}`, "post", await tabLink(tab));
}

async function runXFollowOnce() {
  const state = await getState();
  const targets = parseUrlList(state.xFollowTargetsText);
  const followed = new Set(state.xFollowedKeys || []);
  const available = targets.filter((t) => !followed.has(t.replace(/^@/, "").toLowerCase()));
  // Danh sách chỉ định trống hoặc đã follow hết: tìm người tweet về chủ đề dự án theo từ khoá.
  const rawTarget = available[0] || (await pickDiscoveredFollowHandle("x", state.xFollowedKeys));
  if (!rawTarget) return;
  const handle = rawTarget.replace(/^@/, "").replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i, "").replace(/\/$/, "");
  const profileUrl = `https://x.com/${handle}`;
  const tab = await openWorkTab(profileUrl, { active: true, tabIdKey: "xWorkTabId" });
  await sleep(2000);
  const res = await sendToTab(tab.id, { type: "FOLLOW_X_USER" });
  if (!res?.ok) throw new Error(res?.error || "Không follow được tài khoản X.");
  if (res.skipped) {
    await log("info", `Đã follow trước đó: @${handle}`);
  } else {
    await log("success", `Follow tài khoản X thành công: @${handle}`, "follow", `https://x.com/${handle}`);
  }
  const keys = [handle.toLowerCase(), ...(state.xFollowedKeys || [])].slice(0, MAX_HISTORY);
  await chrome.storage.local.set({ xFollowedKeys: keys });
}

// ==================== ZALO FUNCTIONS ====================

async function ensureZaloTab() {
  const state = await getState();
  const homeUrl = "https://chat.zalo.me/";
  const existingTabId = Number(state.zaloWorkTabId) || null;
  let tabId = null;
  if (existingTabId) {
    try {
      const tab = await chrome.tabs.get(existingTabId);
      if (tab && tab.url && tab.url.startsWith("https://chat.zalo.me")) {
        tabId = existingTabId;
      }
    } catch {
      // Tab không còn tồn tại
    }
  }
  if (!tabId) {
    const tabs = await chrome.tabs.query({ url: "https://chat.zalo.me/*" });
    if (tabs[0]?.id) {
      tabId = tabs[0].id;
      await chrome.storage.local.set({ zaloWorkTabId: tabId });
    }
  }
  if (!tabId) {
    const tab = await chrome.tabs.create({ url: homeUrl, active: false });
    tabId = tab.id;
    await chrome.storage.local.set({ zaloWorkTabId: tabId });
    await sleep(6000);
  }
  await ensureContentScript(tabId, homeUrl);
  return tabId;
}

async function callZaloAi(systemPrompt, userContent, maxChars = 200) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const payload = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    };
    const res = await fetch(GENERATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/plain" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const raw = await res.text();
    if (!res.ok) throw new Error(`API Zalo lỗi ${res.status}`);
    let text = String(raw || "").trim();
    if (text.startsWith("{")) {
      try {
        const envelope = JSON.parse(text);
        text =
          envelope.choices?.[0]?.message?.content ??
          envelope.message?.content ??
          envelope.content ??
          text;
      } catch {
        // giữ text gốc
      }
    }
    return String(text || "").trim().slice(0, maxChars);
  } catch (err) {
    if (err.name === "AbortError") throw new Error("API Zalo timeout.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function callZaloReplyAi(systemPrompt, userMessage, senderName) {
  return callZaloAi(
    systemPrompt,
    `Tên người nhắn: ${senderName || "Bạn bè"}\nTin nhắn họ gửi: ${userMessage}\n\nHãy trả lời tin nhắn này.`,
    200
  );
}

async function callZaloMessageAi(systemPrompt, targetName) {
  return callZaloAi(
    systemPrompt,
    `Soạn 1 tin nhắn Zalo ngắn, tự nhiên gửi tới "${targetName || "bạn bè"}". Chỉ trả về nội dung tin nhắn.`,
    200
  );
}

async function runZaloFriendOnce() {
  const state = await getState();
  const phones = String(state.zaloFriendPhonesText || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!phones.length) throw new Error("Chưa có danh sách số điện thoại Zalo để kết bạn.");

  const sessionMax = Math.min(10, Math.max(1, Number(state.zaloFriendSessionMax) || 3));
  const delayMin = Math.max(30, Number(state.zaloFriendDelayMin) || 60);
  const delayMax = Math.max(delayMin, Number(state.zaloFriendDelayMax) || 120);

  const stored = await chrome.storage.local.get(["zaloFriendDoneKeys"]);
  const doneKeys = new Set(stored.zaloFriendDoneKeys || []);

  const remaining = phones.filter((p) => !doneKeys.has(p));
  if (!remaining.length) {
    await log("info", "[Zalo Kết bạn] Đã gửi lời mời hết danh sách. Reset để bắt đầu lại.");
    await chrome.storage.local.set({ zaloFriendDoneKeys: [] });
    return;
  }

  const tabId = await ensureZaloTab();
  let sent = 0;
  let index = 0;

  while (index < remaining.length && sent < sessionMax) {
    const phone = remaining[index];
    index += 1;
    let skipped = false;
    await log("info", `[Zalo Kết bạn] Gửi lời mời kết bạn tới ${phone}...`);
    try {
      const res = await sendToTab(tabId, { type: "ZALO_ADD_FRIEND", phone });
      if (res?.ok) {
        doneKeys.add(phone);
        const reason = res.reason || (res.alreadyFriend ? "already_friend" : "");
        if (reason === "already_friend") {
          skipped = true;
          await log("info", `[Zalo Kết bạn] ${phone} đã là bạn bè — bỏ qua, chuyển số tiếp theo.`);
        } else if (reason === "pending") {
          skipped = true;
          await log("info", `[Zalo Kết bạn] ${phone} đã có lời mời đang chờ — bỏ qua, chuyển số tiếp theo.`);
        } else if (reason === "not_found") {
          skipped = true;
          await log(
            "warning",
            `[Zalo Kết bạn] ${phone} — số chưa đăng ký tài khoản hoặc không cho phép tìm kiếm. Bỏ qua, chuyển số tiếp theo.`
          );
        } else if (reason === "blocked") {
          skipped = true;
          await log("warning", `[Zalo Kết bạn] ${phone} không thể kết bạn (chặn) — bỏ qua, chuyển số tiếp theo.`);
        } else {
          sent += 1;
          await log("success", `[Zalo Kết bạn] ✓ Đã gửi lời mời tới ${phone}`, "follow");
        }
      } else {
        skipped = true;
        await log("warning", `[Zalo Kết bạn] Không thể kết bạn với ${phone}: ${res?.error || "lỗi không xác định"}`);
      }
    } catch (err) {
      const msg = String(err?.message || err);
      if (/không tìm thấy|not found|chưa đăng ký|không cho phép tìm kiếm/i.test(msg)) {
        skipped = true;
        doneKeys.add(phone);
        await log("warning", `[Zalo Kết bạn] ${phone} không tìm thấy trên Zalo — bỏ qua, chuyển số tiếp theo.`);
      } else {
        await log("error", `[Zalo Kết bạn] Lỗi khi gửi tới ${phone}: ${msg}`);
      }
    }

    await chrome.storage.local.set({ zaloFriendDoneKeys: [...doneKeys] });

    if (skipped) continue;
    if (sent < sessionMax && index < remaining.length) {
      const delay = delayMin + Math.random() * (delayMax - delayMin);
      await log("info", `[Zalo Kết bạn] Chờ ${Math.round(delay)} giây trước số tiếp theo...`);
      await sleep(delay * 1000);
    }
  }

  await log("info", `[Zalo Kết bạn] Phiên hoàn tất: đã gửi ${sent} lời mời.`);
}

async function runZaloMessageOnce() {
  const state = await getState();
  const targets = String(state.zaloMessageTargetsText || state.zaloMessagePhonesText || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!targets.length) throw new Error("Chưa có danh sách bạn bè / nhóm Zalo để nhắn tin.");

  const useAi = state.zaloMessageAi !== false;
  const templates = parseTemplates(state.zaloMessageTemplatesText || "");
  if (!useAi && !templates.length) throw new Error("Chưa có nội dung tin nhắn mẫu.");
  const prompt = String(state.zaloMessageAiSystemPrompt || DEFAULT_ZALO_MESSAGE_AI_PROMPT).trim();

  const sessionMax = Math.min(10, Math.max(1, Number(state.zaloMessageSessionMax) || 3));
  const delayMin = Math.max(30, Number(state.zaloMessageDelayMin) || 60);
  const delayMax = Math.max(delayMin, Number(state.zaloMessageDelayMax) || 120);

  const stored = await chrome.storage.local.get(["zaloMessageDoneKeys"]);
  const doneKeys = new Set(stored.zaloMessageDoneKeys || []);

  const remaining = targets.filter((p) => !doneKeys.has(p));
  if (!remaining.length) {
    await log("info", "[Zalo Nhắn tin] Đã nhắn hết danh sách. Reset để bắt đầu lại.");
    await chrome.storage.local.set({ zaloMessageDoneKeys: [] });
    return;
  }

  const tabId = await ensureZaloTab();
  let sent = 0;

  for (let i = 0; i < Math.min(sessionMax, remaining.length); i++) {
    const target = remaining[i];
    let text = "";
    if (useAi) {
      text = await callZaloMessageAi(prompt, target);
    } else {
      text = templates[Math.floor(Math.random() * templates.length)];
    }
    if (!text) {
      await log("warning", `[Zalo Nhắn tin] Không soạn được nội dung cho ${target}.`);
      continue;
    }
    await log("info", `[Zalo Nhắn tin] Đang nhắn tới ${target}...`);
    try {
      const res = await sendToTab(tabId, { type: "ZALO_SEND_MESSAGE", phone: target, target, text });
      if (res?.ok) {
        doneKeys.add(target);
        sent++;
        await log("success", `[Zalo Nhắn tin] ✓ Đã nhắn tới ${target}`, "message");
      } else {
        await log("warning", `[Zalo Nhắn tin] Không thể nhắn tới ${target}: ${res?.error || "lỗi không xác định"}`);
      }
    } catch (err) {
      await log("error", `[Zalo Nhắn tin] Lỗi khi nhắn tới ${target}: ${err.message || err}`);
    }
    if (i < Math.min(sessionMax, remaining.length) - 1) {
      const delay = delayMin + Math.random() * (delayMax - delayMin);
      await log("info", `[Zalo Nhắn tin] Chờ ${Math.round(delay)} giây...`);
      await sleep(delay * 1000);
    }
  }

  await chrome.storage.local.set({ zaloMessageDoneKeys: [...doneKeys] });
  await log("info", `[Zalo Nhắn tin] Phiên hoàn tất: đã nhắn ${sent} tin nhắn.`);
}

async function runZaloReplyOnce() {
  const state = await getState();
  const tabId = await ensureZaloTab();
  const prompt = String(state.zaloReplyAiSystemPrompt || DEFAULT_ZALO_REPLY_AI_PROMPT).trim();
  const sessionMax = Math.min(10, Math.max(1, Number(state.zaloReplySessionMax) || 5));
  const delayMin = Math.max(5, Number(state.zaloReplyDelayMin) || 8);
  const delayMax = Math.max(delayMin, Number(state.zaloReplyDelayMax) || 20);

  await log("info", "[Zalo Trả lời] Đang quét tin nhắn mới từ bạn bè...");

  let conversations = [];
  try {
    const res = await sendToTab(tabId, { type: "ZALO_GET_UNREAD_CONVERSATIONS" });
    conversations = res?.conversations || [];
  } catch (err) {
    throw new Error(`Không thể lấy danh sách tin nhắn Zalo: ${err.message || err}`);
  }

  if (!conversations.length) {
    await log("info", "[Zalo Trả lời] Không có tin nhắn mới từ bạn bè.");
    return;
  }

  const stored = await chrome.storage.local.get(["zaloRepliedKeys"]);
  const repliedKeys = new Set(stored.zaloRepliedKeys || []);

  // Chỉ trả lời chat riêng, bỏ qua nhóm
  const toReply = conversations.filter((c) => c.isPrivate !== false).slice(0, sessionMax);

  if (!toReply.length) {
    await log("info", "[Zalo Trả lời] Không có hội thoại riêng mới cần trả lời.");
    return;
  }

  let replied = 0;
  for (let i = 0; i < toReply.length; i++) {
    const conv = toReply[i];
    await log("info", `[Zalo Trả lời] Đang xử lý tin nhắn từ ${conv.name || conv.id}...`);
    try {
      const msgRes = await sendToTab(tabId, {
        type: "ZALO_GET_LAST_MESSAGE",
        conversationId: conv.id,
      });
      const lastMessage = msgRes?.message || "";
      if (!lastMessage) {
        await log("warning", `[Zalo Trả lời] Không đọc được tin nhắn của ${conv.name}.`);
        continue;
      }

      const msgKey = `${conv.id}::${textKey(lastMessage)}`;
      if (repliedKeys.has(msgKey)) {
        await log("info", `[Zalo Trả lời] Đã trả lời tin này của ${conv.name}, bỏ qua.`);
        continue;
      }

      const replyText = await callZaloReplyAi(prompt, lastMessage, conv.name);
      if (!replyText) {
        await log("warning", `[Zalo Trả lời] AI không soạn được câu trả lời cho ${conv.name}.`);
        continue;
      }

      const sendRes = await sendToTab(tabId, {
        type: "ZALO_SEND_REPLY",
        conversationId: conv.id,
        text: replyText,
      });

      if (sendRes?.ok) {
        repliedKeys.add(msgKey);
        replied++;
        await log("success", `[Zalo Trả lời] ✓ Đã trả lời ${conv.name}: "${clip(replyText, 80)}"`, "message");
      } else {
        await log("warning", `[Zalo Trả lời] Không gửi được tới ${conv.name}: ${sendRes?.error || "lỗi"}`);
      }
    } catch (err) {
      await log("error", `[Zalo Trả lời] Lỗi xử lý ${conv.name}: ${err.message || err}`);
    }
    if (i < toReply.length - 1) {
      const delay = delayMin + Math.random() * (delayMax - delayMin);
      await sleep(delay * 1000);
    }
  }

  const allReplied = [...repliedKeys].slice(-500);
  await chrome.storage.local.set({ zaloRepliedKeys: allReplied });
  await log("info", `[Zalo Trả lời] Phiên hoàn tất: đã trả lời ${replied} hội thoại.`);
}

function tiktokHandleFromTarget(raw) {
  return String(raw || "")
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(?:www\.)?tiktok\.com\/@?/i, "")
    .replace(/\/.*$/, "")
    .replace(/\/$/, "");
}

function mapsPlaceKey(urlOrId) {
  const value = String(urlOrId || "").trim();
  const place = value.match(/\/maps\/place\/([^/]+)/i);
  if (place) return decodeURIComponent(place[1]).toLowerCase();
  const data = value.match(/!1s([^!]+)/);
  if (data) return data[1].toLowerCase();
  return textKey(value);
}

function tiktokSourceUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "https://www.tiktok.com/foryou";
  if (/^https?:\/\//i.test(value)) return value;
  const handle = tiktokHandleFromTarget(value);
  return handle ? `https://www.tiktok.com/@${handle}` : "https://www.tiktok.com/foryou";
}

async function focusWorkTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.windowId) {
    try {
      await chrome.windows.update(tab.windowId, { focused: true });
    } catch {
      // window might already be focused
    }
  }
  await chrome.tabs.update(tabId, { active: true });
}

async function withTabDebugger(tabId, fn) {
  const target = { tabId };
  try {
    await chrome.debugger.attach(target, "1.3");
  } catch (error) {
    const msg = String(error?.message || error);
    if (!/already attached/i.test(msg)) {
      throw new Error(
        "Không gắn được bộ gõ thật vào tab TikTok. Reload extension, chấp nhận quyền debugger, đóng DevTools trên tab đó, rồi thử lại."
      );
    }
  }
  try {
    try {
      await chrome.debugger.sendCommand(target, "Page.bringToFront");
    } catch {
      // ignore
    }
    try {
      await chrome.debugger.sendCommand(target, "Emulation.setFocusEmulationEnabled", { enabled: true });
    } catch {
      // older Chrome
    }
    return await fn(target);
  } finally {
    try {
      await chrome.debugger.sendCommand(target, "Emulation.setFocusEmulationEnabled", { enabled: false });
    } catch {
      // ignore
    }
    try {
      await chrome.debugger.detach(target);
    } catch {
      // already detached
    }
  }
}

async function cdpEvaluate(target, expression) {
  const res = await chrome.debugger.sendCommand(target, "Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  if (res?.exceptionDetails) {
    const detail = res.exceptionDetails;
    throw new Error(detail.exception?.description || detail.text || "TikTok page eval failed");
  }
  return res?.result?.value;
}

async function trustedClick(target, x, y) {
  const cx = Math.round(Number(x) || 0);
  const cy = Math.round(Number(y) || 0);
  await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: cx,
    y: cy,
    button: "none",
    pointerType: "mouse",
  });
  await sleep(40 + Math.round(Math.random() * 70));
  await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: cx,
    y: cy,
    button: "left",
    buttons: 1,
    clickCount: 1,
    pointerType: "mouse",
  });
  await sleep(35 + Math.round(Math.random() * 55));
  await chrome.debugger.sendCommand(target, "Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: cx,
    y: cy,
    button: "left",
    buttons: 0,
    clickCount: 1,
    pointerType: "mouse",
  });
}

function trustedKeyDesc(char) {
  if (char === "\n") return { key: "Enter", code: "Enter", keyCode: 13 };
  if (char === " ") return { key: " ", code: "Space", keyCode: 32 };
  const upper = char.toUpperCase();
  if (/^[a-zA-Z]$/.test(char)) return { key: char, code: `Key${upper}`, keyCode: upper.charCodeAt(0) };
  if (/^[0-9]$/.test(char)) return { key: char, code: `Digit${char}`, keyCode: char.charCodeAt(0) };
  return { key: char, code: "Unidentified", keyCode: char.codePointAt(0) || 0 };
}

const TIKTOK_EDITOR_SCRIPT = `(() => {
  function vis(el) {
    if (!(el instanceof Element)) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && s.visibility !== "hidden" && s.display !== "none";
  }
  function search(root) {
    const sels = [
      '[data-e2e="comment-input"] [contenteditable="plaintext-only"]',
      '[data-e2e="comment-input"] [contenteditable="true"]',
      '[data-e2e="comment-input"] [contenteditable]',
      '[class*="DivInputEditorContainer"] [contenteditable]',
      '[class*="DraftEditor-root"] [contenteditable]',
      '.public-DraftEditor-content[contenteditable]',
      '[data-e2e="comment-input"] textarea',
      '[contenteditable="plaintext-only"]',
    ];
    for (const sel of sels) {
      const el = root.querySelector(sel);
      if (vis(el)) return el;
    }
    for (const node of root.querySelectorAll("*")) {
      if (node.shadowRoot) {
        const found = search(node.shadowRoot);
        if (found) return found;
      }
    }
    return null;
  }
  function findPost() {
    const direct = document.querySelector('[data-e2e="comment-post"], [data-e2e="comment-publish"], [class*="DivPostButton"]');
    if (vis(direct)) return direct;
    return Array.from(document.querySelectorAll("button, [role='button']")).find((el) => {
      if (!vis(el)) return false;
      return /^(đăng|post|send)$/i.test((el.innerText || "").trim());
    }) || null;
  }
  function boxOf(el, xr, yr) {
    const r = el.getBoundingClientRect();
    return {
      x: r.left + Math.max(6, Math.min(r.width - 6, r.width * xr)),
      y: r.top + Math.max(6, Math.min(r.height - 6, r.height * yr)),
      w: r.width,
      h: r.height,
    };
  }
  function textOf(el) {
    if (!el) return "";
    const raw = el.value != null && el.value !== undefined && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
      ? el.value
      : (el.innerText || el.textContent || "");
    return String(raw).replace(/[\\u200b\\u200c\\u200d\\ufeff]/g, " ").replace(/\\s+/g, " ").trim();
  }
  function openPanel() {
    const btn = document.querySelector('[data-e2e="comment-icon"], [data-e2e="browse-comment-icon"]');
    if (vis(btn)) btn.click();
    const box = document.querySelector('[data-e2e="comment-input"]');
    if (vis(box)) box.click();
  }
  function focusEditor(el) {
    el.scrollIntoView({ block: "center", inline: "nearest" });
    el.click();
    el.focus();
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) {}
  }
  function snapshot() {
    const editor = search(document);
    const post = findPost();
    const active = document.activeElement;
    return {
      hasEditor: Boolean(editor),
      focused: Boolean(editor && (active === editor || editor.contains(active))),
      editorText: textOf(editor),
      activeTag: active ? (active.getAttribute("contenteditable") || active.tagName) : "",
      editorBox: editor ? boxOf(editor, 0.28, 0.5) : null,
      postBox: post ? boxOf(post, 0.5, 0.5) : null,
      postDisabled: post
        ? post.getAttribute("aria-disabled") === "true" ||
          Boolean(post.disabled) ||
          /disable|inactive|not-allow/i.test(String(post.className || ""))
        : true,
    };
  }
  window.__saTtEditor = { search, findPost, boxOf, textOf, openPanel, focusEditor, snapshot };
  return snapshot();
})()`;

async function cdpTiktokSnapshot(target) {
  return cdpEvaluate(target, TIKTOK_EDITOR_SCRIPT);
}

async function cdpFocusTiktokEditor(target) {
  return cdpEvaluate(
    target,
    `${TIKTOK_EDITOR_SCRIPT};
    (() => {
      const api = window.__saTtEditor;
      let el = api.search(document);
      if (!el) {
        api.openPanel();
        return { opened: true, hasEditor: false };
      }
      api.focusEditor(el);
      return api.snapshot();
    })()`
  );
}

async function trustedTypeText(target, text) {
  const chars = [...String(text || "")];
  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];
    const desc = trustedKeyDesc(char);
    const isEnter = char === "\n";
    if (isEnter) {
      await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
        type: "rawKeyDown",
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
      });
      await chrome.debugger.sendCommand(target, "Input.insertText", { text: "\n" });
      await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "Enter",
        code: "Enter",
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
      });
    } else {
      await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
        type: "rawKeyDown",
        key: desc.key,
        code: desc.code,
        windowsVirtualKeyCode: desc.keyCode,
        nativeVirtualKeyCode: desc.keyCode,
      });
      await chrome.debugger.sendCommand(target, "Input.insertText", { text: char });
      await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
        type: "keyUp",
        key: desc.key,
        code: desc.code,
        windowsVirtualKeyCode: desc.keyCode,
        nativeVirtualKeyCode: desc.keyCode,
      });
    }
    let delay = 70 + Math.round(Math.random() * 120);
    if (char === " ") delay += 40 + Math.round(Math.random() * 70);
    if (/[.,!?;:]/.test(char)) delay += 120 + Math.round(Math.random() * 180);
    if (i > 6 && Math.random() < 0.07) delay += 240 + Math.round(Math.random() * 360);
    await sleep(delay);
  }
}

async function postTiktokCommentTrusted(tabId, text, postKey) {
  await focusWorkTab(tabId);
  await sleep(250);
  try {
    await sendToTab(tabId, { type: "PREPARE_TIKTOK_COMMENT" });
  } catch {
    // panel may already be open; CDP will open it
  }

  await withTabDebugger(tabId, async (target) => {
    let snap = await cdpFocusTiktokEditor(target);
    if (!snap?.hasEditor) {
      await sleep(900);
      snap = await cdpFocusTiktokEditor(target);
    }
    if (!snap?.hasEditor || !snap.editorBox) {
      throw new Error("Không tìm thấy ô bình luận TikTok trong trang (contenteditable).");
    }

    await trustedClick(target, snap.editorBox.x, snap.editorBox.y);
    await sleep(180);
    snap = await cdpFocusTiktokEditor(target);
    if (!snap?.focused) {
      await trustedClick(target, snap.editorBox.x, snap.editorBox.y);
      await sleep(160);
      snap = await cdpTiktokSnapshot(target);
    }

    await log("info", "Đã focus ô bình luận TikTok, đang gõ từng ký tự...");
    await trustedTypeText(target, text);

    snap = await cdpTiktokSnapshot(target);
    if (!String(snap?.editorText || "").trim()) {
      await cdpFocusTiktokEditor(target);
      await chrome.debugger.sendCommand(target, "Input.insertText", { text });
      await sleep(400);
      snap = await cdpTiktokSnapshot(target);
    }
    if (!String(snap?.editorText || "").trim()) {
      throw new Error("TikTok vẫn không nhận chữ sau khi gõ bằng phím hệ thống. Hãy đóng DevTools, để tab TikTok hiện trên màn hình, rồi thử lại.");
    }

    const started = Date.now();
    while (Date.now() - started < 7000) {
      snap = await cdpTiktokSnapshot(target);
      if (snap?.postBox && snap.postDisabled === false) break;
      await sleep(220);
    }
    if (!snap?.postBox) throw new Error("Không tìm thấy nút Đăng bình luận TikTok.");
    if (snap.postDisabled !== false && !String(snap.editorText || "").trim()) {
      throw new Error(`Đã gõ được "${clip(snap.editorText, 40)}" nhưng nút Đăng vẫn tắt.`);
    }
    await sleep(180 + Math.round(Math.random() * 220));
    await trustedClick(target, snap.postBox.x, snap.postBox.y);
  });

  await sleep(1700);
  const done = await sendToTab(tabId, { type: "TIKTOK_COMMENT_STATUS" });
  const typedHead = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
  const left = String(done?.editorText || "").slice(0, 24);
  if (typedHead && left && left === typedHead) {
    throw new Error("TikTok chưa nhận bình luận (ô nhập vẫn còn nội dung).");
  }
  return { ok: true, postKey, text };
}

// ---------------- YouTube: gõ bình luận bằng bộ gõ thật (CDP trusted input) ----------------
// Khử isTrusted=false: keystroke do trình duyệt sinh ra qua Input.dispatchKeyEvent/insertText nên
// event.isTrusted === true — giống hệt người gõ. Content script vẫn lo điều hướng DOM + xác minh,
// chỉ đẩy phần "gõ chữ" (tín hiệu behavioral biometric cao nhất) sang đây.
const YOUTUBE_EDITOR_SCRIPT = `(() => {
  function vis(el) {
    if (!(el instanceof Element)) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && s.visibility !== "hidden" && s.display !== "none";
  }
  function findEditor() {
    const sels = [
      "#contenteditable-root[contenteditable='true']",
      "ytd-comment-simplebox-renderer #contenteditable-root",
      "#contenteditable-root",
    ];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (vis(el)) return el;
    }
    return null;
  }
  function textOf(el) {
    if (!el) return "";
    return String(el.innerText || el.textContent || "")
      .replace(/[\\u200b\\u200c\\u200d\\ufeff]/g, "")
      .replace(/\\s+/g, " ")
      .trim();
  }
  function focusEditor(el) {
    el.scrollIntoView({ block: "center", inline: "nearest" });
    el.click();
    el.focus();
    // Xoá nội dung cũ (nếu lỡ còn) rồi đặt caret cuối ô để insertText nối tiếp đúng chỗ.
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("selectAll", false, null);
      document.execCommand("delete", false, null);
    } catch (e) {}
    try {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) {}
  }
  window.__saYtEditor = { findEditor, textOf, focusEditor, vis };
  const el = findEditor();
  const active = document.activeElement;
  return {
    hasEditor: Boolean(el),
    focused: Boolean(el && (active === el || el.contains(active))),
    editorText: textOf(el),
  };
})()`;

async function cdpYoutubeSnapshot(target) {
  return cdpEvaluate(target, YOUTUBE_EDITOR_SCRIPT);
}

async function cdpFocusYoutubeEditor(target) {
  return cdpEvaluate(
    target,
    `${YOUTUBE_EDITOR_SCRIPT};
    (() => {
      const api = window.__saYtEditor;
      const el = api.findEditor();
      if (!el) return { hasEditor: false };
      api.focusEditor(el);
      const active = document.activeElement;
      return {
        hasEditor: true,
        focused: Boolean(active === el || el.contains(active)),
        editorText: api.textOf(el),
      };
    })()`
  );
}

// Gõ text vào ô bình luận YouTube bằng bộ gõ thật. Trả về text hiện có trong ô sau khi gõ để
// content script tự xác minh (và rơi về bộ gõ tổng hợp nếu CDP không lấy được chữ).
async function typeYoutubeCommentTrusted(tabId, text) {
  if (!tabId) throw new Error("Thiếu tab YouTube để gõ bằng bộ gõ thật.");
  const want = String(text || "");
  if (!want.trim()) throw new Error("Nội dung bình luận YouTube rỗng.");
  await focusWorkTab(tabId);
  await sleep(200);
  return await withTabDebugger(tabId, async (target) => {
    let snap = await cdpFocusYoutubeEditor(target);
    if (!snap?.hasEditor) {
      await sleep(700);
      snap = await cdpFocusYoutubeEditor(target);
    }
    if (!snap?.hasEditor) {
      throw new Error("Không tìm thấy ô nhập bình luận YouTube (contenteditable) để gõ bằng bộ gõ thật.");
    }
    await sleep(150);
    await trustedTypeText(target, want);
    await sleep(220);
    snap = await cdpYoutubeSnapshot(target);
    return { ok: true, editorText: String(snap?.editorText || "") };
  });
}

async function runTiktokCommentOnce() {
  const state = await withProjectFallbacks(await getState(), ["tiktokSourcesText"]);
  const sources = parseUrlList(state.tiktokSourcesText);
  const targetUrl = sources.length ? tiktokSourceUrl(sources[Math.floor(Math.random() * sources.length)]) : "https://www.tiktok.com/foryou";
  const tab = await openWorkTab(targetUrl, { active: true, tabIdKey: "tiktokWorkTabId" });
  await sleep(2500);
  const ping = await sendToTab(tab.id, { type: "PING" });
  if (ping?.state && ping.state !== "ok") throw new Error(ping.error || "TikTok không sẵn sàng.");

  await log("info", "Đang lướt TikTok tìm video có trên 5 bình luận...");
  let workTab = tab;
  let ctx = await sendToTab(workTab.id, {
    type: "FIND_TIKTOK_COMMENT_TARGET",
    skipKeys: state.tiktokCommentedKeys || [],
    minComments: 6,
    maxScrolls: 20,
  });
  if (ctx?.nextUrl) {
    workTab = await openWorkTab(ctx.nextUrl, { active: true, tabIdKey: "tiktokWorkTabId" });
    await sleep(2800);
    ctx = await sendToTab(workTab.id, {
      type: "FIND_TIKTOK_COMMENT_TARGET",
      skipKeys: state.tiktokCommentedKeys || [],
      minComments: 6,
      maxScrolls: 20,
    });
  }
  if (ctx?.skipped) {
    await log("info", "Video TikTok này đã từng bình luận. Bỏ qua.");
    return;
  }
  if (!ctx?.ok || !ctx?.postText) {
    throw new Error(ctx?.error || "Không tìm được video TikTok có trên 5 bình luận.");
  }

  await log("info", `Video của @${ctx.author || "user"} có ${ctx.commentCount || "?"} bình luận. Đang gọi AI...`);
  const commentText = await generateAiComment(
    state.tiktokAiSystemPrompt || DEFAULT_TIKTOK_AI_SYSTEM_PROMPT,
    buildTiktokAiUserMessage(ctx),
    { platform: "tiktok" }
  );
  if (!commentText) throw new Error("AI không trả về bình luận TikTok.");

  await log("info", "Đang gõ bình luận TikTok như người dùng thật...");
  const postRes = await postTiktokCommentTrusted(workTab.id, commentText, ctx.postKey);
  if (!postRes?.ok) throw new Error(postRes?.error || "Không gửi được bình luận TikTok.");

  const commented = [ctx.postKey, ...(state.tiktokCommentedKeys || []).filter((k) => k !== ctx.postKey)].slice(0, MAX_HISTORY);
  await chrome.storage.local.set({ tiktokCommentedKeys: commented });
  await log("success", `Bình luận TikTok thành công (${ctx.commentCount || "?"} cmt sẵn): ${clip(commentText, 80)}`, "comment", await tabLink(workTab));
}

async function runTiktokScrollOnce() {
  const state = await getState();
  const tab = await openWorkTab("https://www.tiktok.com/foryou", { active: true, tabIdKey: "tiktokWorkTabId" });
  await sleep(2500);
  const res = await sendToTab(tab.id, {
    type: "SCROLL_TIKTOK_FEED",
    rounds: state.tiktokScrollRounds || 8,
    autoLike: state.tiktokScrollLike !== false,
    likeDelay: state.tiktokScrollLikeDelay || 4,
  });
  if (!res?.ok) throw new Error(res?.error || "Không lướt được TikTok.");
  await log("success", `Đã lướt ${res.scrolled || 0} video TikTok, thả tim ${res.likedCount || 0} video.`);
}

async function runTiktokFollowOnce() {
  const state = await getState();
  const targets = parseUrlList(state.tiktokFollowTargetsText);
  const followed = new Set((state.tiktokFollowedKeys || []).map((k) => String(k).toLowerCase()));
  const available = targets.filter((t) => !followed.has(tiktokHandleFromTarget(t).toLowerCase()));
  // Danh sách chỉ định trống hoặc đã follow hết: tìm người đăng video về chủ đề dự án theo từ khoá.
  const raw = available[0] || (await pickDiscoveredFollowHandle("tiktok", state.tiktokFollowedKeys));
  if (!raw) return;
  const handle = tiktokHandleFromTarget(raw);
  if (!handle) throw new Error("Tên tài khoản TikTok không hợp lệ.");
  const profileUrl = `https://www.tiktok.com/@${handle}`;
  const tab = await openWorkTab(profileUrl, { active: true, tabIdKey: "tiktokWorkTabId" });
  await sleep(2500);
  const res = await sendToTab(tab.id, { type: "FOLLOW_TIKTOK_USER" });
  if (!res?.ok) throw new Error(res?.error || "Không follow được tài khoản TikTok.");
  if (res.skipped) {
    await log("info", `Đã follow trước đó: @${handle}`);
  } else {
    await log("success", `Follow TikTok thành công: @${handle}`, "follow", `https://www.tiktok.com/@${handle}`);
  }
  const keys = [handle.toLowerCase(), ...(state.tiktokFollowedKeys || [])].slice(0, MAX_HISTORY);
  await chrome.storage.local.set({ tiktokFollowedKeys: keys });
}

async function runMapsReviewOnce() {
  const state = await getState();
  const places = parseUrlList(state.mapsReviewPlacesText);
  if (!places.length) throw new Error("Chưa có danh sách địa điểm Google Maps (mỗi dòng 1 link).");
  const reviewed = new Set(state.mapsReviewedKeys || []);
  const remaining = places.filter((p) => !reviewed.has(mapsPlaceKey(p)));
  if (!remaining.length) {
    await log("info", "Đã đánh giá hết danh sách địa điểm Google Maps.");
    return;
  }
  const placeUrl = remaining[0];
  const tab = await openWorkTab(placeUrl, { active: true, tabIdKey: "mapsWorkTabId" });
  await sleep(3000);
  const ping = await sendToTab(tab.id, { type: "PING" });
  if (ping?.state && ping.state !== "ok") throw new Error(ping.error || "Google Maps không sẵn sàng.");

  const ctx = await sendToTab(tab.id, { type: "EXTRACT_MAPS_PLACE" });
  if (!ctx?.ok || !ctx.name) throw new Error("Không lấy được thông tin địa điểm Google Maps.");

  const placeKey = ctx.placeKey || mapsPlaceKey(placeUrl);
  if (reviewed.has(placeKey)) {
    await log("info", `Đã đánh giá ${ctx.name} trước đó. Bỏ qua.`);
    return;
  }

  await log("info", `Đang gọi AI viết đánh giá cho ${ctx.name}...`);
  const reviewText = await generateAiComment(
    state.mapsReviewAiSystemPrompt || DEFAULT_MAPS_REVIEW_AI_PROMPT,
    buildMapsReviewUserMessage(ctx)
  );
  if (!reviewText) throw new Error("AI không trả về nội dung đánh giá.");

  const stars = Math.min(5, Math.max(1, Number(state.mapsReviewStars) || 5));
  const postRes = await sendToTab(tab.id, {
    type: "CREATE_MAPS_REVIEW",
    text: reviewText,
    stars,
  });
  if (!postRes?.ok) throw new Error(postRes?.error || "Không gửi được đánh giá Google Maps.");

  const keys = [placeKey, ...(state.mapsReviewedKeys || [])].slice(0, MAX_HISTORY);
  await chrome.storage.local.set({ mapsReviewedKeys: keys });
  await log("success", `Đã đánh giá ${ctx.name} (${stars}★): ${clip(reviewText, 80)}`, "review", (await tabLink(tab)) || placeUrl);
}

async function runMapsSearchOnce() {
  const state = await getState();
  const keywords = parseUrlList(state.mapsSearchKeywordsText);
  if (!keywords.length) throw new Error("Chưa có từ khoá tìm địa điểm Google Maps.");
  const searched = new Set(state.mapsSearchedKeys || []);
  const keyword = keywords[Math.floor(Math.random() * keywords.length)];
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(keyword)}`;
  const tab = await openWorkTab(searchUrl, { active: true, tabIdKey: "mapsWorkTabId" });
  await sleep(3500);

  const sessionMax = Math.min(5, Math.max(1, Number(state.mapsSearchSessionMax) || 2));
  const res = await sendToTab(tab.id, {
    type: "MAPS_SEARCH_PLACES",
    skipKeys: [...searched],
    limit: sessionMax,
  });
  const places = res?.places || [];
  if (!places.length) throw new Error(`Không tìm thấy địa điểm cho từ khoá "${keyword}".`);

  let opened = 0;
  let reviewed = 0;
  const nextKeys = [...searched];
  for (const place of places) {
    const key = place.placeKey || mapsPlaceKey(place.href || place.name);
    if (nextKeys.includes(key)) continue;
    await log("info", `[Maps] Mở địa điểm: ${place.name || key}`);
    const openRes = await sendToTab(tab.id, { type: "MAPS_OPEN_PLACE", href: place.href, name: place.name });
    if (!openRes?.ok) {
      await log("warning", `[Maps] Không mở được ${place.name}: ${openRes?.error || "lỗi"}`);
      continue;
    }
    opened++;
    nextKeys.unshift(key);
    await sleep(2500);

    if (state.mapsSearchAutoReview) {
      const ctx = await sendToTab(tab.id, { type: "EXTRACT_MAPS_PLACE" });
      if (ctx?.ok && ctx.name) {
        const reviewText = await generateAiComment(
          state.mapsReviewAiSystemPrompt || DEFAULT_MAPS_REVIEW_AI_PROMPT,
          buildMapsReviewUserMessage(ctx)
        );
        const stars = Math.min(5, Math.max(1, Number(state.mapsReviewStars) || 5));
        const postRes = await sendToTab(tab.id, { type: "CREATE_MAPS_REVIEW", text: reviewText, stars });
        if (postRes?.ok) {
          reviewed++;
          const reviewedKeys = [ctx.placeKey || key, ...(state.mapsReviewedKeys || [])].slice(0, MAX_HISTORY);
          await chrome.storage.local.set({ mapsReviewedKeys: reviewedKeys });
          await log("success", `[Maps] Đã đánh giá ${ctx.name}: ${clip(reviewText, 80)}`, "review", await tabLink(tab));
        }
      }
    }
  }

  await chrome.storage.local.set({ mapsSearchedKeys: nextKeys.slice(0, MAX_HISTORY) });
  await log("success", `[Maps] Từ khoá "${keyword}": đã mở ${opened} địa điểm${reviewed ? `, đánh giá ${reviewed}` : ""}.`);
}

function pickXReplyContent(state, commentText) {
  if (state.xReplyAi) {
    return { ai: true, commentText };
  }
  const templates = parseTemplates(state.xReplyTemplatesText);
  if (!templates.length) throw new Error("Chưa có mẫu trả lời. Dán mẫu cách nhau bởi ** hoặc bật AI.");
  const used = new Set(state.xRepliedKeys || []);
  const fresh = templates.filter((t) => !used.has(textKey(t)));
  const pool = fresh.length ? fresh : templates;
  return { ai: false, text: pool[Math.floor(Math.random() * pool.length)] };
}

// Luồng Trả lời bình luận cho X — bản sao 1:1 của runThreadsReplyOnce, chỉ
// đổi message type (EXTRACT_X_REPLY_TARGET/REPLY_X_COMMENT) và tên field.
async function runXReplyOnce() {
  const state = await withProjectFallbacks(await getState(), ["xReplySourcesText", "xReplyFilterPrompt"]);
  const explicitSources = parseUrlList(state.xReplySourcesText);
  const isBrowsingFeed = explicitSources.length === 0;
  const sources = isBrowsingFeed ? ["https://x.com/home"] : explicitSources;
  const startIndex = Math.min(Number(state.xReplySourceIndex) || 0, sources.length - 1);
  let lastError = null;
  const replySkipKeys = [...(state.xRepliedKeys || []), ...(state.xFilteredOutReplyKeys || [])];

  for (let i = 0; i < sources.length; i += 1) {
    const sourceUrl = sources[(startIndex + i) % sources.length];
    try {
      let tab = await openWorkTab(sourceUrl, { active: true, tabIdKey: "xWorkTabId" });
      const ping = await sendToTab(tab.id, { type: "PING" });
      if (ping?.state && ping.state !== "ok") throw new Error(ping.error || "X (Twitter) không sẵn sàng.");

      let ctx = await sendToTab(tab.id, {
        type: "EXTRACT_X_REPLY_TARGET",
        skipKeys: replySkipKeys,
      });
      if (!ctx?.ok && !ctx?.candidates?.length && !ctx?.nextUrl) {
        throw new Error(ctx?.error || "Không tìm được bình luận để trả lời.");
      }

      if (ctx.isFeed || ctx.nextUrl || ctx.candidates?.length) {
        const candidateUrls = Array.isArray(ctx.candidates) && ctx.candidates.length
          ? ctx.candidates
          : [ctx.nextUrl].filter(Boolean);

        let foundValidComment = false;
        const maxCandidatesToTry = Math.min(candidateUrls.length, 6);

        for (let cIdx = 0; cIdx < maxCandidatesToTry; cIdx += 1) {
          const postUrl = candidateUrls[cIdx];
          await log("info", `Đang kiểm tra Tweet (${cIdx + 1}/${maxCandidatesToTry}) để tìm bình luận: ${clip(postUrl, 50)}`);
          tab = await openWorkTab(postUrl, { active: true, tabIdKey: "xWorkTabId" });
          const postPing = await sendToTab(tab.id, { type: "PING" });
          if (postPing?.state && postPing.state !== "ok") continue;

          const postCtx = await sendToTab(tab.id, {
            type: "EXTRACT_X_REPLY_TARGET",
            skipKeys: replySkipKeys,
          });

          if (postCtx?.ok && postCtx.replyKey) {
            ctx = postCtx;
            foundValidComment = true;
            break;
          } else if (postCtx?.noComments) {
            await log("info", `Tweet ${clip(postUrl, 45)} chưa có bình luận, chuyển Tweet tiếp theo...`);
          }
        }

        if (!foundValidComment) {
          throw new Error(`Đã thử ${maxCandidatesToTry} Tweet trên bảng tin nhưng không có Tweet nào có bình luận.`);
        }
      } else if (!ctx.ok) {
        throw new Error(ctx?.error || "Không tìm được bình luận để trả lời.");
      }

      const replyFilterPrompt = String(state.xReplyFilterPrompt || "").trim();
      if (replyFilterPrompt) {
        await log("info", "Đang đánh giá nội dung theo tiêu chí đã chỉ định...");
        await setXHud(tab, "Đang đánh giá nội dung...");
        const gate = await evaluateXContentGate({
          filterPrompt: replyFilterPrompt,
          ignoreOnError: Boolean(state.xReplyFilterIgnoreOnError),
          ctx,
        });
        if (!gate.allowed) {
          const rejectedKeys = ctx.replyKeys || [ctx.replyKey];
          if (rejectedKeys.length) {
            const latest = await getState();
            const xFilteredOutReplyKeys = rememberThreadsKeys(latest.xFilteredOutReplyKeys, rejectedKeys);
            await chrome.storage.local.set({ xFilteredOutReplyKeys });
          }
          throw new Error("Bình luận này không thuộc phạm vi được phép trả lời, sẽ thử nguồn khác lần sau.");
        }
      }

      const content = pickXReplyContent(state, ctx.commentText);
      let text = "";
      if (content.ai) {
        await log("info", "Đang gọi AI để viết trả lời bình luận X...");
        await setXHud(tab, "Đang tạo trả lời bằng AI...");
        await sleep(600 + Math.round(Math.random() * 1400));
        const ownPost = String(ctx.postText || "").trim();
        const userMsg = [
          ...(ownPost ? ["Tweet của bạn trên X:", ownPost, ""] : []),
          "Bình luận của người dùng trên X:",
          String(ctx.commentText || "").trim() || "(bình luận chủ yếu là ảnh/video)",
          "",
          "Hãy trả lời bình luận này như chủ tweet đang nói chuyện với họ: ngắn, thật, bám đúng điều họ vừa nói.",
          "Chỉ trả về đúng nội dung reply. Không giải thích, không markdown, không bọc ngoặc kép. Tối đa 280 ký tự.",
        ].join("\n");
        try {
          text = await generateAiComment(state.xReplyAiSystemPrompt || DEFAULT_X_REPLY_AI_PROMPT, userMsg, {
            platform: "x",
            kind: "reply",
          });
        } catch (aiErr) {
          await log("warning", `AI tạo trả lời không thành công (${aiErr?.message || aiErr}). Đang chuyển sang mẫu dự phòng...`);
        }
        if (!text) {
          const templates = parseTemplates(state.xReplyTemplatesText);
          if (templates.length) {
            const used = new Set(state.xRepliedKeys || []);
            const fresh = templates.filter((t) => !used.has(textKey(t)));
            const pool = fresh.length ? fresh : templates;
            text = pool[Math.floor(Math.random() * pool.length)];
            await log("info", "Đã lấy nội dung trả lời từ mẫu dự phòng.");
          }
        }
        if (!text) throw new Error("AI không trả về nội dung trả lời và không có mẫu dự phòng.");
      } else {
        text = content.text;
      }
      if (!text) throw new Error("Không có nội dung để trả lời bình luận.");

      const res = await sendToTab(tab.id, {
        type: "REPLY_X_COMMENT",
        text,
        replyKey: ctx.replyKey,
      });
      if (!res?.ok) throw new Error(res?.error || "Không gửi được trả lời bình luận X.");

      const keys = rememberThreadsKeys(state.xRepliedKeys, ctx.replyKeys || [ctx.replyKey]);
      await chrome.storage.local.set({
        xRepliedKeys: keys,
        xReplySourceIndex: (startIndex + i + 1) % sources.length,
      });
      await log("success", `Đã trả lời bình luận X: ${clip(text, 80)}`, "reply", await tabLink(tab));
      return;
    } catch (error) {
      lastError = error;
      await log("error", `Trả lời bình luận X thất bại ở nguồn ${sourceUrl}: ${error?.message || error}`);
    }
  }
  if (lastError) throw lastError;
}

async function openWorkTab(url, options = {}) {
  const active = Boolean(options.active);
  const tabIdKey = options.tabIdKey || "workTabId";
  const state = await getState();
  let tab = null;
  if (state[tabIdKey]) {
    try {
      tab = await chrome.tabs.get(state[tabIdKey]);
    } catch {
      tab = null;
    }
  }
  if (tab) {
    const current = (tab.url || "").split("?")[0].replace(/\/$/, "");
    const target = url.split("?")[0].replace(/\/$/, "");
    if (current === target) await chrome.tabs.reload(tab.id);
    else await chrome.tabs.update(tab.id, { url, active });
    if (active && !tab.active) await chrome.tabs.update(tab.id, { active: true });
  } else {
    tab = await chrome.tabs.create({ url, active });
    await chrome.storage.local.set({ [tabIdKey]: tab.id });
  }
  await waitForTabComplete(tab.id, url);
  await sleep(1500);
  await ensureContentScript(tab.id, url);
  return chrome.tabs.get(tab.id);
}

function tabLooksReady(tab, expectedUrl) {
  if (!tab || tab.status !== "complete") return false;
  const href = tab.url || tab.pendingUrl || "";
  if (!expectedUrl) return Boolean(href);
  if (isThreadsUrl(expectedUrl)) return isThreadsUrl(href);
  if (/facebook\.com/i.test(expectedUrl)) return /facebook\.com/i.test(href);
  return true;
}

function waitForTabComplete(tabId, expectedUrl) {
  return new Promise((resolve) => {
    const started = Date.now();
    let finished = false;
    let sawLoading = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const listener = (id, info) => {
      if (id !== tabId) return;
      if (info.status === "loading") sawLoading = true;
      if (info.status === "complete" && (sawLoading || Date.now() - started > 800)) {
        chrome.tabs.get(tabId).then((tab) => {
          if (tabLooksReady(tab, expectedUrl) || Date.now() - started > 8000) finish();
        }).catch(finish);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    const timer = setInterval(async () => {
      if (Date.now() - started > 25000) {
        clearInterval(timer);
        finish();
        return;
      }
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tabLooksReady(tab, expectedUrl) && Date.now() - started > 1800) {
          clearInterval(timer);
          finish();
        }
      } catch {
        clearInterval(timer);
        finish();
      }
    }, 300);
  });
}

function detectPlatform(url) {
  const u = String(url || "");
  if (!u || u.startsWith("chrome:") || u.startsWith("about:")) return "";
  if (isThreadsUrl(u)) return "threads";
  if (/youtube\.com/i.test(u)) return "youtube";
  if (/instagram\.com/i.test(u)) return "instagram";
  if (/\b(x\.com|twitter\.com)\b/i.test(u)) return "x";
  if (/chat\.zalo\.me/i.test(u)) return "zalo";
  if (/tiktok\.com/i.test(u)) return "tiktok";
  if (/google\.[^/]+\/maps|maps\.google\./i.test(u)) return "maps";
  if (/facebook\.com/i.test(u)) return "facebook";
  return "";
}

const PLATFORM_SCRIPTS = {
  threads: "threads-content.js",
  youtube: "youtube-content.js",
  instagram: "instagram-content.js",
  x: "x-content.js",
  zalo: "zalo-content.js",
  tiktok: "tiktok-content.js",
  maps: "maps-content.js",
  facebook: "content.js",
};

const PLATFORM_ERROR_HINTS = {
  threads: "Không gắn được vào trang Threads. Hãy mở threads.com, đăng nhập bằng Instagram, rồi thử lại.",
  youtube: "Không gắn được vào trang YouTube. Hãy mở youtube.com, đăng nhập, rồi thử lại.",
  instagram: "Không gắn được vào trang Instagram. Hãy mở instagram.com, đăng nhập, rồi thử lại.",
  x: "Không gắn được vào trang X. Hãy mở x.com, đăng nhập, rồi thử lại.",
  zalo: "Không gắn được vào Zalo Web. Hãy mở chat.zalo.me, đăng nhập, rồi thử lại.",
  tiktok: "Không gắn được vào TikTok. Hãy mở tiktok.com, đăng nhập, rồi thử lại.",
  maps: "Không gắn được vào Google Maps. Hãy mở google.com/maps, đăng nhập Google, rồi thử lại.",
  facebook: "Không gắn được vào trang Facebook. Hãy mở Facebook, đăng nhập, rồi thử lại.",
};

async function ensureContentScript(tabId, expectedUrl) {
  for (let i = 0; i < 14; i += 1) {
    let tabUrl = "";
    try {
      const tab = await chrome.tabs.get(tabId);
      tabUrl = tab.url || tab.pendingUrl || "";
    } catch {
      // ignore
    }
    const wantPlatform = detectPlatform(tabUrl) || detectPlatform(expectedUrl);
    if (!wantPlatform) {
      await sleep(400);
      continue;
    }
    try {
      const ping = await chrome.tabs.sendMessage(tabId, { type: "PING" });
      if (ping?.ok && (ping.platform || "facebook") === wantPlatform) return ping;
    } catch {
      // not injected yet
    }
    if (wantPlatform === "facebook") {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          world: "MAIN",
          files: ["sniff.js"],
        });
      } catch {
        // restricted page
      }
    }
    if (wantPlatform === "tiktok") {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          world: "MAIN",
          files: ["tiktok-page.js"],
        });
      } catch {
        // restricted page
      }
    }
    try {
      const scriptFile = PLATFORM_SCRIPTS[wantPlatform] || "content.js";
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [scriptFile],
      });
    } catch {
      // restricted page
    }
    await sleep(400);
  }
  const wantPlatform = detectPlatform(expectedUrl);
  throw new Error(
    PLATFORM_ERROR_HINTS[wantPlatform] || "Không gắn được vào trang web. Hãy mở trang, đăng nhập, rồi thử lại."
  );
}

function hintUrlForPayload(payload) {
  const type = payload?.type || "";
  if (type.includes("THREADS")) return "https://www.threads.com/";
  if (type.includes("YOUTUBE")) return "https://www.youtube.com/";
  if (type.includes("INSTAGRAM")) return "https://www.instagram.com/";
  if (type.includes("X_") || type.startsWith("CREATE_X") || type.startsWith("SCROLL_X") || type.startsWith("FOLLOW_X")) return "https://x.com/";
  if (type.includes("ZALO")) return "https://chat.zalo.me/";
  if (type.includes("TIKTOK")) return "https://www.tiktok.com/";
  if (type.includes("MAPS")) return "https://www.google.com/maps";
  return "";
}

async function sendToTab(tabId, payload) {
  const hintUrl = hintUrlForPayload(payload);
  await ensureContentScript(tabId, hintUrl);
  const mutating =
    payload?.type === "CREATE_POST" ||
    payload?.type === "CREATE_COMMENT" ||
    payload?.type === "CREATE_THREADS_COMMENT" ||
    payload?.type === "CREATE_THREADS_POST" ||
    payload?.type === "REPLY_THREADS_COMMENT" ||
    payload?.type === "FOLLOW_THREADS_USER" ||
    payload?.type === "JOIN_GROUP" ||
    payload?.type === "LEAVE_GROUP" ||
    payload?.type === "CREATE_YOUTUBE_COMMENT" ||
    payload?.type === "SUBSCRIBE_YOUTUBE_CHANNEL" ||
    payload?.type === "CREATE_INSTAGRAM_COMMENT" ||
    payload?.type === "FOLLOW_INSTAGRAM_USER" ||
    payload?.type === "CREATE_X_COMMENT" ||
    payload?.type === "CREATE_X_POST" ||
    payload?.type === "FOLLOW_X_USER" ||
    payload?.type === "ZALO_ADD_FRIEND" ||
    payload?.type === "ZALO_SEND_MESSAGE" ||
    payload?.type === "ZALO_SEND_REPLY" ||
    payload?.type === "CREATE_TIKTOK_COMMENT" ||
    payload?.type === "PREPARE_TIKTOK_COMMENT" ||
    payload?.type === "FOLLOW_TIKTOK_USER" ||
    payload?.type === "CREATE_MAPS_REVIEW" ||
    payload?.type === "MAPS_OPEN_PLACE";
  try {
    return await chrome.tabs.sendMessage(tabId, payload);
  } catch (error) {
    if (mutating) throw error;
    await sleep(800);
    await ensureContentScript(tabId, hintUrl);
    try {
      return await chrome.tabs.sendMessage(tabId, payload);
    } catch {
      throw new Error(error.message || "Mất kết nối với tab đang chạy.");
    }
  }
}

async function failAndMaybeStop(message) {
  await log("error", message);
  const { enabled } = await getState();
  if (enabled) await stop(message);
}

function isHiddenActivityLog(message) {
  return /telegram|cookie|cache logs|nhận diện phiên|bot_token|id_group/i.test(String(message || ""));
}

function publicActivityLogs(logs) {
  return (logs || []).filter((entry) => !isHiddenActivityLog(entry?.message));
}

// event: khoá trong NOTIFY_EVENTS (notify-bg.js) để báo Telegram khi người dùng bật; lỗi tự tính là "error".
// link: đường dẫn tới bài / video / trang vừa thao tác, gửi kèm thông báo Telegram để bấm vào xem.
async function log(level, message, event, link) {
  if (isHiddenActivityLog(message)) return;
  const state = await getState();
  const entry = { id: `${Date.now()}-${Math.random()}`, t: Date.now(), level, message };
  const logs = [entry, ...publicActivityLogs(state.logs)].slice(0, MAX_LOGS);
  await chrome.storage.local.set({ logs });
  const notify = event || (level === "error" ? "error" : "");
  if (notify) queueNotifyEvent(notify, message, link);
}

/**
 * URL hiện tại của tab vừa thao tác (bài / video đang mở), dùng làm link trong thông báo.
 * Bỏ qua trang chủ / feed vì không chỉ tới nội dung cụ thể nào.
 */
async function tabLink(tab) {
  if (!tab?.id) return "";
  const current = await chrome.tabs.get(tab.id).catch(() => null);
  try {
    const url = new URL(current?.url || "");
    if (!/^https?:$/.test(url.protocol)) return "";
    if (/^\/(home|feed|foryou|explore)?\/?$/i.test(url.pathname) && !url.search) return "";
    return url.href;
  } catch {
    return "";
  }
}

async function refreshBadge() {
  const state = await getState();
  if (state.membershipEnabled) {
    await chrome.action.setBadgeBackgroundColor({ color: "#4ea1ff" });
    const queue = state.membershipQueue || [];
    const index = Number(state.membershipIndex) || 0;
    await chrome.action.setBadgeText({ text: `${Math.min(index + 1, queue.length)}/${queue.length || 1}` });
    return;
  }
  const runningJobs = runningThreadsJobs(state);
  const totalThreadsActive = (state.threadsEnabled ? 1 : 0) + runningJobs.length;

  if (totalThreadsActive > 0) {
    const commentResting = state.threadsEnabled && isThreadsResting(state);
    if (totalThreadsActive === 1 && commentResting) {
      await chrome.action.setBadgeBackgroundColor({ color: "#c9922a" });
      const minutes = Math.max(1, Math.round((state.threadsRestUntil - Date.now()) / 60000));
      await chrome.action.setBadgeText({ text: minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h` });
      return;
    }
    await chrome.action.setBadgeBackgroundColor({ color: "#4ea1ff" });
    if (totalThreadsActive > 1) {
      await chrome.action.setBadgeText({ text: `T${totalThreadsActive}` });
      return;
    }
    if (state.threadsEnabled) {
      if (state.threadsNextRunAt) {
        const minutes = Math.max(1, Math.round((state.threadsNextRunAt - Date.now()) / 60000));
        if (minutes < 60) {
          await chrome.action.setBadgeText({ text: `${minutes}m` });
          return;
        }
      }
      await chrome.action.setBadgeText({ text: "THR" });
      return;
    }
    const singleJob = runningJobs[0];
    const nextAt = Number(state[THREADS_JOB_NEXT_KEY[singleJob]]) || 0;
    if (nextAt > Date.now()) {
      const minutes = Math.max(1, Math.round((nextAt - Date.now()) / 60000));
      if (minutes < 60) {
        await chrome.action.setBadgeText({ text: `${minutes}m` });
        return;
      }
    }
    await chrome.action.setBadgeText({ text: "THR" });
    return;
  }
  let activePlatformCount = 0;
  let activePlatformPrefix = "";
  for (const [platform, config] of Object.entries(PLATFORM_JOBS_CONFIG)) {
    for (const [job, jobDef] of Object.entries(config.jobs)) {
      if (state[jobDef.enabledKey]) {
        activePlatformCount++;
        activePlatformPrefix = platform === "youtube" ? "YT" : platform === "instagram" ? "IG" : "X";
      }
    }
  }

  if (activePlatformCount > 0 && !totalThreadsActive && !state.enabled && !state.membershipEnabled) {
    await chrome.action.setBadgeBackgroundColor({ color: "#e1306c" });
    await chrome.action.setBadgeText({ text: activePlatformCount === 1 ? activePlatformPrefix : `+${activePlatformCount}` });
    return;
  }

  if (!state.enabled && !activePlatformCount) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }
  if (isResting(state)) {
    await chrome.action.setBadgeBackgroundColor({ color: "#c9922a" });
    const minutes = Math.max(1, Math.round((state.restUntil - Date.now()) / 60000));
    await chrome.action.setBadgeText({ text: minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h` });
    return;
  }
  await chrome.action.setBadgeBackgroundColor({ color: "#1f8a5b" });
  await chrome.action.setBadgeText({ text: state.mode === "post" ? "POST" : "CMT" });
  if (state.nextRunAt) {
    const minutes = Math.max(1, Math.round((state.nextRunAt - Date.now()) / 60000));
    if (minutes < 60) await chrome.action.setBadgeText({ text: `${minutes}m` });
  }
}

async function getState() {
  const stored = await chrome.storage.local.get(null);
  if (!stored.intervalSpreadV1) {
    await migrateState();
    const next = await chrome.storage.local.get(null);
    return { ...DEFAULT_STATE, ...next, logs: publicActivityLogs(next.logs) };
  }
  return { ...DEFAULT_STATE, ...stored, logs: publicActivityLogs(stored.logs) };
}

function enabledGroups(state) {
  return (state.groups || []).filter((group) => group.enabled);
}

function parseTemplates(text) {
  const seen = new Set();
  const unique = [];
  for (const part of String(text || "").split("**")) {
    const value = part.trim();
    if (!value) continue;
    const key = textKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }
  return unique;
}

function clip(text, n) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > n ? `${value.slice(0, n)}…` : value;
}

const THREADS_MAX_CHARS = 500;

function fitThreadsComment(text) {
  const value = String(text || "").trim();
  if (value.length <= THREADS_MAX_CHARS) return value;

  const head = value.slice(0, THREADS_MAX_CHARS);
  const lastStop = Math.max(
    head.lastIndexOf("."),
    head.lastIndexOf("!"),
    head.lastIndexOf("?"),
    head.lastIndexOf("\n")
  );
  if (lastStop >= THREADS_MAX_CHARS * 0.6) return head.slice(0, lastStop + 1).trim();

  const lastSpace = head.lastIndexOf(" ");
  return (lastSpace > 0 ? head.slice(0, lastSpace) : head).trim();
}

function stateMessage(state) {
  if (state === "login") return "Chưa đăng nhập Facebook trong tab này.";
  if (state === "checkpoint") return "Facebook đang yêu cầu xác minh bảo mật (checkpoint).";
  if (state === "blocked") return "Tài khoản có vẻ đang bị hạn chế.";
  return "Trang Facebook không sẵn sàng.";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const {
    workTabId,
    threadsWorkTabId,
    threadsCommentTabId,
    youtubeWorkTabId,
    instagramWorkTabId,
    xWorkTabId,
    zaloWorkTabId,
    tiktokWorkTabId,
    mapsWorkTabId,
    xCommentTabId,
  } = await getState();
  const patch = {};
  if (workTabId === tabId) patch.workTabId = null;
  if (threadsWorkTabId === tabId) patch.threadsWorkTabId = null;
  if (threadsCommentTabId === tabId) patch.threadsCommentTabId = null;
  if (youtubeWorkTabId === tabId) patch.youtubeWorkTabId = null;
  if (instagramWorkTabId === tabId) patch.instagramWorkTabId = null;
  if (xWorkTabId === tabId) patch.xWorkTabId = null;
  if (zaloWorkTabId === tabId) patch.zaloWorkTabId = null;
  if (tiktokWorkTabId === tabId) patch.tiktokWorkTabId = null;
  if (mapsWorkTabId === tabId) patch.mapsWorkTabId = null;
  if (xCommentTabId === tabId) patch.xCommentTabId = null;
  if (Object.keys(patch).length) await chrome.storage.local.set(patch);
});
