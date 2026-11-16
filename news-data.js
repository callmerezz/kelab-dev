const newsStatusElements = [
    document.getElementById("home-news-status"),
    document.getElementById("archive-news-status")
].filter(Boolean);

function setNewsStatus(message, isError) {
    newsStatusElements.forEach(function (element) {
        element.textContent = message;
        element.dataset.state = isError ? "error" : "success";
    });
}

function getSafeHttpUrl(value) {
    try {
        const url = new URL(String(value));
        return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

function normalizeNewsArticle(article) {
    if (
        !article ||
        typeof article.id !== "string" ||
        !/^[a-z0-9][a-z0-9-]*$/i.test(article.id) ||
        typeof article.title !== "string" ||
        typeof article.summary !== "string" ||
        !article.summary.trim() ||
        typeof article.source !== "string" ||
        !article.source.trim() ||
        (article.category !== "Keselamatan Siber" && article.category !== "Teknologi")
    ) {
        return null;
    }

    const url = getSafeHttpUrl(article.url);
    const publishedAt = new Date(article.publishedAt);
    if (!url || !article.title.trim() || Number.isNaN(publishedAt.getTime())) {
        return null;
    }

    return {
        id: article.id,
        title: article.title.trim(),
        url: url,
        summary: article.summary.trim(),
        source: article.source.trim(),
        category: article.category,
        publishedAt: publishedAt.toISOString(),
        image: getSafeHttpUrl(article.image)
    };
}

function createNewsLink(article, label, className) {
    const link = document.createElement("a");
    link.className = className;
    link.href = article.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    return link;
}

function createNewsImage(article) {
    const image = document.createElement("img");
    const fallbackImage =
        article.category === "Keselamatan Siber"
            ? "berita-pertahanan-siber.svg"
            : "berita-vcenter.svg";

    image.className = "news-article-image";
    image.alt = "Ilustrasi berita: " + article.title;
    image.loading = "lazy";
    image.src = article.image || fallbackImage;

    if (article.image) {
        image.addEventListener(
            "error",
            function () {
                image.src = fallbackImage;
            },
            { once: true }
        );
    }

    return image;
}

function createArchiveArticle(article, index) {
    const articleElement = document.createElement("article");
    const content = document.createElement("div");
    const category = document.createElement("span");
    const heading = document.createElement("h2");
    const summary = document.createElement("p");
    const metadata = document.createElement("div");
    const date = document.createElement("time");
    const source = document.createElement("span");
    const sourceLink = createNewsLink(article, "Baca laporan asal \u2197", "news-source-link");
    const headingId = "news-title-" + index;

    articleElement.className = "news-article";
    articleElement.id = "news-" + article.id;
    articleElement.dataset.category = article.category;
    articleElement.setAttribute("aria-labelledby", headingId);

    content.className = "news-article-content";
    category.className = "news-tag";
    category.textContent = article.category;
    heading.id = headingId;
    heading.textContent = article.title;
    summary.textContent = article.summary;
    metadata.className = "news-article-meta";
    date.dateTime = article.publishedAt;
    date.textContent = new Intl.DateTimeFormat("ms-MY", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date(article.publishedAt));
    source.textContent = "Sumber: " + article.source;

    content.append(category, heading, summary, metadata, sourceLink);
    metadata.append(date, source);
    articleElement.append(createNewsImage(article), content);
    return articleElement;
}

function renderArchive(articles) {
    const archive = document.querySelector(".news-archive");
    if (!archive) {
        return;
    }

    archive.replaceChildren.apply(
        archive,
        articles.map(function (article, index) {
            return createArchiveArticle(article, index);
        })
    );
    applyNewsFilter();
}

function scrollToArchiveTarget() {
    const targetId = window.location.hash.slice(1);
    if (!targetId) {
        return;
    }

    const target = document.getElementById(targetId);
    if (target) {
        target.scrollIntoView({ block: "start" });
    }
}

function renderSlide(slide, article) {
    const image = createNewsImage(article);
    image.className = "slide-image";

    const content = document.createElement("div");
    const category = document.createElement("span");
    const heading = document.createElement("h3");
    const summary = document.createElement("p");
    const detailsLink = document.createElement("a");
    const arrow = document.createElement("span");
    const metadata = document.createElement("div");
    const date = document.createElement("time");
    const separator = document.createElement("span");
    const source = document.createElement("span");
    const sourceLink = createNewsLink(article, article.source, "");

    content.className = "slide-content";
    category.className = "news-tag";
    category.textContent = article.category;
    heading.append(createNewsLink(article, article.title, ""));
    summary.textContent = article.summary;
    detailsLink.className = "news-details-link";
    detailsLink.href = "berita.html#news-" + article.id;
    detailsLink.textContent = "Baca ringkasan penuh ";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "\u2192";
    detailsLink.append(arrow);

    metadata.className = "news-meta";
    date.dateTime = article.publishedAt;
    date.textContent = new Intl.DateTimeFormat("ms-MY", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(new Date(article.publishedAt));
    separator.setAttribute("aria-hidden", "true");
    separator.textContent = "\u2022";
    source.className = "news-source";
    source.append("Sumber: ", sourceLink);
    metadata.append(date, separator, source);

    content.append(category, heading, summary, detailsLink, metadata);
    slide.replaceChildren(image, content);
}

function renderSlider(articles) {
    const slider = document.querySelector(".news-slider-section");
    if (!slider) {
        return;
    }

    const slides = Array.from(slider.querySelectorAll(".news-slide"));
    const dots = Array.from(slider.querySelectorAll(".slider-dots .dot"));
    if (slides.length !== 3 || dots.length !== 3 || articles.length < 3) {
        throw new Error("The news slider must have three slides and three indicators.");
    }

    articles.slice(0, 3).forEach(function (article, index) {
        const isActive = index === 0;
        renderSlide(slides[index], article);
        slides[index].classList.toggle("active", isActive);
        slides[index].setAttribute("aria-hidden", String(!isActive));
        slides[index].toggleAttribute("inert", !isActive);
        dots[index].classList.toggle("active", isActive);
        dots[index].setAttribute("aria-label", "Paparkan berita " + (index + 1));
        if (isActive) {
            dots[index].setAttribute("aria-current", "true");
        } else {
            dots[index].removeAttribute("aria-current");
        }
    });

    slider.dispatchEvent(new CustomEvent("news:data-updated"));
}

function applyNewsFilter(selectedCategory) {
    const archive = document.querySelector(".news-archive");
    if (!archive) {
        return;
    }

    const filterButtons = Array.from(document.querySelectorAll("[data-news-filter]"));
    const activeButton = filterButtons.find(function (button) {
        return button.getAttribute("aria-pressed") === "true";
    });
    const selectedFilter =
        selectedCategory || (activeButton ? activeButton.dataset.newsFilter : "all");
    const articles = Array.from(archive.querySelectorAll(".news-article"));
    let visibleCount = 0;

    filterButtons.forEach(function (button) {
        const isSelected = button.dataset.newsFilter === selectedFilter;
        button.setAttribute("aria-pressed", String(isSelected));
    });

    articles.forEach(function (article) {
        const isVisible =
            selectedFilter === "all" || article.dataset.category === selectedFilter;
        article.hidden = !isVisible;
        if (isVisible) {
            visibleCount++;
        }
    });

    const status = document.getElementById("archive-news-status");
    if (status && articles.length > 0 && status.dataset.state !== "error") {
        status.textContent =
            visibleCount === 0
                ? "Tiada berita dalam kategori ini."
                : visibleCount + " berita dipaparkan.";
    }
}

document.querySelectorAll("[data-news-filter]").forEach(function (button) {
    button.addEventListener("click", function () {
        applyNewsFilter(button.dataset.newsFilter);
    });
});

async function loadNewsData() {
    try {
        const response = await fetch("berita.json", { cache: "no-store" });
        if (!response.ok) {
            throw new Error("berita.json returned HTTP " + response.status);
        }

        const data = await response.json();
        if (data.schemaVersion !== 1 || !Array.isArray(data.articles)) {
            throw new Error("berita.json has an unsupported format.");
        }

        const articles = data.articles.map(normalizeNewsArticle);
        if (articles.length < 3 || articles.some(function (article) { return !article; })) {
            throw new Error("berita.json contains invalid or insufficient articles.");
        }

        const articleIds = new Set(articles.map(function (article) { return article.id; }));
        if (articleIds.size !== articles.length) {
            throw new Error("berita.json contains duplicate article identifiers.");
        }

        articles.sort(function (left, right) {
            return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
        });

        renderSlider(articles);
        renderArchive(articles);
        scrollToArchiveTarget();
        setNewsStatus(
            articles.length + " berita dimuatkan. Tarikh terkini dipaparkan dahulu.",
            false
        );
    } catch (error) {
        console.error("Gagal memuatkan berita daripada berita.json:", error);
        setNewsStatus(
            "Berita automatik gagal dimuatkan. Kandungan yang dipaparkan mungkin belum terkini.",
            true
        );
    }
}

loadNewsData();
