/**
 * Toggle password field visibility for inputs referenced via data-target (element id).
 */
(function () {
  "use strict";

  document.querySelectorAll("[data-password-toggle]").forEach(function (btn) {
    var id = btn.getAttribute("data-target");
    var input = id ? document.getElementById(id) : null;
    var icon = btn.querySelector(".icon-password-toggle");
    if (!input || !icon) return;

    btn.addEventListener("click", function () {
      var visible = input.type === "text";
      input.type = visible ? "password" : "text";
      icon.textContent = visible ? "visibility" : "visibility_off";
      btn.setAttribute("aria-label", visible ? "Show password" : "Hide password");
      btn.setAttribute("aria-pressed", visible ? "false" : "true");
    });
  });
})();
