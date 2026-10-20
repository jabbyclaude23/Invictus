/**
 * ExerciseDB proxy (AscendAPI EDB with videos + images)
 * Host: edb-with-videos-and-images-by-ascendapi.p.rapidapi.com
 *
 * Supported query params:
 *   ?type=name&q=bench+press&limit=5        → search by name
 *   ?type=bodyPart&q=CHEST&limit=20         → exercises for a body part
 *   ?type=detail&id=exr_xxx                 → single exercise (video + instructions)
 *   ?type=bodyParts                         → list all body parts
 */

const API_HOST = "edb-with-videos-and-images-by-ascendapi.p.rapidapi.com";
const BASE_URL = `https://${API_HOST}/api/v1`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // Cache 1 hour at CDN, stale-while-revalidate for 5 min
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=300");

  const apiKey = process.env.EXERCISEDB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "EXERCISEDB_API_KEY env var not set" });
  }

  const { type, q, id, limit = "25", after, equipment } = req.query;
  const boundedLimit = String(Math.max(1, Math.min(25, parseInt(limit, 10) || 25)));
  const listParams = new URLSearchParams({ limit: boundedLimit });
  if (typeof after === "string") listParams.set("after", after.slice(0, 160));
  if (typeof equipment === "string") listParams.set("equipments", equipment.slice(0, 120));

  let url;
  if (type === "name" && q) {
    listParams.set("name", String(q).slice(0, 180));
    url = `${BASE_URL}/exercises?${listParams}`;
  } else if (type === "bodyPart" && q) {
    listParams.set("bodyParts", String(q).slice(0, 120));
    url = `${BASE_URL}/exercises?${listParams}`;
  } else if (type === "detail" && id) {
    url = `${BASE_URL}/exercises/${encodeURIComponent(id)}`;
  } else if (type === "bodyParts") {
    url = `${BASE_URL}/bodyparts`;
  } else {
    return res.status(400).json({ error: "Invalid type or missing params. Use type=name|bodyPart|detail|bodyParts" });
  }

  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "x-rapidapi-key":  apiKey,
        "x-rapidapi-host": API_HOST,
        "Content-Type":    "application/json",
      },
    });

    if (!r.ok) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(r.status).json({ error: "Exercise demonstrations are temporarily unavailable." });
    }

    const json = await r.json();

    // Normalise to a consistent shape for the frontend:
    // list  → { data: [...] }
    // detail → { data: {...} }
    if (!json.success) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(502).json({ error: "Exercise demonstrations are temporarily unavailable." });
    }

    return res.json({ data: json.data, meta: json.meta || null });
  } catch {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "Exercise demonstrations are temporarily unavailable." });
  }
}
