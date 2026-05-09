/**
 * DegreePilot AI — landing page authentication (prototype only).
 * Successful sign-in and “Try demo” both unlock dashboard.html via sessionStorage.
 * Real authentication is NOT implemented; credentials are for demonstration only.
 */

(function () {
  "use strict";

  // Hidden demo gate — intentionally not shown anywhere in the HTML (per project requirements).
  var DP_DEMO_USER = "demo";
  var DP_DEMO_PASS = "demo1234";

  var SESSION_KEY = "dp_authenticated";

  function goDashboard() {
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch (e) {
      /* sessionStorage may be blocked in strict modes */
    }
    window.location.href = "dashboard.html";
  }

  function bindTryDemo(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", function () {
      goDashboard();
    });
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
      if (u === DP_DEMO_USER && p === DP_DEMO_PASS) {
        goDashboard();
      } else {
        showLoginError("Please sign in with valid demo access.");
      }
    });
  }

  bindTryDemo("btn-try-demo");
  bindTryDemo("btn-try-demo-2");

  var forgot = document.getElementById("btn-forgot");
  var forgotMsg = document.getElementById("forgot-msg");
  if (forgot && forgotMsg) {
    forgot.addEventListener("click", function () {
      forgotMsg.textContent = "Password recovery is not available in this prototype.";
      forgotMsg.hidden = false;
    });
  }
})();
