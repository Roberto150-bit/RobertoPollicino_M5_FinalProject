/**
 * DegreePilot AI — landing page gate (static prototype only).
 * Sign-in compares SHA-256 digests of the fields you type; no passwords are
 * stored in this file or in the HTML. Successful sign-in unlocks dashboard.html
 * via sessionStorage only (not real server authentication).
 */

(function () {
  "use strict";

  var SESSION_KEY = "dp_authenticated";

  /* UTF-8 SHA-256 digests (lowercase hex) for the access pair you use locally — not the raw strings. */
  var EXPECTED_USER_SHA256 = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
  var EXPECTED_PASS_SHA256 = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

  function sha256Hex(plain) {
    if (!window.crypto || !window.crypto.subtle) {
      return Promise.resolve(null);
    }
    var enc = new TextEncoder();
    return window.crypto.subtle.digest("SHA-256", enc.encode(plain)).then(function (buf) {
      return Array.from(new Uint8Array(buf))
        .map(function (b) {
          return b.toString(16).padStart(2, "0");
        })
        .join("");
    });
  }

  function goDashboard() {
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch (e) {
      /* sessionStorage may be blocked in strict modes */
    }
    window.location.href = "dashboard.html";
  }

  function showLoginError(msg) {
    var box = document.getElementById("login-error");
    if (!box) return;
    box.textContent = msg;
    box.hidden = false;
  }

  function clearLoginError() {
    var box = document.getElementById("login-error");
    if (!box) return;
    box.textContent = "";
    box.hidden = true;
  }

  var form = document.getElementById("login-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearLoginError();
      var u = (document.getElementById("username").value || "").trim();
      var p = document.getElementById("password").value || "";

      sha256Hex(u).then(function (userHash) {
        return sha256Hex(p).then(function (passHash) {
          return { userHash: userHash, passHash: passHash };
        });
      }).then(function (h) {
        if (!h.userHash || !h.passHash) {
          showLoginError("This browser cannot complete sign-in (crypto unavailable). Try another browser.");
          return;
        }
        if (h.userHash === EXPECTED_USER_SHA256 && h.passHash === EXPECTED_PASS_SHA256) {
          goDashboard();
        } else {
          showLoginError("Please sign in with valid demo access.");
        }
      }).catch(function () {
        showLoginError("Please sign in with valid demo access.");
      });
    });
  }

  var forgot = document.getElementById("btn-forgot");
  var forgotMsg = document.getElementById("forgot-msg");
  if (forgot && forgotMsg) {
    forgot.addEventListener("click", function () {
      forgotMsg.textContent = "Password recovery is not available in this prototype.";
      forgotMsg.hidden = false;
    });
  }
})();
