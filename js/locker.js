/**
 * AppZut Content Locker Engine
 * Powered by User Offer Feed: user_id=831501
 * Public Key: 8902c82579eec05db438 | Offers Key: 4a1d7b7a9f26dbe08fc3a0b059296411
 */
(function (window, document) {
  'use strict';

  var LOCKER_CONFIG = {
    userId: "831501",
    apiKeyPublic: "8902c82579eec05db438",
    apiKeyOffers: "4a1d7b7a9f26dbe08fc3a0b059296411",
    feedUrl: "https://dtvpp42hfuyb2.cloudfront.net/public/offers/feed.php?user_id=831501&api_key=4a1d7b7a9f26dbe08fc3a0b059296411&s1=&s2=",
    fallbackJsonUrls: ["/assets/js/offers.json", "/js/offers.json", "assets/js/offers.json", "../assets/js/offers.json", "../js/offers.json"],
    apkDownloadUrl: "/downloads/appzut-app.apk",
    requiredOffers: 1
  };

  var DEFAULT_OFFERS = [
    {
      id: "f0J6oYMrKhRm5E3",
      name: "Ball Catcher",
      anchor: "Complete free sponsor survey to unlock",
      conversion: "Complete the survey",
      network_icon: "https://cdn.affise.com/affise-media-service-prod/offers/959/33079/3019980592.200x200.jpeg",
      url: "https://oak.hoprly.com/a?p=o0J7NAb5C87OEGJ&o=f0J6oYMrKhRm5E3&s7=null&s8=null&s9=6d2b90a2cc4e",
      impression_url: "https://oak.hoprly.com/i?p=o0J7NAb5C87OEGJ&o=f0J6oYMrKhRm5E3"
    },
    {
      id: "f0J6oYX3QDUNnDi",
      name: "ClickBox - Earn Bonus",
      anchor: "Tap to claim your verified reward!",
      conversion: "Complete the survey",
      network_icon: "https://cdn.affise.com/affise-media-service-prod/offers/959/28565/1457439075.200x200.png",
      url: "https://oak.hoprly.com/a?p=o0J7NAb5C87OEGJ&o=f0J6oYX3QDUNnDi&s7=null&s8=null&s9=6d2b90a2cc4e",
      impression_url: "https://oak.hoprly.com/i?p=o0J7NAb5C87OEGJ&o=f0J6oYX3QDUNnDi"
    }
  ];

  var currentOffers = [];
  var offersLoaded = false;
  var clickedOffer = false;

  function loadOffers(callback) {
    if (offersLoaded && currentOffers.length > 0) {
      if (callback) callback(currentOffers);
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", LOCKER_CONFIG.feedUrl, true);
    xhr.timeout = 5000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (Array.isArray(data) && data.length > 0) {
            currentOffers = data;
            offersLoaded = true;
            if (callback) callback(currentOffers);
            return;
          }
        } catch (e) {}
      }
      loadFallbackJson(0, callback);
    };
    xhr.onerror = function () { loadFallbackJson(0, callback); };
    xhr.ontimeout = function () { loadFallbackJson(0, callback); };
    try {
      xhr.send();
    } catch (e) {
      loadFallbackJson(0, callback);
    }
  }

  function loadFallbackJson(index, callback) {
    if (index >= LOCKER_CONFIG.fallbackJsonUrls.length) {
      currentOffers = DEFAULT_OFFERS;
      offersLoaded = true;
      if (callback) callback(currentOffers);
      return;
    }

    var url = LOCKER_CONFIG.fallbackJsonUrls[index];
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 3000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (Array.isArray(data) && data.length > 0) {
            currentOffers = data;
            offersLoaded = true;
            if (callback) callback(currentOffers);
            return;
          }
        } catch (e) {}
      }
      loadFallbackJson(index + 1, callback);
    };
    xhr.onerror = function () { loadFallbackJson(index + 1, callback); };
    xhr.ontimeout = function () { loadFallbackJson(index + 1, callback); };
    try {
      xhr.send();
    } catch (e) {
      loadFallbackJson(index + 1, callback);
    }
  }

  function createModalHtml(appName, deviceExt) {
    return [
      '<div id="appzutLockerModal" class="appzut-modal-backdrop" style="display:none;">',
      '  <div class="appzut-modal-card">',
      '    <div class="appzut-modal-header">',
      '      <button type="button" class="appzut-modal-close" onclick="window.closeContentLocker()">&times;</button>',
      '      <div class="appzut-badge-lock">🔒 Verification Required</div>',
      '      <h3 class="appzut-modal-title">Install ' + escapeHtml(appName) + (deviceExt || '.apk') + '</h3>',
      '      <p class="appzut-modal-subtitle">Complete 1 free sponsor offer below to verify your device and immediately unlock the download package.</p>',
      '    </div>',
      '    <div class="appzut-modal-body">',
      '      <div class="appzut-step-indicator">',
      '        <span>Status: <b>Verification Pending</b></span>',
      '        <span>Step: <b>1 of 1</b></span>',
      '      </div>',
      '      <div id="appzutOffersContainer">',
      '        <div class="appzut-loading-offers">',
      '          <div class="appzut-spinner"></div>',
      '          <p>Loading available verified offers...</p>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="appzut-modal-footer">',
      '      <button type="button" id="appzutCheckStatusBtn" class="appzut-check-btn" onclick="window.checkLockerStatus()">',
      '        ⬇ Download Verified APK',
      '      </button>',
      '      <p class="appzut-footer-note">Free & 100% Virus Free • Verified by Google Play Protect & Apple TestFlight</p>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderOffers(offers) {
    var container = document.getElementById("appzutOffersContainer");
    if (!container) return;

    if (!offers || offers.length === 0) {
      container.innerHTML = '<div class="appzut-loading-offers"><p>No offers available at this moment. You can download directly.</p></div>';
      return;
    }

    var html = '<div class="appzut-offers-list">';
    for (var i = 0; i < offers.length; i++) {
      var item = offers[i];
      var icon = item.network_icon || 'https://appzut.com/assets/img/forgekit-mark.svg';
      var name = item.name || 'Sponsor Offer';
      var desc = item.conversion || item.anchor || 'Complete simple task to unlock';
      var url = item.url || '#';
      var imp = item.impression_url || '';

      html += '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer" class="appzut-offer-item" data-offer-id="' + escapeHtml(item.id) + '" data-imp="' + escapeHtml(imp) + '" onclick="window.onLockerOfferClick(this, event)">';
      html += '  <img src="' + escapeHtml(icon) + '" alt="' + escapeHtml(name) + '" class="appzut-offer-icon" onerror="this.src=\'https://appzut.com/assets/img/forgekit-mark.svg\'">';
      html += '  <div class="appzut-offer-info">';
      html += '    <h4 class="appzut-offer-name">' + escapeHtml(name) + '</h4>';
      html += '    <p class="appzut-offer-desc">' + escapeHtml(desc) + '</p>';
      html += '  </div>';
      html += '  <span class="appzut-offer-btn">Free ↗</span>';
      html += '</a>';
    }
    html += '</div>';

    container.innerHTML = html;

    // Send impressions
    for (var j = 0; j < offers.length; j++) {
      if (offers[j].impression_url) {
        var img = new Image();
        img.src = offers[j].impression_url;
      }
    }
  }

  window.openContentLocker = function (appName, deviceExt) {
    appName = appName || 'App Installer';
    deviceExt = deviceExt || (window.device ? window.device : '.apk');

    var modal = document.getElementById("appzutLockerModal");
    if (!modal) {
      var div = document.createElement("div");
      div.innerHTML = createModalHtml(appName, deviceExt);
      document.body.appendChild(div.firstElementChild);
      modal = document.getElementById("appzutLockerModal");
    } else {
      var titleEl = modal.querySelector(".appzut-modal-title");
      if (titleEl) titleEl.textContent = 'Install ' + appName + deviceExt;
    }

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    loadOffers(function (offers) {
      renderOffers(offers);
    });
  };

  window.closeContentLocker = function () {
    var modal = document.getElementById("appzutLockerModal");
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "";
    }
  };

  window.onLockerOfferClick = function (el) {
    clickedOffer = true;
    var btn = document.getElementById("appzutCheckStatusBtn");
    if (btn) {
      btn.style.background = "#397df5";
      btn.innerHTML = '🔄 Verifying Offer Completion... Click to Finish';
    }

    var imp = el.getAttribute("data-imp");
    if (imp) {
      var img = new Image();
      img.src = imp;
    }
  };

  window.checkLockerStatus = function () {
    var btn = document.getElementById("appzutCheckStatusBtn");
    if (!clickedOffer) {
      alert("Please tap on one of the offers above and complete the instructions first!");
      return;
    }

    if (btn) {
      btn.innerHTML = '⏳ Unlocking Package...';
      btn.disabled = true;
    }

    setTimeout(function () {
      if (btn) {
        btn.style.background = "#55d6a5";
        btn.innerHTML = '✅ Starting APK Download!';
      }
      var a = document.createElement("a");
      a.href = LOCKER_CONFIG.apkDownloadUrl;
      a.download = "appzut-app.apk";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(function () {
        window.closeContentLocker();
        if (btn) {
          btn.disabled = false;
          btn.style.background = "#6f83ff";
          btn.innerHTML = '⬇ Download Verified APK';
        }
      }, 2500);
    }, 2000);
  };

  // Preload offers
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      loadOffers();
    });
  } else {
    loadOffers();
  }
})(window, document);
