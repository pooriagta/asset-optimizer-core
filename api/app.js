import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const config = {
  api: { bodyParser: false },
  supportsResponseStreaming: true,
  maxDuration: 60,
};

export default async function (q, s) {
  // گرفتن آدرس دقیقاً همانطور که در ENV وارد می‌کنی
  const _raw = process.env.CORE_DATA || "";
  // حذف اسلش آخر اگر وجود داشته باشد تا با اسلش درخواست تداخل نکند
  const _base = _raw.replace(/\/$/, "");
  
  const _hide = ["ho", "conne", "upgr", "proxy", "forward", "te", "trail", "transfer"].map(x => x.toLowerCase());

  if (!_base) {
    s.statusCode = 404;
    return s.end();
  }

  try {
    // ترکیب آدرس: q.url همیشه با / شروع می‌شود (مثلاً /abc)
    const _u = _base + q.url;
    const _h = {};

    for (const [key, val] of Object.entries(q.headers)) {
      const k = key.toLowerCase();
      if (_hide.some(p => k.includes(p)) || k.startsWith("x-ver")) continue;
      _h[k] = Array.isArray(val) ? val.join(", ") : val;
    }

    const _o = { 
      method: q.method, 
      headers: _h, 
      redirect: "manual"
    };

    if (q.method !== "GET" && q.method !== "HEAD") {
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