const tabButtons = [...document.querySelectorAll("[role='tab'][data-tab]")];
const tabTriggers = [...document.querySelectorAll("[data-tab]")];
const panels = [...document.querySelectorAll("[data-panel]")];
const mobileTabs = document.getElementById("mobileTabs");
const validTabIds = panels.map((panel) => panel.dataset.panel);
const toast = document.getElementById("toast");
const printButton = document.getElementById("printButton");

function showToast(message = "Copied") {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1600);
}

async function copyText(text) {
  const normalized = text.replace(/\s+/g, " ").trim();

  try {
    await navigator.clipboard.writeText(normalized);
    showToast("Copied");
  } catch (error) {
    const textarea = document.createElement("textarea");
    textarea.value = normalized;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    showToast("Copied");
  }
}

function activateTab(tabId, options = {}) {
  const { updateHash = true, moveFocus = false } = options;
  if (!validTabIds.includes(tabId)) return;

  panels.forEach((panel) => {
    const isActive = panel.dataset.panel === tabId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === tabId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;

    if (isActive && moveFocus) {
      button.focus();
    }
  });

  if (mobileTabs) {
    mobileTabs.value = tabId;
  }

  if (updateHash && window.location.hash.slice(1) !== tabId) {
    history.replaceState(null, "", `#${tabId}`);
  }

  revealVisibleElements();
}

function handleTabClick(event) {
  const tabId = event.currentTarget.dataset.tab;
  activateTab(tabId);
}

tabTriggers.forEach((trigger) => {
  trigger.addEventListener("click", handleTabClick);
});

tabButtons.forEach((button, index) => {
  button.addEventListener("keydown", (event) => {
    const lastIndex = tabButtons.length - 1;
    let nextIndex = index;

    if (event.key === "ArrowRight") nextIndex = index === lastIndex ? 0 : index + 1;
    if (event.key === "ArrowLeft") nextIndex = index === 0 ? lastIndex : index - 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = lastIndex;

    if (nextIndex !== index) {
      event.preventDefault();
      activateTab(tabButtons[nextIndex].dataset.tab, { moveFocus: true });
    }
  });
});

if (mobileTabs) {
  mobileTabs.addEventListener("change", (event) => {
    activateTab(event.target.value);
  });
}

function initTabFromHash() {
  const hashTab = window.location.hash.replace("#", "");
  const initialTab = validTabIds.includes(hashTab) ? hashTab : validTabIds[0];
  activateTab(initialTab, { updateHash: Boolean(hashTab) });
}

window.addEventListener("hashchange", initTabFromHash);

const copyButtons = [...document.querySelectorAll("[data-copy-target]")];
copyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;
    copyText(target.textContent || "");
  });
});

const questionItems = [...document.querySelectorAll(".question-item")];
questionItems.forEach((question) => {
  question.addEventListener("click", () => {
    copyText(question.textContent || "");
  });
});

if (printButton) {
  printButton.addEventListener("click", () => window.print());
}

let revealObserver;

function revealVisibleElements() {
  const reveals = [...document.querySelectorAll(".reveal")];

  if (!("IntersectionObserver" in window)) {
    reveals.forEach((element) => element.classList.add("visible"));
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
  }

  reveals.forEach((element) => {
    if (!element.classList.contains("visible")) {
      revealObserver.observe(element);
    }
  });
}

initTabFromHash();
revealVisibleElements();