/**
 * integrations.ts — FINAL RELEASE
 *
 * Web Intelligence + YouTube Integration with Language Support
 *
 * Architecture:
 *  - SerpAPI: called via allorigins.win CORS proxy (no backend needed for Vite).
 *  - YouTube Data API v3: direct (CORS-safe GET, no write ops).
 *    Language selector changes: relevanceLanguage, regionCode, and search query.
 *  - Both functions NEVER throw — always return curated fallback data on error.
 */

const SERP_KEY = import.meta.env.VITE_SERP_API_KEY || '';
const YT_KEY   = import.meta.env.VITE_YOUTUBE_API_KEY || '';

export interface WebInsight {
  title:   string;
  snippet: string;
  link:    string;
  source:  string;
}

export interface VideoGuide {
  title:     string;
  videoId:   string;
  thumbnail: string;
}

// ─── Supported Languages ─────────────────────────────────────────────────────
export interface ContentLanguage {
  code:       string;   // YouTube relevanceLanguage code
  region:     string;   // YouTube regionCode
  label:      string;   // Display name
  flag:        string;  // Emoji flag
  queryAppend: string;  // Appended to YouTube search query
}

export const CONTENT_LANGUAGES: ContentLanguage[] = [
  { code: 'en', region: 'IN', label: 'English',    flag: '🇬🇧', queryAppend: 'Indian law legal explanation' },
  { code: 'ta', region: 'IN', label: 'Tamil',      flag: '🇮🇳', queryAppend: 'சட்டம் விளக்கம் India' },
  { code: 'hi', region: 'IN', label: 'Hindi',      flag: '🇮🇳', queryAppend: 'भारतीय कानून हिंदी में' },
  { code: 'te', region: 'IN', label: 'Telugu',     flag: '🇮🇳', queryAppend: 'చట్టం వివరణ India' },
  { code: 'ml', region: 'IN', label: 'Malayalam',  flag: '🇮🇳', queryAppend: 'നിയമം India Malayalam' },
  { code: 'kn', region: 'IN', label: 'Kannada',    flag: '🇮🇳', queryAppend: 'ಕಾನೂನು ಭಾರತ Kannada' },
  { code: 'mr', region: 'IN', label: 'Marathi',    flag: '🇮🇳', queryAppend: 'कायदा Marathi India' },
  { code: 'bn', region: 'IN', label: 'Bengali',    flag: '🇮🇳', queryAppend: 'আইন বাংলা India' },
];

export const DEFAULT_LANGUAGE = CONTENT_LANGUAGES[0]; // English

// ─── Curated static fallbacks per legal topic ────────────────────────────────
const STATIC_INSIGHTS: Record<string, WebInsight[]> = {
  property: [
    { title: 'Property Dispute Law in India', snippet: 'Under the Transfer of Property Act 1882 and Civil Procedure Code, property disputes go through civil courts. A suit for possession or partition can be filed.', link: 'https://indiankanoon.org', source: 'Indian Kanoon' },
    { title: 'Succession Certificate — India', snippet: 'In intestate succession, legal heirs must obtain a Succession Certificate from a Civil Court under the Indian Succession Act, 1925.', link: 'https://vakilsearch.com', source: 'Vakilsearch' },
  ],
  criminal: [
    { title: 'FIR Filing Process in India', snippet: 'Under Section 154 CrPC, any cognizable offense must be registered as an FIR. If police refuse, approach the SP or a Magistrate under Section 156(3).', link: 'https://indiankanoon.org', source: 'Indian Kanoon' },
    { title: 'Bail Application Guide', snippet: 'For non-bailable offenses, apply for bail under Section 437 (Magistrate) or Section 439 (Sessions Court) of CrPC.', link: 'https://legalserviceindia.com', source: 'Legal Service India' },
  ],
  family: [
    { title: 'Divorce Law in India', snippet: 'Divorce can be sought under the Hindu Marriage Act 1955, Special Marriage Act 1954, or the Muslim Personal Law depending on religion.', link: 'https://indiankanoon.org', source: 'Indian Kanoon' },
    { title: 'Domestic Violence Protection', snippet: 'Under the Protection of Women from Domestic Violence Act 2005, women can seek protection orders, residence orders, and monetary relief.', link: 'https://ncw.nic.in', source: 'NCW India' },
  ],
  employment: [
    { title: 'Wrongful Termination — India', snippet: 'Industrial Disputes Act 1947 governs retrenchment. For unfair dismissal, file with the Labour Commissioner or approach the Labour Court.', link: 'https://shramsuvidha.gov.in', source: 'Shram Suvidha' },
    { title: 'Unpaid Salary Recovery', snippet: 'File under Payment of Wages Act 1936 with the Payment of Wages Authority, or approach a Labour Court for recovery of dues.', link: 'https://labour.gov.in', source: 'Ministry of Labour' },
  ],
  ipc: [
    { title: 'Indian Penal Code — Full Text', snippet: 'The IPC 1860 contains 511 sections governing all major criminal offenses in India. Now being replaced by Bhartiya Nyaya Sanhita (BNS) 2023.', link: 'https://indiankanoon.org/doc/1569253/', source: 'Indian Kanoon' },
    { title: 'IPC Sections Explained Simply', snippet: 'Detailed explanations of important IPC sections including 302, 376, 420, 498A, 354 and more — with punishment details.', link: 'https://lawrato.com/ipc', source: 'Lawrato' },
  ],
  constitution: [
    { title: 'Constitution of India — Full Text', snippet: 'The Constitution of India came into effect on 26 January 1950. It has 448 articles, 12 schedules, and numerous amendments.', link: 'https://legislative.gov.in/constitution-of-india/', source: 'Government of India' },
    { title: 'Fundamental Rights — Articles 12–35', snippet: 'Part III of the Constitution guarantees Fundamental Rights including equality, freedom, right against exploitation, religious freedom, and constitutional remedies.', link: 'https://indiankanoon.org', source: 'Indian Kanoon' },
  ],
};

