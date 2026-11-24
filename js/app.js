(() => {
  const catalog = window.APPZUT_CATALOG || [];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderStars(rating) {
    const filledCount = 4; // Matches live AppZut visual pattern (4 filled + 1 dim star)
    let html = "";
    for (let i = 0; i < 5; i++) {
      html += `<i class="${i < filledCount ? "filled" : ""}">★</i>`;
    }
    return html;
  }

  function renderAppCard(item) {
    const title = item.title || item.name;
    return `
      <a class="app-grid-card" href="app/${encodeURIComponent(item.slug)}.html">
        <div class="app-grid-media">
          <img src="${escapeHtml(item.icon)}" alt="" loading="lazy" referrerpolicy="no-referrer">
          <span class="app-grid-badge">${escapeHtml(item.badge)}</span>
        </div>
        <div class="app-grid-copy">
          <h3>${escapeHtml(title)}</h3>
          <div class="app-grid-meta">
            <span>${escapeHtml(item.category)}</span>
            <span>${escapeHtml(item.version)}</span>
          </div>
          <div class="app-grid-rating" aria-label="${escapeHtml(item.rating)} out of 5 stars">
            <span aria-hidden="true">${renderStars(item.rating)}</span>
            <b>${escapeHtml(item.rating)}</b>
          </div>
        </div>
      </a>
    `;
  }

  // ---- Home page tab switching (Discover / Apps / Games) ----
  if (document.body.classList.contains("home-page")) {
    const params = new URLSearchParams(window.location.search);
    const tab = (params.get("tab") || "discover").toLowerCase();
    const validTab = ["discover", "apps", "games"].includes(tab) ? tab : "discover";

    document.body.classList.remove("tab-discover", "tab-apps", "tab-games");
    document.body.classList.add(`tab-${validTab}`);

    document.querySelectorAll("[data-nav-tab]").forEach((link) => {
      link.classList.toggle("active", link.dataset.navTab === validTab);
    });

    const discoverView = document.getElementById("discover-view");
    const catalogView = document.getElementById("catalog-view");

    if (validTab === "apps" || validTab === "games") {
      if (discoverView) discoverView.hidden = true;
      if (catalogView) {
        catalogView.hidden = false;
        const isApps = validTab === "apps";
        const items = catalog.filter((item) =>
          isApps ? item.category === "Apps" : item.category === "Games"
        );
        document.title = `${isApps ? "Apps" : "Games"} · AppZut`;
        catalogView.innerHTML = `
          <div class="catalog-view-head">
            <div>
              <span class="kicker">${isApps ? "Curated mobile apps" : "Curated mobile games"}</span>
              <h1>${isApps ? "Apps" : "Games"}</h1>
              <p>${
                isApps
                  ? "Emulators, launchers, and utility mods with clear setup guides."
                  : "Popular game mods, executors, and unlocked editions for iOS & Android."
              }</p>
            </div>
            <strong>${items.length}<span>${items.length === 1 ? "item" : "items"}</span></strong>
          </div>
          <div class="latest-grid">
            ${items.map(renderAppCard).join("")}
          </div>
        `;
      }
    }
  }

  // ---- Search page ----
  if (document.body.classList.contains("search-page")) {
    const params = new URLSearchParams(window.location.search);
    const input = document.getElementById("search-input");
    const clearBtn = document.getElementById("search-clear");
    const countEl = document.getElementById("search-count");
    const listEl = document.getElementById("search-result-list");
    const filterLinks = document.querySelectorAll("[data-search-filter]");

    let activeFilter = (params.get("category") || "all").toLowerCase();
    if (!["all", "apps", "games"].includes(activeFilter)) activeFilter = "all";

    if (input) {
      input.value = params.get("q") || "";
    }

    function updateSearch() {
      const q = (input?.value || "").trim().toLowerCase();
      if (clearBtn) clearBtn.style.visibility = q ? "visible" : "hidden";

      filterLinks.forEach((a) => {
        a.classList.toggle("active", a.dataset.searchFilter === activeFilter);
      });

        const matches = catalog.filter((item) => {
        const title = item.title || item.name || "";
        const matchesCat =
          activeFilter === "all" ||
          item.category.toLowerCase() === activeFilter;
        const matchesQuery =
          !q ||
          title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.short_desc || item.summary || "").toLowerCase().includes(q);
        return matchesCat && matchesQuery;
      });

      if (countEl) {
        countEl.innerHTML = q
          ? `Found <strong>${matches.length}</strong> ${matches.length === 1 ? "result" : "results"} for "<strong>${escapeHtml(input.value.trim())}</strong>"`
          : `Showing <strong>${matches.length}</strong> ${activeFilter === "all" ? "items" : activeFilter}`;
      }

      if (listEl) {
        if (!matches.length) {
          listEl.innerHTML = `<div class="empty">No matching mods or apps found. Try another search term.</div>`;
        } else {
          listEl.innerHTML = matches
            .map(
              (item) => `
                <a class="search-result-card" href="app/${encodeURIComponent(item.slug)}.html">
                  <img src="${escapeHtml(item.icon)}" alt="" loading="lazy" referrerpolicy="no-referrer">
                  <div class="search-result-copy">
                    <h2>${escapeHtml(item.title || item.name)}</h2>
                    <span>${escapeHtml(item.category)}<i>·</i>v${escapeHtml(item.version)}<i>·</i>${escapeHtml(item.platform || "iOS & Android")}</span>
                    <div class="search-result-rating">
                      <span aria-hidden="true">${renderStars(item.rating)}</span>
                      <b>${escapeHtml(item.rating)}</b>
                    </div>
                  </div>
                  <span class="search-result-badge">${escapeHtml(item.badge)}</span>
                  <span class="search-result-arrow" aria-hidden="true">›</span>
                </a>
              `
            )
            .join("");
        }
      }
    }

    input?.addEventListener("input", updateSearch);
    clearBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (input) {
        input.value = "";
        input.focus();
      }
      updateSearch();
    });

    filterLinks.forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        activeFilter = a.dataset.searchFilter || "all";
        updateSearch();
      });
    });

    updateSearch();
  }

  // ---- Detail page (post.html) ----
  if (document.body.classList.contains("detail-page")) {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");
    const item = catalog.find((entry) => entry.slug === slug) || catalog[0];

    if (item) {
      document.title = `${item.name} · AppZut`;
      const setSrc = (id, src) => {
        const el = document.getElementById(id);
        if (el) el.src = src;
      };
      const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };

      setSrc("detail-cover", item.cover || item.icon);
      setSrc("detail-icon", item.icon);
      setSrc("dl-icon", item.icon);

      setText("detail-badge", `${item.badge} · ${item.category}`);
      setText("detail-category", `${item.category} · ${item.platform}`);
      setText("detail-title", item.name);
      setText("detail-summary", item.summary);
      setText("fact-version", `v${item.version}`);
      setText("fact-rating", `${item.rating}`);
      setText("fact-size", item.size);
      setText("dl-box-title", `${item.name} v${item.version}`);
      setText("dl-name", item.name);

      const bodyEl = document.getElementById("detail-body");
      if (bodyEl) bodyEl.innerHTML = item.bodyHtml;

      const reqList = document.getElementById("requirements-list");
      if (reqList && Array.isArray(item.requirements)) {
        reqList.innerHTML = item.requirements
          .map(
            (req, idx) =>
              `<li><b>0${idx + 1}</b><span>${escapeHtml(req)}</span></li>`
          )
          .join("");
      }
    }
  }

  // ---- Detail page accordion ----
  const readMore = document.getElementById("read-more");
  const detailBody = document.getElementById("detail-body");
  readMore?.addEventListener("click", () => {
    const expanded = readMore.getAttribute("aria-expanded") === "true";
    readMore.setAttribute("aria-expanded", String(!expanded));
    detailBody?.classList.toggle("collapsed", expanded);
    const label = readMore.querySelector("span");
    const arrow = readMore.querySelector("b");
    if (label) label.textContent = expanded ? "Read full description" : "Show less";
    if (arrow) arrow.textContent = expanded ? "↓" : "↑";
  });

  // ---- Download progress modal ----
  const overlay = document.getElementById("dl-overlay");
  const ring = document.getElementById("dl-ring");
  const percentEl = document.getElementById("dl-percent");
  const statusEl = document.getElementById("dl-status");
  const btn = document.getElementById("btn-download");
  const close = document.getElementById("dl-close");
  if (!btn || !overlay) return;

  let timer = null;
  const circumference = 2 * Math.PI * 60;
  if (ring) {
    ring.style.strokeDasharray = String(circumference);
    ring.style.strokeDashoffset = String(circumference);
  }

  function setProgress(value) {
    const bounded = Math.max(0, Math.min(100, Math.floor(value)));
    if (percentEl) percentEl.textContent = `${bounded}%`;
    if (ring) {
      ring.style.strokeDashoffset = String(
        circumference - (bounded / 100) * circumference
      );
    }
    document.querySelectorAll("[data-process-step]").forEach((step) => {
      const n = Number(step.dataset.processStep);
      const activeStep = bounded < 34 ? 1 : bounded < 76 ? 2 : bounded < 100 ? 3 : 4;
      step.classList.toggle("active", n === activeStep);
      step.classList.toggle("done", n < activeStep);
    });
    if (statusEl) {
      statusEl.textContent =
        bounded < 34
          ? "Checking your browser and device."
          : bounded < 76
          ? "Preparing the latest compatible package."
          : bounded < 100
          ? "Finalizing package verification..."
          : "Package ready! Close this dialog or start again anytime.";
    }
  }

  function closeModal() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    overlay.hidden = true;
    document.body.classList.remove("download-open");
  }

  btn.addEventListener("click", () => {
    overlay.hidden = false;
    document.body.classList.add("download-open");
    let progress = 0;
    setProgress(0);
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      progress += 2;
      setProgress(progress);
      if (progress >= 100) {
        clearInterval(timer);
        timer = null;
      }
    }, 110);
  });

  close?.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeModal();
  });
})();
