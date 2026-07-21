/* BookListing AI — KDP Listing SEO Audit engine (client-side, zero cost)
 * Scores a KDP book's metadata the way Amazon search (COSMO) rewards signals:
 *   Title, 7 backend Keywords, Description, Categories, Completeness.
 * Weights sum to 100. All logic runs in-browser; no network calls for scoring.
 */
(function () {
  "use strict";


  // ---- centralized audit counter (fire-and-forget) ----
  var COUNTER_NS = "booklisting-ai";
  function trackAudit() {
    try {
      fetch("https://api.counterapi.dev/v1/" + COUNTER_NS + "/audit_completed/up", {
        method: "GET",
        mode: "cors",
        cache: "no-store"
      });
    } catch (e) {}
  }
  var form = document.getElementById("auditForm");
  var result = document.getElementById("auditResult");
  var titleEl = document.getElementById("fTitle");
  var tagsEl = document.getElementById("fTags");
  var descEl = document.getElementById("fDesc");
  var catsEl = document.getElementById("fCats");
  var kwEl = document.getElementById("fKeyword");
  var titleCount = document.getElementById("titleCount");
  var tagCount = document.getElementById("tagCount");
  var catCount = document.getElementById("catCount");
  var heroScore = document.getElementById("heroScore");
  var heroGrade = document.getElementById("heroGrade");

  var MAX_TITLE = 200;
  var MAX_TAGS = 7;
  var MAX_CATS = 3;

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function gradeFor(score) {
    if (score >= 85) return { g: "A", color: "var(--good)" };
    if (score >= 70) return { g: "B", color: "var(--brand)" };
    if (score >= 55) return { g: "C", color: "var(--warn)" };
    return { g: "D", color: "var(--bad)" };
  }

  function parseList(raw) {
    return raw
      .split(",")
      .map(function (t) { return t.trim().toLowerCase(); })
      .filter(function (t) { return t.length > 0; });
  }
  function hasMultiWord(list) {
    return list.filter(function (t) { return t.split(/\s+/).length >= 2; }).length;
  }

  function updateCounts() {
    titleCount.textContent = titleEl.value.length + " / " + MAX_TITLE;
    tagCount.textContent = parseList(tagsEl.value).length + " / " + MAX_TAGS;
    catCount.textContent = parseList(catsEl.value).length + " / " + MAX_CATS;
  }

  function scoreListing(input) {
    var title = input.title;
    var tags = input.tags;
    var desc = input.desc;
    var cats = input.cats;
    var kw = input.keyword;
    var tips = [];
    var dims = {};

    // 1) Title (25)
    var tLen = title.length;
    var tScore = 0;
    if (tLen >= 140 && tLen <= MAX_TITLE) tScore = 25;
    else if (tLen >= 90) tScore = 20;
    else if (tLen >= 45) tScore = 12;
    else if (tLen > 0) tScore = 4;
    if (tLen === 0) tScore = 0;
    if (kw && tLen) {
      var firstWords = title.toLowerCase().split(/\s+/).slice(0, 5).join(" ");
      if (firstWords.indexOf(kw.toLowerCase()) !== -1) tScore = clamp(tScore + 2, 0, 25);
      else tips.push("Put your main keyword “" + kw + "” near the front of the title — Amazon weighs the first words most.");
    }
    if (tLen < 160 && tLen > 0) tips.push("Title is " + tLen + " chars. Amazon gives you 200 — use more of it with the subtitle and high-intent phrases.");
    if (tLen < 60) tips.push("Title is very short. Aim for 160–200 chars (title + subtitle) packed with search phrases.");
    dims.Title = { score: tScore, max: 25 };

    // 2) Keywords (25): need 7, reward multi-word
    var nTags = tags.length;
    var tagFill = (Math.min(nTags, MAX_TAGS) / MAX_TAGS) * 18;
    var multi = hasMultiWord(tags);
    var tagPhrase = (multi / MAX_TAGS) * 7;
    var tagScore = Math.round(tagFill + tagPhrase);
    if (nTags < MAX_TAGS) tips.push("You have " + nTags + " backend keywords. Amazon allows 7 — fill all of them; each is a free search entry point.");
    if (nTags > 0 && multi < nTags) tips.push("Use multi-word keywords (e.g. “mom planner” not “planner”). Readers type phrases, not single words.");
    if (tags.length !== new Set(tags).size) tips.push("You have duplicate keywords — each should be unique to maximize reach.");
    dims.Keywords = { score: tagScore, max: 25 };

    // 3) Keyword strategy (15): present in title/keywords/description
    var kwScore = 0;
    if (kw) {
      var kwL = kw.toLowerCase();
      var inTitle = title.toLowerCase().indexOf(kwL) !== -1;
      var inTags = tags.indexOf(kwL) !== -1 || tags.some(function (t) { return t.indexOf(kwL) !== -1; });
      var inDesc = desc.toLowerCase().indexOf(kwL) !== -1;
      if (inTitle) kwScore += 6; else tips.push("Your target keyword isn’t in the title — add it.");
      if (inTags) kwScore += 5; else tips.push("Add your target keyword as one of the 7 backend keywords.");
      if (inDesc) kwScore += 4; else tips.push("Mention your target keyword in the description too.");
    } else {
      kwScore = 9;
      tips.push("Add a target keyword to get a deeper keyword-coverage analysis.");
    }
    dims["Keyword coverage"] = { score: kwScore, max: 15 };

    // 4) Description (20): length + signal
    var dLen = desc.length;
    var dScore = 0;
    if (dLen >= 1000) dScore = 20;
    else if (dLen >= 500) dScore = 16;
    else if (dLen >= 200) dScore = 10;
    else if (dLen > 0) dScore = 4;
    if (dLen < 500 && dLen > 0) tips.push("Description is " + dLen + " chars. Aim for 500+ with what’s inside, who it’s for, and a hook.");
    if (dLen === 0) tips.push("Add a description — it’s indexable and drives the click.");
    dims.Description = { score: dScore, max: 20 };

    // 5) Categories (15): up to 3
    var nCats = cats.length;
    var catScore = 0;
    if (nCats >= 3) catScore = 15;
    else if (nCats === 2) catScore = 11;
    else if (nCats === 1) catScore = 6;
    if (nCats < 2) tips.push("Pick at least 2 categories (Amazon allows up to 2 browse + in-keyword). Niche categories = easier to rank.");
    dims.Categories = { score: catScore, max: 15 };

    var total = Math.round(
      dims.Title.score + dims.Keywords.score + dims["Keyword coverage"].score +
      dims.Description.score + dims.Categories.score
    );
    if (tLen === 0 && nTags === 0 && dLen === 0 && nCats === 0) total = 0;

    if (tips.length === 0) tips.push("Solid metadata — keep an eye on ranking and refresh keywords as trends shift.");
    return { total: total, dims: dims, tips: tips, grade: gradeFor(total).g };
  }

  function render(res) {
    var gr = gradeFor(res.total);
    document.getElementById("resScore").textContent = res.total;
    var gEl = document.getElementById("resGrade");
    gEl.textContent = "Grade " + gr.g;
    gEl.style.background = gr.color;
    gEl.style.color = "#fff";
    document.getElementById("resSummary").textContent =
      res.total >= 85 ? "Strong listing — minor tweaks only."
      : res.total >= 70 ? "Good foundation, a few quick wins left."
      : res.total >= 55 ? "Workable, but leaving ranking points on the table."
      : "Needs real work before it can compete.";

    var bars = document.getElementById("resBars");
    bars.innerHTML = "";
    Object.keys(res.dims).forEach(function (k) {
      var d = res.dims[k];
      var pct = Math.round((d.score / d.max) * 100);
      var row = document.createElement("div");
      row.className = "bar-row";
      row.innerHTML =
        '<span>' + k + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + pct + '%"></span></span>' +
        '<span class="bar-val">' + d.score + '/' + d.max + '</span>';
      bars.appendChild(row);
    });

    var tipsEl = document.getElementById("resTips");
    tipsEl.innerHTML = "";
    res.tips.forEach(function (t) {
      var li = document.createElement("li");
      li.textContent = t;
      tipsEl.appendChild(li);
    });

    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var res = scoreListing({
      title: titleEl.value,
      tags: parseList(tagsEl.value),
      desc: descEl.value,
      cats: parseList(catsEl.value),
      keyword: kwEl.value.trim()
    });
    render(res);
    trackAudit();
  });

  heroScore.textContent = 68;
  heroGrade.textContent = "B";

  // ---- email capture (Formspree free tier, graceful demo fallback) ----
  // Get a FREE form ID at https://formspree.io (no payment). Paste it into FORMSPREE_ID below.
  var emailForm = document.getElementById("emailForm");
  var FORMSPREE_ID = "meeyzkdp"; // free form ID from formspree.io (no payment)
  emailForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("fEmail").value;
    var note = document.getElementById("emailNote");
    if (FORMSPREE_ID.indexOf("YOUR_") === 0) {
      try {
        var store = JSON.parse(localStorage.getItem("booklisting_leads") || "[]");
        store.push({ email: email, ts: new Date().toISOString() });
        localStorage.setItem("booklisting_leads", JSON.stringify(store));
      } catch (err) {}
      note.textContent = "✓ Demo mode: lead saved locally (" + email + "). Add a free Formspree ID to receive real emails.";
      note.style.color = "var(--good)";
    } else {
      fetch("https://formspree.io/f/" + FORMSPREE_ID, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, subject: "BookListing AI audit lead", source: "BookListing landing" })
      })
        .then(function (r) {
          if (r.ok) { note.textContent = "✓ Subscribed! We'll email you launch + KDP SEO tips."; note.style.color = "var(--good)"; }
          else { note.textContent = "Couldn't send — try again or email us."; note.style.color = "var(--bad)"; }
        })
        .catch(function () { note.textContent = "Couldn't send — try again or email us."; note.style.color = "var(--bad)"; });
    }
    emailForm.reset();
  });

  updateCounts();
  titleEl.addEventListener("input", updateCounts);
  tagsEl.addEventListener("input", updateCounts);
  catsEl.addEventListener("input", updateCounts);
})();
