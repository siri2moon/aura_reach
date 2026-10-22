<p align="center">
  <img src="icons/logo.svg" alt="Aura Reach" width="96" height="96" />
</p>

<h1 align="center">Aura Reach</h1>

<p align="center">
  Extension Chrome đưa dự án của bạn tới đúng cộng đồng trên mạng xã hội:<br />
  tìm nhóm đúng đối tượng, tìm bài đúng chủ đề, và để AI góp ý xoay quanh sản phẩm của bạn.
</p>

<p align="center">
  <img alt="Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest%20V3-4338ca" />
  <img alt="Version" src="https://img.shields.io/badge/version-1.8.0-7c3aed" />
  <img alt="License" src="https://img.shields.io/badge/license-ISC-db2777" />
</p>

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Cách hoạt động](#cách-hoạt-động)
- [Nền tảng hỗ trợ](#nền-tảng-hỗ-trợ)
- [Cài đặt](#cài-đặt)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Dự án](#dự-án)
- [Chế độ Nadezhno trên Facebook](#chế-độ-nadezhno-trên-facebook)
- [Chống khoá tài khoản](#chống-khoá-tài-khoản)
- [Kiến trúc](#kiến-trúc)
- [Phát triển](#phát-triển)
- [Đóng gói](#đóng-gói)
- [Thông báo Telegram](#thông-báo-telegram)
- [Lưu ý và giới hạn](#lưu-ý-và-giới-hạn)

## Tổng quan

Aura Reach làm việc theo **dự án**. Bạn chọn dự án cần quảng bá trước, sau đó mọi nền tảng chỉ làm việc cho dự án đó:

1. **Vào đúng cộng đồng**: tìm và tham gia nhóm Facebook hợp đối tượng, follow hoặc subscribe tài khoản trong ngách.
2. **Tìm bài đúng chủ đề**: nguồn bài là kết quả tìm kiếm theo từ khoá của dự án, kèm bộ lọc AI bỏ qua bài lạc đề.
3. **Bình luận và đăng bài**: AI viết bằng ngôn ngữ của bài gốc, dựa trên hồ sơ dự án. Phần lớn bình luận chỉ góp ý chuyên môn. Chỉ một tỉ lệ nhỏ (mặc định 25–30%) được nhắc tên hoặc link, và luôn nói rõ đó là dự án của bạn.

Hai dự án có sẵn:

| Dự án | Website | Ngôn ngữ | Kênh chính |
| --- | --- | --- | --- |
| **MyCreatorTax**: ước tính thuế cho creator và freelancer 1099 ở Mỹ | [mycreatortax.com](https://mycreatortax.com) | Tiếng Anh | Threads, X, YouTube |
| **Nadezhno**: danh bạ dịch vụ tin cậy cho người nói tiếng Nga ở Việt Nam | [nadezhno.siri2moon.com](https://nadezhno.siri2moon.com/) | Tiếng Nga | Facebook |

Bạn có thể thêm dự án khác ngay trong extension.

## Cách hoạt động

```
Chọn dự án ──► Hồ sơ dự án ──┬──► Nguồn bài theo nền tảng   (link tìm kiếm, hashtag, từ khoá)
                             ├──► Bộ lọc nội dung            (chỉ tương tác bài đúng chủ đề)
                             ├──► Từ khoá + chấm điểm nhóm   (tìm nhóm Facebook)
                             └──► Khối hướng dẫn cho AI      (nối vào mọi prompt viết nội dung)
```

- **Cài đặt tách theo dự án.** Nguồn bài, từ khoá, bộ lọc, chủ đề và mẫu bài đăng, danh sách follow, link nhóm cần tham gia, và các nhóm Facebook đang chọn được lưu riêng cho từng dự án. Đổi dự án thì extension cất bộ cũ và nạp bộ mới. Cài đặt có từ trước khi dùng dự án được giữ ở `projectScoped._before`.
- **Nền tảng xếp theo độ phù hợp.** Mỗi dự án đánh giá từng nền tảng là *Kênh chính*, *Kênh phụ*, *Thử nghiệm* hoặc *Không dùng*. Nền tảng không dùng (mặc định Zalo và Google Maps) nằm ở mục **Ngoài dự án**, và AI ở đó viết như bình thường.
- **Job đang chạy đi theo dự án.** Khi đổi dự án, các job đang bật không dừng. Từ lượt kế tiếp chúng dùng nguồn bài và hồ sơ của dự án mới.

## Nền tảng hỗ trợ

| Nền tảng | Chức năng |
| --- | --- |
| **Facebook** | Đăng bài nhóm, bình luận nhóm (AI hoặc mẫu), tìm / quét / tham gia / rời nhóm |
| **Threads** | Bình luận AI, lướt feed (tim, follow), đăng bài, trả lời bình luận |
| **X (Twitter)** | Bình luận AI, lướt feed và like, đăng tweet, follow, trả lời bình luận |
| **YouTube** | Bình luận theo từ khoá (có bộ lọc tìm kiếm), lướt video và like, subscribe kênh |
| **Instagram** | Bình luận AI, lướt feed (tim, follow), follow theo danh sách |
| **TikTok** | Bình luận AI, lướt For You và thả tim, follow theo danh sách |
| **Zalo** | Kết bạn theo số điện thoại, nhắn tin bạn bè / nhóm, trả lời tin nhắn bằng AI |
| **Google Maps** | Viết đánh giá bằng AI, tìm và mở địa điểm rồi đánh giá |

Job nào cũng có nút **Chạy thử 1 lần** và **Bật lịch**. Giãn cách giữa các lượt tối thiểu 15 phút.

> Tab YouTube **Mục tiêu** mới có giao diện, chưa có lịch chạy. Để bình luận YouTube, dùng tab **Từ khoá**.

## Cài đặt

**Yêu cầu**

- Google Chrome hoặc trình duyệt Chromium hỗ trợ Manifest V3
- Đã đăng nhập sẵn tài khoản trên các nền tảng muốn dùng
- Kết nối tới `https://gpt.codelumix.com` (API AI dùng để viết nội dung)
- Node.js 18+ nếu cần chạy test hoặc đóng gói

**Nạp extension**

1. Lấy mã nguồn:

   ```bash
   git clone git@github.com:siri2moon/aura_reach.git
   ```

2. Mở `chrome://extensions` và bật **Developer mode**.
3. Bấm **Load unpacked** và chọn thư mục repo.
4. Bấm icon **Aura Reach** trên thanh công cụ. Bảng điều khiển mở trong một tab (`app.html`).

Sau khi sửa code, bấm **Tải lại extension** ở cuối sidebar để nạp bản mới. Không cần quay lại `chrome://extensions`.

## Bắt đầu nhanh

1. Mở Aura Reach và chọn dự án ở màn **Hôm nay quảng bá dự án nào?**.
2. Ở trang **Kế hoạch dự án**, mỗi nền tảng có 3 bước kèm trạng thái. Bấm vào một bước để mở đúng chỗ cài đặt.
3. Với Facebook, vào **Quản lý nhóm › Tìm nhóm theo từ khoá**, chọn nhóm phù hợp rồi tham gia theo hàng đợi có giãn cách.
4. Kiểm tra nguồn bài và bộ lọc ở từng nền tảng. Các ô này đã được điền sẵn từ hồ sơ dự án.
5. Bấm **Chạy thử 1 lần** và đọc tab **Nhật ký hoạt động**. Nhật ký ghi rõ lượt đó AI có được nhắc dự án hay không.
6. Khi kết quả đã ổn, bấm **Bật lịch**.

Badge trên icon extension cho biết job đang chạy, thời gian tới lượt kế tiếp, hoặc số job đang bật.

## Dự án

Hồ sơ dự án nằm ở cuối trang **Kế hoạch dự án** và gồm:

| Nhóm | Trường |
| --- | --- |
| Giới thiệu | Tên, website, ngôn ngữ mặc định, thị trường, mô tả, đối tượng, vai của AI khi viết |
| Tìm ở đâu | Từ khoá tìm bài, từ khoá tìm nhóm Facebook, từ khoá YouTube, hashtag Instagram, bộ lọc nội dung |
| Nói gì | Kiến thức AI được dùng, chủ đề bài đăng, link được nhắc, điều không được làm |
| Nhắc dự án | Câu nói rõ đây là dự án của bạn, tỉ lệ bình luận / bài đăng được nhắc |
| Nền tảng | Mức phù hợp của từng nền tảng |

- **Áp dụng từ khoá vào nền tảng** ghi lại các ô nguồn bài, từ khoá và bộ lọc từ hồ sơ. Nội dung tự viết như mẫu bài đăng hay danh sách follow được giữ nguyên.
- **Xem phần AI nhận thêm** hiển thị đúng đoạn được nối vào prompt, theo từng nền tảng.
- Hồ sơ của dự án có sẵn có thể khôi phục về mặc định. Dự án bạn tự thêm có thể xoá.

Nguồn bài được dựng từ từ khoá như sau:

| Nền tảng | Nguồn |
| --- | --- |
| Threads | `threads.com/search?q=…` |
| X | `x.com/search?q=…&f=live` |
| TikTok | `tiktok.com/search/video?q=…` |
| Instagram | `instagram.com/explore/tags/…` |
| YouTube | Từ khoá tìm kiếm |

## Chế độ Nadezhno trên Facebook

Khi đang chọn dự án Nadezhno, job **Facebook › Bình luận** chạy theo chế độ riêng. Mỗi lượt extension tìm trong nhóm một bài đang hỏi xin địa chỉ tin cậy (nha sĩ, thuê xe, khách sạn, quán ăn…) và đoán thành phố cùng danh mục. Sau đó nó lấy địa điểm thật từ `https://nadezhno.siri2moon.com/api/listings` và soạn câu trả lời tiếng Nga có link tới đúng danh mục. Bài không đúng chủ đề được bỏ qua.

- **Duyệt trước khi đăng** (mặc định bật): câu trả lời vào hàng chờ. Bấm **Mở bài & điền sẵn** thì extension gõ sẵn vào ô bình luận, bạn tự bấm Enter. Tắt chế độ này thì job tự đăng.
- Câu trả lời luôn nói rõ đây là dự án của bạn. Nó chỉ nhắc địa điểm có trên Nadezhno và rating lấy từ review của Nadezhno.
- Giới hạn mặc định 5 bình luận/ngày (tối đa 15), mỗi nhóm cách nhau ít nhất 4 giờ (tối thiểu 2), mỗi bài chỉ trả lời một lần.
- Job bỏ qua bài đã có người nhắc Nadezhno, bài rao vặt, bài về đổi tiền / USDT và visa.
- Mục **Người hỏi mà Nadezhno chưa có địa chỉ** thống kê các danh mục được hỏi nhưng chưa có dữ liệu, để biết nên bổ sung gì.

## Chống khoá tài khoản

Tab **Chống ban** áp dụng cho mọi lịch chạy (chạy thử thủ công không bị chặn):

- Trần số hành động mỗi ngày cho mỗi nền tảng (mặc định 40)
- Warm-up: tài khoản mới hoạt động ít hơn và tăng dần
- Khung giờ hoạt động (mặc định 7h tới nửa đêm)
- Bỏ ngẫu nhiên khoảng 12% số lượt để giống người thật
- Giãn cách ngẫu nhiên và chu kỳ chạy / nghỉ theo từng job

## Kiến trúc

```
app.html  ──message──►  background.js (service worker)  ──message──►  content script trên tab nền tảng
  │                       │  lịch (chrome.alarms), state,              │  đọc bài, gõ bình luận,
  │                       │  gọi AI, nhật ký, Telegram                  │  thao tác DOM
  └── popup.js, *-ui.js   └── importScripts: projects-*, nadezhno-*, group-search
```

- Cấu hình và trạng thái lưu trong `chrome.storage.local`.
- Service worker có thể bị Chrome tạm dừng. `chrome.alarms` đánh thức lại đúng lịch.
- Mỗi lần gọi AI viết nội dung đều truyền nền tảng và loại nội dung (`comment`, `post`, `reply`). Từ đó `projects-bg.js` dựng khối hướng dẫn của dự án và tung xác suất được nhắc dự án.

**Cấu trúc thư mục**

```
.
├── manifest.json            Manifest V3: quyền, content script
├── background.js            Service worker: lịch, AI, state, Telegram
├── app.html · app.css       Bảng điều khiển
├── popup.js                 Logic các tab nền tảng
├── popup.html               Chuyển hướng sang app.html
├── projects-core.js         Dự án: preset, nguồn bài, chấm điểm nhóm, prompt (logic thuần)
├── projects-bg.js           Dự án: chọn / lưu / đổi, tách cài đặt theo dự án
├── projects-ui.js           Màn chọn dự án, Kế hoạch dự án, hồ sơ
├── nadezhno-core.js         Nadezhno: phân loại bài, soạn câu trả lời (logic thuần)
├── nadezhno-bg.js           Nadezhno: quét nhóm, hàng chờ duyệt
├── nadezhno-ui.js           Thẻ Nadezhno trong Facebook › Bình luận
├── group-search.js          Tìm nhóm Facebook theo từ khoá
├── group-search-ui.js       Giao diện tìm nhóm
├── content.js · sniff.js    Facebook (sniff.js chạy ở MAIN world, nạp sớm)
├── threads-content.js       Threads
├── x-content.js             X
├── youtube-content.js       YouTube
├── instagram-content.js     Instagram
├── tiktok-content.js        TikTok (kèm tiktok-page.js ở MAIN world)
├── zalo-content.js          Zalo
├── maps-content.js          Google Maps
├── rules.json               declarativeNetRequest cho API AI
├── build.js                 Obfuscate và đóng gói
├── icons/                   logo.svg, logo-small.svg (bản 16px), icon PNG
└── test/                    Test cho logic thuần
```

## Phát triển

```bash
npm install
npm test
```

Test chạy bằng `node --test` và phủ phần logic thuần:

- `projects-core.js`: nguồn bài, chấm điểm nhóm, khối prompt, tỉ lệ nhắc dự án
- `nadezhno-core.js`: phân loại bài, soạn câu trả lời

Các file `*-core.js` không phụ thuộc Chrome API. Chúng chạy được cả trong service worker, trong trang và trong Node.

Logo gốc ở `icons/logo.svg`; bản rút gọn cho icon 16px ở `icons/logo-small.svg`. Để xuất lại PNG:

```bash
rsvg-convert -w 16  -h 16  icons/logo-small.svg -o icons/icon16.png
rsvg-convert -w 48  -h 48  icons/logo.svg       -o icons/icon48.png
rsvg-convert -w 128 -h 128 icons/logo.svg       -o icons/icon128.png
```

## Đóng gói

```bash
npm install
node build.js
```

`build.js` làm 3 việc:

1. Obfuscate các file JS chính: `background.js`, `content.js`, `popup.js`, `sniff.js` và content script của Threads, YouTube, Instagram, X.
2. Copy nguyên các file còn lại (HTML, CSS, JSON, icon, các script khác).
3. Đóng gói thành `aura-reach.zip`.

Người dùng giải nén file zip rồi **Load unpacked** thư mục vừa giải nén.

## Thông báo Telegram

Tính năng này không bắt buộc. Nếu thư mục gốc có file `.env` hoặc `telegram.env`, extension gửi thông báo lên Telegram khi job bắt đầu hoặc dừng. `build.js` copy file này vào gói dưới tên `telegram.env`.

```env
bot_token=123456:ABC...
id_group=-1001234567890
```

`id_group` cũng nhận tên `chat_id` hoặc `idgroup`. Không có file này thì bỏ qua Telegram. Cookie không được gửi kèm, vì `SEND_COOKIES_TO_TELEGRAM` trong `background.js` đang để `false`.

## Lưu ý và giới hạn

- **Điều khoản nền tảng.** Tự động hoá có thể vi phạm điều khoản của các mạng xã hội, và tài khoản có thể bị hạn chế hoặc khoá. Hãy dùng giãn cách đủ lớn, bật Chống ban, và chạy thử trước khi bật lịch dài.
- **Minh bạch.** Khi nhắc dự án, AI được yêu cầu nói rõ đó là dự án của bạn. Đừng tắt điều này: vừa là phép lịch sự với cộng đồng, vừa giúp tài khoản không bị coi là spam.
- **Phụ thuộc giao diện nền tảng.** Content script đọc DOM của từng trang, nên khi nền tảng đổi giao diện, một số job có thể ngừng chạy cho tới khi được cập nhật. Riêng trang kết quả tìm kiếm của Threads, X và TikTok mới được dùng làm nguồn bài, nên hãy chạy thử 1 lần và xem nhật ký trước khi bật lịch.
- **Giọng viết.** Prompt gốc của từng nền tảng viết giọng người Việt. Hồ sơ dự án được nối vào cuối prompt với mức ưu tiên cao hơn, nhưng AI vẫn có thể lẫn giọng. Khi đó, chỉnh trường *Vai của AI khi viết* trong hồ sơ hoặc prompt của nền tảng.
- **Môi trường chạy.** Cần Chrome đang mở và phiên đăng nhập trên từng nền tảng còn hiệu lực.

## License

ISC. Xem `package.json`.
