/**
 * AppZut Professional Search Engine
 * International-grade fuzzy search with typo tolerance, instant live dropdown, and multi-field scoring.
 */
(() => {
  // 1. Unicode & Accent Normalization (International Standard)
  function normalizeString(str) {
    if (!str) return "";
    return String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 2. Damerau-Levenshtein distance (handles insertions, deletions, substitutions, and transpositions)
  function damerauLevenshtein(s1, s2) {
    const len1 = s1.length;
    const len2 = s2.length;
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    const d = [];
    for (let i = 0; i <= len1; i++) {
      d[i] = [];
      d[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      d[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,       // deletion
          d[i][j - 1] + 1,       // insertion
          d[i - 1][j - 1] + cost // substitution
        );
        if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
        }
      }
    }
    return d[len1][len2];
  }

  // 3. Multi-Level Scoring Search Pipeline
  function searchCatalog(query, categoryFilter = "all") {
    const catalog = window.APPZUT_CATALOG || [];
    if (!catalog.length) return [];

    const rawQ = (query || "").trim();
    const cleanQ = normalizeString(rawQ);
    const qTokens = cleanQ.split(/\s+/).filter(Boolean);

    if (!cleanQ) {
      if (!categoryFilter || categoryFilter === "all") {
        return catalog.slice();
      }
      return catalog.filter(it => it.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    const scored = [];

    for (const item of catalog) {
      if (categoryFilter && categoryFilter !== "all" && item.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        continue;
      }

      const titleNorm = normalizeString(item.title);
      const titleTokens = titleNorm.split(/\s+/);
      const descNorm = normalizeString(item.short_desc || "");
      const allKeywords = (item.keywords || []).map(normalizeString);
      const allAliases = (item.aliases || []).map(normalizeString);

      let score = 0;

      // 1. Exact match with title or alias
      if (titleNorm === cleanQ || allAliases.includes(cleanQ)) {
        score = Math.max(score, 100);
      }

      // 2. Title starts with clean query (e.g. "p" -> "Pokemon Go Spoofer")
      else if (titleNorm.startsWith(cleanQ)) {
        score = Math.max(score, 95);
      }

      // 3. Any word in title starts with clean query (e.g. "spoofer", "9", "executor")
      else if (titleTokens.some(t => t.startsWith(cleanQ))) {
        score = Math.max(score, 90);
      }

      // 4. Acronym match (e.g. "bb9" -> "BASEBALL 9 Hack", "pogo" -> "Pokemon Go")
      const acronym = titleTokens.map(t => t[0]).join("");
      if (acronym === cleanQ || (cleanQ.length >= 2 && acronym.startsWith(cleanQ))) {
        score = Math.max(score, 88);
      }

      // 5. Substring match in title or aliases
      if (titleNorm.includes(cleanQ)) {
        score = Math.max(score, 85);
      }
      if (allAliases.some(al => al.includes(cleanQ) || cleanQ.includes(al))) {
        score = Math.max(score, 84);
      }

      // 6. Keywords match
      for (const kw of allKeywords) {
        if (kw === cleanQ) {
          score = Math.max(score, 82);
        } else if (kw.startsWith(cleanQ)) {
          score = Math.max(score, 78);
        } else if (kw.includes(cleanQ)) {
          score = Math.max(score, 72);
        }
      }

      // 7. Multi-token match: all tokens present across title/keywords/desc
      if (qTokens.length > 1) {
        const allPresent = qTokens.every(qt => 
          titleNorm.includes(qt) || 
          allKeywords.some(k => k.includes(qt)) ||
          descNorm.includes(qt)
        );
        if (allPresent) {
          score = Math.max(score, 80);
        }
      }

      // 8. Typo-Tolerance / Fuzzy Match using Damerau-Levenshtein
      if (cleanQ.length >= 3) {
        const candidates = [...titleTokens, ...allAliases, ...allKeywords];
        for (const cand of candidates) {
          const dist = damerauLevenshtein(cleanQ, cand);
          const maxLen = Math.max(cleanQ.length, cand.length);
          const allowedDist = cleanQ.length <= 4 ? 1 : cleanQ.length <= 7 ? 2 : 3;
          if (dist <= allowedDist) {
            const similarity = 1 - (dist / maxLen);
            const fuzzyScore = Math.floor(60 + similarity * 25);
            score = Math.max(score, fuzzyScore);
          }
        }
      }

      // 9. Single character fallback: title includes letter
      if (cleanQ.length === 1) {
        if (titleNorm.includes(cleanQ)) {
          score = Math.max(score, 50);
        } else if (allKeywords.some(k => k.startsWith(cleanQ))) {
          score = Math.max(score, 45);
        }
      }

      if (score > 0) {
        scored.push({ item, score });
      }
    }

    // Sort by score descending, then rating
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (parseFloat(b.item.rating) || 0) - (parseFloat(a.item.rating) || 0);
    });

    return scored.map(s => s.item);
  }

  // Helper to determine relative paths
  function getPathPrefix() {
    const path = window.location.pathname.replace(/\\/g, "/");
    return path.includes("/app/") ? "../" : "";
  }

  function getAppHref(slug) {
    const path = window.location.pathname.replace(/\\/g, "/");
    return path.includes("/app/") ? `${slug}.html` : `app/${slug}.html`;
  }

  function getSearchHref(q) {
    const prefix = getPathPrefix();
    return `${prefix}search.html${q ? "?q=" + encodeURIComponent(q) : ""}`;
  }

  function getIconSrc(src) {
    if (!src) return "";
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) {
      return src;
    }
    return getPathPrefix() + src;
  }

  function highlightMatches(text, query) {
    if (!query) return escapeHtml(text);
    const clean = normalizeString(query);
    const tokens = clean.split(/\s+/).filter(Boolean);
    if (!tokens.length) return escapeHtml(text);

    let html = escapeHtml(text);
    for (const t of tokens) {
      if (t.length >= 1) {
        const regex = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        html = html.replace(regex, "<mark>$1</mark>");
      }
    }
    return html;
  }

  // 4. Initialize Live Header Search on Every Page
  function initHeaderSearch() {
    const forms = document.querySelectorAll("form.search");
    if (!forms.length) return;

    forms.forEach((form) => {
      const input = form.querySelector('input[type="search"]');
      if (!input) return;

      // Ensure form routes properly to search.html
      form.setAttribute("action", getSearchHref(""));
      form.setAttribute("method", "get");
      form.setAttribute("role", "search");

      // Create or find dropdown element
      let dropdown = form.querySelector(".search-dropdown");
      if (!dropdown) {
        dropdown = document.createElement("div");
        dropdown.className = "search-dropdown";
        dropdown.hidden = true;
        dropdown.setAttribute("role", "listbox");
        dropdown.setAttribute("aria-label", "Search results");
        form.appendChild(dropdown);
      }

      let selectedIndex = -1;
      let debounceTimer = null;

      function closeDropdown() {
        dropdown.hidden = true;
        dropdown.innerHTML = "";
        selectedIndex = -1;
      }

      function renderDropdownResults() {
        const val = input.value.trim();
        if (!val) {
          closeDropdown();
          return;
        }

        const results = searchCatalog(val, "all");
        selectedIndex = -1;

        if (!results.length) {
          dropdown.hidden = false;
          dropdown.innerHTML = `
            <div class="search-drop-empty">
              No matching apps found for "<strong>${escapeHtml(val)}</strong>".
              <br><small style="color:#6f83ff;display:inline-block;margin-top:6px;">Press Enter to search catalog</small>
            </div>
          `;
          return;
        }

        const topMatches = results.slice(0, 5);
        let itemsHtml = topMatches.map((item, idx) => {
          const appUrl = getAppHref(item.slug);
          const iconUrl = getIconSrc(item.icon);
          const highlightedTitle = highlightMatches(item.title, val);

          return `
            <a class="search-drop-item" href="${appUrl}" data-index="${idx}" role="option">
              <img class="search-drop-icon" src="${escapeHtml(iconUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" referrerpolicy="no-referrer">
              <div class="search-drop-info">
                <div class="search-drop-title-row">
                  <strong class="search-drop-title">${highlightedTitle}</strong>
                  <span class="search-drop-badge">${escapeHtml(item.badge || "Mod")}</span>
                </div>
                <div class="search-drop-meta">
                  <span>${escapeHtml(item.category)}</span>
                  <span>·</span>
                  <span>v${escapeHtml(item.version)}</span>
                  <span>·</span>
                  <span class="search-drop-stars">★ ${escapeHtml(item.rating)}</span>
                </div>
              </div>
              <span class="search-drop-arrow" aria-hidden="true">›</span>
            </a>
          `;
        }).join("");

        const footerHtml = `
          <a class="search-drop-footer" href="${getSearchHref(val)}" data-index="${topMatches.length}">
            <span>View all <strong>${results.length}</strong> matching results for "${escapeHtml(val)}"</span>
            <b>→</b>
          </a>
        `;

        dropdown.hidden = false;
        dropdown.innerHTML = `
          <div class="search-drop-header">Instant Matches (${results.length})</div>
          <div class="search-drop-list">${itemsHtml}</div>
          ${footerHtml}
        `;
      }

      input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(renderDropdownResults, 30);
      });

      input.addEventListener("focus", () => {
        if (input.value.trim()) {
          renderDropdownResults();
        }
      });

      // Keyboard navigation
      input.addEventListener("keydown", (e) => {
        if (dropdown.hidden) return;

        const items = dropdown.querySelectorAll(".search-drop-item, .search-drop-footer");
        if (!items.length) return;

        if (e.key === "ArrowDown") {
          e.preventDefault();
          selectedIndex = (selectedIndex + 1) % items.length;
          updateSelected(items);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          selectedIndex = (selectedIndex - 1 + items.length) % items.length;
          updateSelected(items);
        } else if (e.key === "Enter") {
          if (selectedIndex >= 0 && items[selectedIndex]) {
            e.preventDefault();
            items[selectedIndex].click();
          }
        } else if (e.key === "Escape") {
          closeDropdown();
        }
      });

      function updateSelected(items) {
        items.forEach((it, i) => {
          it.classList.toggle("selected", i === selectedIndex);
          if (i === selectedIndex) {
            it.scrollIntoView({ block: "nearest" });
          }
        });
      }

      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (!form.contains(e.target)) {
          closeDropdown();
        }
      });
    });
  }

  // 5. Initialize Dedicated Search Page (search.html)
  function initSearchPage() {
    if (!document.body.classList.contains("search-page")) return;

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

    function renderSearchResults() {
      const q = (input?.value || "").trim();
      if (clearBtn) clearBtn.style.visibility = q ? "visible" : "hidden";

      filterLinks.forEach((a) => {
        a.classList.toggle("active", a.dataset.searchFilter === activeFilter);
      });

      const matches = searchCatalog(q, activeFilter);

      if (countEl) {
        if (q) {
          countEl.innerHTML = `Found <strong>${matches.length}</strong> ${matches.length === 1 ? "result" : "results"} for "<strong>${escapeHtml(q)}</strong>"`;
        } else {
          countEl.innerHTML = `Showing <strong>${matches.length}</strong> ${activeFilter === "all" ? "items" : activeFilter}`;
        }
      }

      if (listEl) {
        if (!matches.length) {
          listEl.innerHTML = `
            <div class="empty" style="text-align:center;padding:48px 20px;color:#8d99af;background:#111a2a;border-radius:16px;border:1px solid #263147;">
              <p style="font-size:1.1rem;color:#f4f7ff;margin-bottom:8px;">No matching mods or apps found</p>
              <p style="font-size:0.85rem;margin:0;">Try typing a single letter, a game name, or a related term (e.g. "pokemon", "roblox", "ps2", "sims").</p>
            </div>
          `;
        } else {
          listEl.innerHTML = matches.map((item) => {
            const appUrl = getAppHref(item.slug);
            const iconUrl = getIconSrc(item.icon);
            const highlightedTitle = highlightMatches(item.title, q);

            return `
              <a class="search-result-card" href="${appUrl}">
                <img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" referrerpolicy="no-referrer">
                <div class="search-result-copy">
                  <h2>${highlightedTitle}</h2>
                  <span>${escapeHtml(item.category)}<i>·</i>v${escapeHtml(item.version)}<i>·</i>${escapeHtml(item.size || "iOS & Android")}</span>
                  <div class="search-result-rating">
                    <span aria-hidden="true"><i class="filled">★</i><i class="filled">★</i><i class="filled">★</i><i class="filled">★</i><i class="">★</i></span>
                    <b>${escapeHtml(item.rating)}</b>
                  </div>
                </div>
                <span class="search-result-badge">${escapeHtml(item.badge || "Mod")}</span>
                <span class="search-result-arrow" aria-hidden="true">›</span>
              </a>
            `;
          }).join("");
        }
      }
    }

    input?.addEventListener("input", renderSearchResults);
    clearBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (input) {
        input.value = "";
        input.focus();
      }
      renderSearchResults();
    });

    filterLinks.forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        activeFilter = a.dataset.searchFilter || "all";
        renderSearchResults();
      });
    });

    renderSearchResults();
  }

  // Expose search API globally
  window.searchCatalog = searchCatalog;

  // Initialize once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initHeaderSearch();
      initSearchPage();
    });
  } else {
    initHeaderSearch();
    initSearchPage();
  }
})();
