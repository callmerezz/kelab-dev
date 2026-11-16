const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const API_URL = "https://api.rss2json.com/v1/api.json";
const ARTICLES_PER_SOURCE = 4;
const MAX_SUMMARY_LENGTH = 420;
const OUTPUT_PATH = path.join(__dirname, "berita.json");

const FEEDS = [
    { name: "Amanz", url: "https://amanz.my/feed/" },
    { name: "SoyaCincau", url: "https://soyacincau.com/feed/" },
    { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
    { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
    {
        name: "Google News TVET Malaysia",
        url: "https://news.google.com/rss/search?q=TVET+Malaysia&hl=ms&gl=MY&ceid=MY:ms",
        category: "TVET"
    }
];

const NAMED_ENTITIES = {
    amp: "&",
    apos: "'",
    copy: "\u00a9",
    hellip: "\u2026",
    lt: "<",
    mdash: "\u2014",
    nbsp: " ",
    ndash: "\u2013",
    quot: "\"",
    reg: "\u00ae",
    rsquo: "\u2019",
    lsquo: "\u2018",
    rdquo: "\u201d",
    ldquo: "\u201c"
};

function decodeHtmlEntities(value) {
    return value.replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi, function (entity, code) {
        if (code[0] === "#") {
            const isHex = code[1].toLowerCase() === "x";
            const point = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
            if (Number.isInteger(point) && point > 0 && point <= 0x10ffff) {
                return String.fromCodePoint(point);
            }
            return entity;
        }

        return NAMED_ENTITIES[code.toLowerCase()] || entity;
    });
}

function cleanHtml(value) {
    return decodeHtmlEntities(
        String(value || "")
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]*>/g, " ")
    ).replace(/\s+/g, " ").trim();
}

function shortenSummary(value) {
    const summary = cleanHtml(value);
    if (summary.length <= MAX_SUMMARY_LENGTH) {
        return summary;
    }

    return summary.slice(0, MAX_SUMMARY_LENGTH - 1).trimEnd() + "\u2026";
}

