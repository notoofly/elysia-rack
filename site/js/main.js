// elysia-rack landing page behavior
(function () {
  'use strict';

  // Current year in footer
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Copy to clipboard buttons
  var copyBtns = document.querySelectorAll('.copy-btn');
  copyBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-target');
      var code = document.querySelector(target + ' code');
      if (!code) return;
      var text = code.innerText || code.textContent;
      navigator.clipboard.writeText(text).then(function () {
        var previous = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.color = '#10b981';
        setTimeout(function () {
          btn.textContent = previous;
          btn.style.color = '';
        }, 1600);
      });
    });
  });

  // Theme toggle (persists preference)
  var themeToggle = document.getElementById('theme-toggle');
  var STORAGE_KEY = 'elysia-rack-theme';
  function applyTheme(theme) {
    if (theme === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  }
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved) applyTheme(saved);
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var isLight = document.documentElement.classList.toggle('light');
      localStorage.setItem(STORAGE_KEY, isLight ? 'light' : 'dark');
    });
  }
})();
