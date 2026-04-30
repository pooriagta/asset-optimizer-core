import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const config = {
  api: { bodyParser: false },
  supportsResponseStreaming: true,
  maxDuration: 60,
};

export default async function (req, res) {
  // مقدار DATABASE_URL را در پنل ورسل تنظیم کن
  const _target = (process.env.DATABASE_URL || "").replace(/\/$/, "");
  
  if (!_target) {
    res.statusCode = 404;
    return res.end();
  }

  try {
    // ترکیب آدرس: ورودی ورسل + آدرس مقصد
    const targetUrl = _target + req.url;

    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      const k = key.toLowerCase();
      // حذف هدرهایی که باعث اختلال در هدایت پورت می‌شوند
      if (["host", "connection", "transfer-encoding", "upgrade", "te", "trailer"].includes(k)) continue;
      if (k.startsWith("x-ver")) continue;
      
      headers[k] = Array.isArray(value) ? value.join(", ") : value;
    }

    // اجباری کردن هدر Host مقصد برای عبور از فیلتر پورت
    const targetHost = new URL(_target).host;
    headers["host"] = targetHost;

    const fetchOpts = {
      method: req.method,
      headers: headers,
      redirect: "manual",
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      fetchOpts.body = Readable.toWeb(req);
      fetchOpts.duplex = "half";
    }

    const upstream = await fetch(targetUrl, fetchOpts);

    res.statusCode = upstream.status;
    for (const [k, v] of upstream.headers) {
      if (k.toLowerCase() === "transfer-encoding") continue;
      try { res.setHeader(k, v); } catch (e) {}
    }

    if (upstream.body) {
      await pipeline(Readable.fromWeb(upstream.body), res);
    } else {
      res.end();
    }
  } catch (e) {
    res.statusCode = 404;
    res.end();
  }
}