function normalizeHttpUrl(value) {
    try {
        const url = new URL(String(value));
        return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

function parsePublishedDate(value) {
    const dateText = String(value || "").trim().replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T");
    const normalizedDate = /(?:z|[+-]\d{2}:?\d{2}|gmt|utc)$/i.test(dateText)
        ? dateText
        : dateText + "Z";
    const date = new Date(normalizedDate);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getImage(item) {
    const enclosure =
        item.enclosure && typeof item.enclosure === "object"
            ? item.enclosure.link
            : typeof item.enclosure === "string"
                ? item.enclosure
                : "";
    const content = String(item.content || "");
    const contentImage = content.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
    return (
        normalizeHttpUrl(item.thumbnail) ||
        normalizeHttpUrl(enclosure) ||
        normalizeHttpUrl(contentImage && contentImage[1]) ||
        null
    );
}

function getCategory(item, title, summary) {
    const categories = Array.isArray(item.categories) ? item.categories.join(" ") : "";
    const searchableText = [categories, title, summary].join(" ");
    return /\b(cyber|security|malware|ransomware|hacker|hackers|phishing|vulnerabilit|exploit|breach|spyware|trojan|siber|keselamatan|pencerobohan|scam|data leak|zero.day|cve-\d+)\b/i.test(
        searchableText
    )
        ? "Keselamatan Siber"
        : "Teknologi";
}

function getArticleTitleAndSource(item, feed) {
    const rawTitle = cleanHtml(item.title);
    if (feed.category !== "TVET") {
        return { title: rawTitle, source: feed.name };
    }

    const titleParts = rawTitle.match(/^(.+)\s[-\u2013\u2014]\s(.+)$/);
    const title = titleParts ? titleParts[1].trim() : rawTitle;
    const descriptionSource = String(item.description || "").match(
        /<font\b[^>]*>([\s\S]*?)<\/font>/i
    );
    const explicitSource =
        item.source && typeof item.source === "object"
            ? item.source.title || item.source.name
            : item.source;
    const sourceCandidates = [
        explicitSource,
        descriptionSource && descriptionSource[1],
        titleParts && titleParts[2],
        item.author
    ];
    const source = sourceCandidates
        .map(cleanHtml)
        .find(function (candidate) {
            return candidate && !/^google news$/i.test(candidate);
        }) || "Google News";

    return { title: title, source: source };
}

function normalizeArticle(item, feed) {
    if (!item || typeof item !== "object") {
        return null;
    }

    const articleDetails = getArticleTitleAndSource(item, feed);
    const title = articleDetails.title;
    const url = normalizeHttpUrl(item.link);
    const publishedDate = parsePublishedDate(item.pubDate);
    let summary = shortenSummary(item.description || item.content);
    if (feed.category === "TVET") {
        summary = summary
            .replace(title, "")
            .replace(articleDetails.source, "")
            .replace(/^[\s\-:\u2013\u2014|]+|[\s\-:\u2013\u2014|]+$/g, "")
            .trim();
        if (!summary) {
            summary = "Liputan TVET Malaysia daripada " + articleDetails.source + ".";
        }
    }

    if (!title || !articleDetails.source || !url || !publishedDate || !summary) {
        return null;
    }

    const sourceSlug = feed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 12);

    return {
        id: sourceSlug + "-" + hash,
        title: title,
        url: url,
        summary: summary,
        publishedAt: publishedDate.toISOString(),
        source: articleDetails.source,
        category: feed.category || getCategory(item, title, summary),
        image: getImage(item)
    };
}

async function fetchFeed(feed) {
    const url = new URL(API_URL);
    url.searchParams.set("rss_url", feed.url);
    const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
        throw new Error(feed.name + " RSS API returned HTTP " + response.status);
    }

    const payload = await response.json();
    if (!payload || payload.status !== "ok" || !Array.isArray(payload.items)) {
        throw new Error(
            feed.name + " RSS API error: " + String(payload.message || payload.status || "invalid response")
        );
    }

    const candidates = payload.items
        .map(function (item) {
            return normalizeArticle(item, feed);
        })
        .filter(Boolean)
        .sort(function (left, right) {
            return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
        });
    const seenUrls = new Set();
    const articles = candidates.filter(function (article) {
        if (seenUrls.has(article.url)) {
            return false;
        }
        seenUrls.add(article.url);
        return true;
    }).slice(0, ARTICLES_PER_SOURCE);

    if (articles.length !== ARTICLES_PER_SOURCE) {
        throw new Error(
            feed.name + " returned " + articles.length + " valid articles; expected " + ARTICLES_PER_SOURCE
        );
    }

    return articles;
}

async function writeNewsFile(articles) {
    const output = JSON.stringify({ schemaVersion: 1, articles: articles }, null, 2) + "\n";
    let currentOutput = null;

    try {
        currentOutput = await fs.readFile(OUTPUT_PATH, "utf8");
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }

    if (currentOutput === output) {
        console.log("berita.json is already up to date.");
        return;
    }

    const temporaryPath = OUTPUT_PATH + ".tmp";
    await fs.writeFile(temporaryPath, output, "utf8");
    await fs.rename(temporaryPath, OUTPUT_PATH);
    console.log("Updated berita.json with " + articles.length + " articles.");
}

async function main() {
    const articles = [];

    for (const feed of FEEDS) {
        const feedArticles = await fetchFeed(feed);
        articles.push(...feedArticles);
        console.log("Fetched " + feedArticles.length + " articles from " + feed.name + ".");
    }

    articles.sort(function (left, right) {
        return (
            Date.parse(right.publishedAt) - Date.parse(left.publishedAt) ||
            left.source.localeCompare(right.source)
        );
    });

    await writeNewsFile(articles);
}

main().catch(function (error) {
    console.error("News update failed:", error);
    process.exitCode = 1;
});
