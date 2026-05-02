/**
 * ExerciseDB proxy (AscendAPI EDB with videos + images)
 * Host: edb-with-videos-and-images-by-ascendapi.p.rapidapi.com
 *
 * Supported query params:
 *   ?type=name&q=bench+press&limit=5        → search by name
 *   ?type=bodyPart&q=CHEST&limit=20         → exercises for a bodyPart (UPPERCASE)
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

  const { type, q, id, limit = "15", offset = "0" } = req.query;

  let url;
  if (type === "name" && q) {
    url = `${BASE_URL}/exercises?name=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`;
  } else if (type === "bodyPart" && q) {
    url = `${BASE_URL}/exercises?bodyPart=${encodeURIComponent(q.toUpperCase())}&limit=${limit}&offset=${offset}`;
  } else if (type === "detail" && id) {
    url = `${BASE_URL}/exercises/${encodeURIComponent(id)}`;
  } else if (type === "bodyParts") {
    url = `${BASE_URL}/bodyparts`;
  } else {
    return res.status(400).json({ error: "Invalid type or missing params. Use type=name|bodyPart|detail|bodyParts" });
  }

  try {
    const r = await fetch(url, {
      headers: {
        "x-rapidapi-key":  apiKey,
        "x-rapidapi-host": API_HOST,
        "Content-Type":    "application/json",
      },
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: `API ${r.status}: ${text.slice(0, 300)}` });
    }

    const json = await r.json();

    // Normalise to a consistent shape for the frontend:
    // list  → { data: [...] }
    // detail → { data: {...} }
    if (!json.success) {
      return res.status(400).json({ error: json.message || "API error" });
    }

    return res.json({ data: json.data, meta: json.meta || null });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
