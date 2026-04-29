import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const config = {
  api: { bodyParser: false },
  supportsResponseStreaming: true,
  maxDuration: 60,
};

// حذف منطق خودکار اسلش - حالا هر چه در متغیر باشد مستقیماً استفاده می‌شود
const _k = process.env.APP_DATA || ""; 

const _s = ["ho", "conne", "upgr", "proxy", "forward", "te", "trail", "transfer"].map(x => x.toLowerCase());

export default async function (q, s) {
  if (!_k) {
    s.statusCode = 404; // مخفی‌کاری: نمایش 404 به جای خطای سیستم
    return s.end();
  }

  try {
    // ترکیب مستقیم آدرس بدون حذف یا اضافه کردن اسلش اضافی
    const _u = _k + q.url; 
    const _h = {};

    for (const [key, val] of Object.entries(q.headers)) {
      const lowKey = key.toLowerCase();
      if (_s.some(p => lowKey.includes(p)) || lowKey.startsWith("x-ver")) continue;
      _h[lowKey] = Array.isArray(val) ? val.join(", ") : val;
    }

    const { method } = q;
    const _o = { 
      method, 
      headers: _h, 
      redirect: "manual",
      'user-agent': q.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    if (method !== "GET" && method !== "HEAD") {
      _o.body = Readable.toWeb(q);
      _o.duplex = "half";
    }

    const res = await fetch(_u, _o);

    s.statusCode = res.status;
    
    for (const [k, v] of res.headers) {
      if (k.toLowerCase() === "transfer-encoding") continue;
      try { s.setHeader(k, v); } catch (e) {}
    }

    if (res.body) {
      await pipeline(Readable.fromWeb(res.body), s);
    } else {
      s.end();
    }
  } catch (e) {
    s.statusCode = 404;
    s.end();
  }
}