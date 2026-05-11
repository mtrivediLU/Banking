// script.js: Accessible tabs, copy actions, print handling, and reveal motion for the interview reference.

(() => {
  const SELECTORS = {
    tab: "[role='tab'][data-tab]",
    panel: "[role='tabpanel'][data-panel]",
    copyButton: "[data-copy-target]",
    questionItem: ".question-item",
    reveal: ".reveal"
  };

  const tabButtons = [...document.querySelectorAll(SELECTORS.tab)];
  const panels = [...document.querySelectorAll(SELECTORS.panel)];
  const mobileTabs = document.getElementById("mobileTabs");
  const toast = document.getElementById("toast");
  const printButton = document.getElementById("printButton");
  const validTabIds = panels.map((panel) => panel.dataset.panel).filter(Boolean);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let toastTimer;
  let revealObserver;
  let printPanelState = null;

  function getDefaultTabId() {
    return validTabIds[0] || "";
  }

  function getHashTabId() {
    const hash = window.location.hash.replace("#", "");
    return validTabIds.includes(hash) ? hash : "";
  }

  function updateHash(tabId) {
    if (!tabId || window.location.hash.slice(1) === tabId) return;
    history.replaceState(null, "", `#${tabId}`);
  }

  function setToastMessage(message) {
    if (!toast) return;

    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");

    toastTimer = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 1700);
  }

  function normalizeCopyText(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  async function copyText(text, message = "Copied to clipboard") {
    const normalized = normalizeCopyText(text);
    if (!normalized) return;

    try {
      await navigator.clipboard.writeText(normalized);
    } catch (error) {
      fallbackCopy(normalized);
    }

    setToastMessage(message);
  }

  function syncPanels(tabId) {
    panels.forEach((panel) => {
      const isActive = panel.dataset.panel === tabId;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });
  }

  function syncTabs(tabId, moveFocus) {
    tabButtons.forEach((button) => {
      const isActive = button.dataset.tab === tabId;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;

      if (isActive && moveFocus) {
        button.focus();
      }
    });
  }

  function activateTab(tabId, options = {}) {
    const { updateUrl = true, moveFocus = false } = options;
    if (!validTabIds.includes(tabId)) return;

    syncPanels(tabId);
    syncTabs(tabId, moveFocus);

    if (mobileTabs) {
      mobileTabs.value = tabId;
    }

    if (updateUrl) {
      updateHash(tabId);
    }

    revealVisibleElements();
  }

  function handleTabClick(event) {
    activateTab(event.currentTarget.dataset.tab);
  }

  function handleTabKeydown(event) {
    const currentIndex = tabButtons.indexOf(event.currentTarget);
    const lastIndex = tabButtons.length - 1;
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    }

    if (event.key === "ArrowLeft") {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    }

    if (event.key === "Home") {
      nextIndex = 0;
    }

    if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex !== currentIndex) {
      event.preventDefault();
      activateTab(tabButtons[nextIndex].dataset.tab, { moveFocus: true });
    }
  }

  function handleMobileTabChange(event) {
    activateTab(event.target.value);
  }

  function initTabs() {
    tabButtons.forEach((button) => {
      button.addEventListener("click", handleTabClick);
      button.addEventListener("keydown", handleTabKeydown);
    });

    if (mobileTabs) {
      mobileTabs.addEventListener("change", handleMobileTabChange);
    }

    window.addEventListener("hashchange", () => {
      activateTab(getHashTabId() || getDefaultTabId(), { updateUrl: false });
    });

    activateTab(getHashTabId() || getDefaultTabId(), { updateUrl: Boolean(getHashTabId()) });
  }

  function initCopyActions() {
    const copyButtons = [...document.querySelectorAll(SELECTORS.copyButton)];
    const questionItems = [...document.querySelectorAll(SELECTORS.questionItem)];

    copyButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.copyTarget);
        if (!target) return;
        copyText(target.textContent || "");
      });
    });

    questionItems.forEach((question) => {
      question.addEventListener("click", () => {
        copyText(question.textContent || "", "Question copied");
      });
    });
  }

  function markRevealsVisible() {
    document.querySelectorAll(SELECTORS.reveal).forEach((element) => {
      element.classList.add("visible");
    });
  }

  function revealVisibleElements() {
    const reveals = [...document.querySelectorAll(SELECTORS.reveal)];

    if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
      markRevealsVisible();
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.14 }
      );
    }

    reveals.forEach((element) => {
      if (!element.classList.contains("visible")) {
        revealObserver.observe(element);
      }
    });
  }

  function preparePrintPanels() {
    printPanelState = panels.map((panel) => ({
      panel,
      hidden: panel.hidden
    }));

    panels.forEach((panel) => {
      panel.hidden = false;
    });
  }

  function restorePrintPanels() {
    if (!printPanelState) return;

    printPanelState.forEach(({ panel, hidden }) => {
      panel.hidden = hidden;
    });

    printPanelState = null;
  }

  function initPrint() {
    if (printButton) {
      printButton.addEventListener("click", () => window.print());
    }

    window.addEventListener("beforeprint", preparePrintPanels);
    window.addEventListener("afterprint", restorePrintPanels);
  }

  function init() {
    initTabs();
    initCopyActions();
    initPrint();
    revealVisibleElements();

    const handleMotionPreferenceChange = () => {
      if (prefersReducedMotion.matches) {
        markRevealsVisible();
      }
    };

    if (typeof prefersReducedMotion.addEventListener === "function") {
      prefersReducedMotion.addEventListener("change", handleMotionPreferenceChange);
    } else if (typeof prefersReducedMotion.addListener === "function") {
      prefersReducedMotion.addListener(handleMotionPreferenceChange);
    }
  }

  init();
})();