/** Maps a case/query string to a known topic key */
function detectTopic(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('property') || q.includes('land') || q.includes('house') || q.includes('inheritance')) return 'property';
  if (q.includes('criminal') || q.includes('fir') || q.includes('arrest') || q.includes('bail')) return 'criminal';
  if (q.includes('family') || q.includes('divorce') || q.includes('marriage') || q.includes('domestic')) return 'family';
  if (q.includes('employment') || q.includes('job') || q.includes('salary') || q.includes('termination')) return 'employment';
  if (q.includes('ipc') || q.includes('section') || q.includes('penal')) return 'ipc';
  if (q.includes('constitution') || q.includes('article') || q.includes('fundamental')) return 'constitution';
  return 'ipc';
}

// ─── SerpAPI via CORS proxy ───────────────────────────────────────────────────
export const fetchWebInsights = async (query: string): Promise<WebInsight[]> => {
  const topic = detectTopic(query);

  if (!SERP_KEY || SERP_KEY.length < 10) {
    return STATIC_INSIGHTS[topic] || STATIC_INSIGHTS['ipc'];
  }

  try {
    const searchQuery = `${query} India legal law`;
    const target = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${SERP_KEY}&num=3`;
    const proxy  = `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`;

    const res      = await fetch(proxy, { signal: AbortSignal.timeout(6000) });
    const wrapper  = await res.json();
    const contents = JSON.parse(wrapper.contents);

    const results = (contents.organic_results || []).slice(0, 3).map((r: any) => ({
      title:   r.title   || 'Legal Resource',
      snippet: r.snippet || r.title || '',
      link:    r.link    || '#',
      source:  r.displayed_link || r.source || 'Web',
    }));

    return results.length > 0 ? results : (STATIC_INSIGHTS[topic] || STATIC_INSIGHTS['ipc']);
  } catch {
    return STATIC_INSIGHTS[topic] || STATIC_INSIGHTS['ipc'];
  }
};

// ─── YouTube Data API v3 — with Language Support ──────────────────────────────
export const fetchYouTubeVideos = async (
  query: string,
  lang: ContentLanguage = DEFAULT_LANGUAGE
): Promise<VideoGuide[]> => {
  if (!YT_KEY || YT_KEY.length < 10) return [];

  try {
    // Build language-aware search query
    const searchQuery = `${query} ${lang.queryAppend}`;
    const url = [
      'https://www.googleapis.com/youtube/v3/search',
      `?part=snippet`,
      `&maxResults=3`,
      `&q=${encodeURIComponent(searchQuery)}`,
      `&key=${YT_KEY}`,
      `&type=video`,
      `&relevanceLanguage=${lang.code}`,
      `&regionCode=${lang.region}`,
      `&videoDuration=medium`,
    ].join('');

    const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    return (data.items || [])
      .map((item: any) => ({
        title:     item.snippet?.title     || 'Legal Video',
        videoId:   item.id?.videoId        || '',
        thumbnail: item.snippet?.thumbnails?.high?.url || '',
      }))
      .filter((v: VideoGuide) => !!v.videoId);
  } catch {
    return [];
  }
};
