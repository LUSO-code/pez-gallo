/* ============================================
   app.js — Animations & UI interactions
   Pez Gallo Restaurant
   ============================================ */

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function initSplashScreen() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;

  let dismissed = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    splash.classList.add('splash-exit');
    setTimeout(() => {
      splash.style.display = 'none';
    }, 1000);
  }

  // Auto-dismiss after 2500ms
  setTimeout(dismiss, 2500);

  // Click/touch to dismiss immediately
  splash.addEventListener('click', dismiss);
  splash.addEventListener('touchstart', dismiss);
}

function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    }
  );

  const animatedElements = document.querySelectorAll(
    '.fade-up, .fade-in, .slide-in-left, .slide-in-right, .scale-in'
  );
  animatedElements.forEach(el => observer.observe(el));
}

function initCategoryNav() {
  // Click handler for tabs
  const nav = document.getElementById('category-nav');
  if (!nav) return;

  nav.addEventListener('click', (e) => {
    const tab = e.target.closest('.category-tab');
    if (!tab) return;

    // Update active tab
    nav.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Scroll to section
    const catId = tab.dataset.id;
    const section = document.getElementById(`cat-${catId}`);
    if (section) {
      const y = section.getBoundingClientRect().top + window.pageYOffset - 60;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  });

  // Scroll spy
  const sections = document.querySelectorAll('.menu-section');
  const spyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          const catId = sectionId.replace('cat-', '');
          const tabs = nav.querySelectorAll('.category-tab');
          tabs.forEach(t => {
            t.classList.toggle('active', t.dataset.id === catId);
          });

          // Scroll active tab into view within nav
          const activeTab = nav.querySelector('.category-tab.active');
          if (activeTab) {
            activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }
      });
    },
    {
      threshold: 0.5
    }
  );

  sections.forEach(section => spyObserver.observe(section));
}

function initSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  const debouncedFilter = debounce((value) => {
    if (value.trim() === '') {
      // Show all cards
      document.querySelectorAll('.menu-card').forEach(card => {
        card.style.display = '';
      });
    } else {
      filterMenu(value);
    }
  }, 300);

  searchInput.addEventListener('input', (e) => {
    debouncedFilter(e.target.value);
  });
}

function initParallax() {
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const hero = document.querySelector('.hero');
        if (hero) {
          hero.style.transform = `translateY(${window.scrollY * 0.3}px)`;
        }
        ticking = false;
      });
      ticking = true;
    }
  });
}

// Expose init functions for menu.js to call after rendering
window.appInit = {
  initScrollAnimations,
  initCategoryNav,
  initSearch,
  initParallax
};

// Start splash immediately
document.addEventListener('DOMContentLoaded', () => {
  initSplashScreen();
});
