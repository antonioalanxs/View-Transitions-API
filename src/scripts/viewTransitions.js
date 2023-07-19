document.addEventListener("DOMContentLoaded", () => {
  const titleRegEx = /<title>([\s\S]*)<\/title>/i;
  const scriptRegEx = /<(script|SCRIPT)[\s\S]*?<\/(script|SCRIPT)>/g;
  const bodyRegEx = /<body>([\s\S]*)<\/body>/i;

  function isSupported() {
    return document.startViewTransition;
  }

  function isSameOrigin(url) {
    return location.origin === url.origin;
  }

  async function getHTMLFragment(pathname) {
    const response = await fetch(pathname);
    return await response.text();
  }

  function updateTheDOMSomehow(newTitle, newBody) {
    document.startViewTransition(() => {
      document.title = newTitle;
      document.body.innerHTML = newBody;
    });
  }

  if (isSupported()) {
    window.navigation.addEventListener("navigate", (event) => {
      const destination = new URL(event.destination.url);

      if (!isSameOrigin(destination)) {
        return;
      }

      event.intercept({
        async handler() {
          const html = await getHTMLFragment(destination.pathname);
          const [, newTitle] = html.match(titleRegEx);
          const [, newBody] = html.replace(scriptRegEx, "").match(bodyRegEx);
          updateTheDOMSomehow(newTitle, newBody);
          document.documentElement.scrollTop = 0;
        },
      });
    });
  }
});
