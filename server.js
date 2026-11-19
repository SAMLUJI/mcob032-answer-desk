// MCOB032 Answer Desk: tiny Node server (no framework).
// Env vars (set in Render > Environment):
//   ANTHROPIC_API_KEY  your key from console.anthropic.com
//   APP_PASSWORD       a password you choose, so strangers can't use your credit
const http = require("http");
const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
const PORT = process.env.PORT || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const PAGE = fs.readFileSync(path.join(__dirname, "public", "index.html"));
const KNOWLEDGE_DIR = path.join(__dirname, "knowledge");
const KNOWLEDGE = fs.existsSync(KNOWLEDGE_DIR)
  ? fs.readdirSync(KNOWLEDGE_DIR).filter((f) => /\.(md|txt)$/.test(f)).sort()
      .map((f) => "### " + f + "\n" + fs.readFileSync(path.join(KNOWLEDGE_DIR, f), "utf8")).join("\n\n")
  : "";

const SYSTEM = `You answer questions for MCOB032 Computer Networks (Sefako Makgatho University; Cisco CCNA 1 Introduction to Networks v7). Reply in plain text only (no markdown tables, no LaTeX, no asterisks).
Always start with a line "Answer: ..." giving the final answer: for MCQ the correct option(s) written out in full (give all of them when several are required); for true/false "True" or "False"; for calculations the final values; for long questions a one-line summary. Then "Working:" with short numbered steps. For long/scenario questions give about one point per mark, each explained AND applied to the scenario. Keep it concise and exam-ready.
Use the lecturer's conventions exactly:
- Hamming code: parity bits r = smallest r with 2^r >= m + r + 1. Number positions n down to 1 left to right (position 1 is the rightmost bit). Parity bits at positions 1,2,4,8. Place the data bits into the remaining positions so the data's last bit is in position 3 (data MSB in the highest position). P1 checks 1,3,5,7,9,11; P2 checks 2,3,6,7,10,11; P4 checks 4,5,6,7,12; P8 checks 8,9,10,11,12. Even parity: total 1s in each group including the parity bit is even; odd parity: odd. Error: recount each group including its parity bit; add the failing parity positions to get the bad bit; flip it. Verified: even 10110011 -> 101110010101; odd 101101 -> 1001101111; even 11010110 -> 110110111001.
- Line encoding: NRZ-L 1=high 0=low. NRZ-I 1=level change at start, 0=no change. Manchester: always a mid-bit transition, 1 = low-to-high, 0 = high-to-low. Differential Manchester: always a mid-bit transition; 1 = change at start of the bit, 0 = no change. Assume the line starts low unless told.
- Subnetting: subnets = 2^n (n borrowed bits); usable hosts = 2^h - 2; new prefix = old + n; magic number = 2^h = 256 - last mask octet; subnet IDs step by the magic number; broadcast = next subnet ID - 1; first usable = ID + 1; last usable = broadcast - 1. Give the mask in decimal, prefix and binary when asked. Write full IP addresses in tables.
- EUI-64: split the MAC in half, insert FFFE, convert the first byte to binary and flip the 7th bit, regroup into four 16-bit groups.
- PDUs (OSI): data, segment (transport), packet (network), frame (data link), bits (physical).
- TCP sliding window: the ACK number is the next byte expected; out-of-order segments are held in the receiver's buffer; the lost segment is retransmitted after the ACK asks for it.
Double-check every calculation before answering. If the question depends on a missing exhibit, say what is needed and answer for the most likely case.`;

function readBody(req, limit = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new Error("too_large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function toApiMessages(turns) {
  // turns: [{role: "user"|"assistant", text, image?: {media_type, data}}]
  return turns.slice(-12).map((t) => {
    if (t.role === "user" && t.image && t.image.data) {
      return {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: t.image.media_type, data: t.image.data } },
          { type: "text", text: t.text || "Answer the question in this image." },
        ],
      };
    }
    return { role: t.role === "assistant" ? "assistant" : "user", content: String(t.text || "").slice(0, 20000) || "(empty)" };
  });
}

async function handleAsk(req, res) {
  let body;
  try { body = JSON.parse(await readBody(req)); }
  catch (e) { res.writeHead(e.message === "too_large" ? 413 : 400, { "Content-Type": "text/plain" }); res.end(e.message === "too_large" ? "That photo is too large. Use one under 8 MB." : "Bad request."); return; }

  if (!APP_PASSWORD || body.password !== APP_PASSWORD) {
    res.writeHead(401, { "Content-Type": "text/plain" });
    res.end(APP_PASSWORD ? "Wrong password." : "The site's APP_PASSWORD isn't set yet. Add it in Render > Environment.");
    return;
  }
  if (!Array.isArray(body.turns) || !body.turns.length || body.turns[body.turns.length - 1].role !== "user") {
    res.writeHead(400, { "Content-Type": "text/plain" }); res.end("Bad request."); return;
  }

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" });
  try {
    const stream = client.beta.messages.stream({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{
        type: "text",
        text: SYSTEM + (KNOWLEDGE ? "\n\nCOURSE MEMOS AND NOTES (the lecturer's marking points; when a question matches or resembles one of these, answer the way the memo does, using its points and wording, but correct any arithmetic errors):\n\n" + KNOWLEDGE : ""),
        cache_control: { type: "ephemeral" },
      }],
      messages: toApiMessages(body.turns),
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") res.write(event.delta.text);
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") res.write("\n\n[The model declined this question. Try rewording it.]");
    else if (final.stop_reason === "max_tokens") res.write("\n\n[Answer cut short. Ask for one part at a time.]");
    res.end();
  } catch (err) {
    console.error("ask failed:", err && err.status, err && err.message);
    const msg =
      err instanceof Anthropic.AuthenticationError ? "The API key is missing or wrong. Check ANTHROPIC_API_KEY in Render > Environment." :
      err instanceof Anthropic.RateLimitError ? "Too many requests right now. Wait a minute and try again." :
      err instanceof Anthropic.APIError && err.status === 400 && /credit/i.test(err.message || "") ? "Your Anthropic account is out of credit. Add credit at console.anthropic.com." :
      "Something went wrong. Try again.";
    res.end("\n\n[" + msg + "]");
  }
}

http.createServer(async (req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url.startsWith("/?"))) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(PAGE); return;
  }
  if (req.method === "GET" && req.url === "/health") { res.writeHead(200); res.end("ok"); return; }
  if (req.method === "POST" && req.url === "/api/ask") { await handleAsk(req, res); return; }
  res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found");
}).listen(PORT, () => console.log("Answer Desk listening on " + PORT));
