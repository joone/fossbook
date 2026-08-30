const assert = require("assert");
const vm = require("vm");
const PageBase = require("../lib/mod/page_base");

function createPage(language = "en") {
  const page = new PageBase({
    language,
    defaultLanguage: "en",
  });
  page.translations = [
    {
      language: "en",
      languageName: "English",
      path: "/",
      isDefault: true,
    },
    {
      language: "ko",
      languageName: "한국어",
      path: "/ko/",
      isDefault: false,
    },
  ];
  return page;
}

function runPreferenceScript(page, redirectFromDefaultHome, preferredLanguage) {
  const html = page.languagePreference(redirectFromDefaultHome);
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const listeners = {};
  const linkListeners = {};
  const writes = [];
  const redirects = [];
  const link = {
    addEventListener(event, listener) {
      linkListeners[event] = listener;
    },
    getAttribute(name) {
      return name === "hreflang" ? "ko" : null;
    },
  };
  const context = {
    document: {
      addEventListener(event, listener) {
        listeners[event] = listener;
      },
      querySelectorAll() {
        return [link];
      },
    },
    localStorage: {
      getItem() {
        return preferredLanguage;
      },
      setItem(key, value) {
        writes.push([key, value]);
      },
    },
    location: {
      replace(path) {
        redirects.push(path);
      },
    },
  };

  vm.runInNewContext(script, context);
  return { context, listeners, linkListeners, writes, redirects };
}

describe("Language preference", () => {
  it("redirects the default homepage to the remembered language", () => {
    const result = runPreferenceScript(createPage(), true, "ko");

    assert.deepStrictEqual(result.redirects, ["/ko/"]);
  });

  it("stores an explicitly selected language", () => {
    const result = runPreferenceScript(createPage(), true, null);

    result.listeners.DOMContentLoaded();
    result.linkListeners.click();

    assert.deepStrictEqual(result.writes, [["fossbook-language", "ko"]]);
  });

  it("does not redirect article pages or translated homepages", () => {
    const article = runPreferenceScript(createPage(), false, "ko");
    const translatedHome = runPreferenceScript(createPage("ko"), true, "en");

    assert.deepStrictEqual(article.redirects, []);
    assert.deepStrictEqual(translatedHome.redirects, []);
  });

  it("keeps language links usable when storage is unavailable", () => {
    const result = runPreferenceScript(createPage(), true, null);
    result.context.localStorage.setItem = () => {
      throw new Error("Storage unavailable");
    };

    result.listeners.DOMContentLoaded();
    assert.doesNotThrow(() => result.linkListeners.click());
  });

  it("emits no script for a single-language page", () => {
    const page = createPage();
    page.translations = page.translations.slice(0, 1);

    assert.strictEqual(page.languagePreference(true), "");
  });
});