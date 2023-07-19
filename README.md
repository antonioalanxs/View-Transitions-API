# Experiments with Astro and the View Transitions API

A dive into the View Transitions API: Explore its workflow, animations, room for improvements, advantages for both SPAs and MPAs and learn how to use the API on a Multi-Page Application (MPA).

## Table of Contents

- [Preview](#preview)
- [Article](#article)
  - [Introduction](#introduction)
  - [A fake SPA](#a-fake-spa)
  - [Animations](#animations)
    - [How roughly works](#how-roughly-works)
    - [Entire HTML Document](#entire-html-document)
    - [Different elements](#different-elements)
  - [Issues and Possible Improvements](#issues-and-possible-improvements)
    - [Latency](#latency)
    - [Race Conditions](#race-conditions)
  - [MPA vs SPA](#mpa-vs-spa)
  - [Conclusion](#conclusion)
  - [TL;DR](#tldr)
- [License](#license)

## Preview

<!-- demonstration -->

Check if your browser supports View Transitions API by [clicking here](https://caniuse.com/?search=View%20Transitions%20API). If not, you can enable the flag `chrome://flags/#document-transition` before taking the demonstration for a spin.

<!-- link -->

[Go to the article](#article).

## Article

### Introduction

Around three months ago, the Google Chrome team made an exciting announcement about a new API designed to deliver smooth and seamless transitions on the web: [View Transitions API](https://developer.chrome.com/docs/web-platform/view-transitions/). If you have not already, I highly recommend watching [Jake Archibald's presentation at Google I/O](https://www.youtube.com/watch?v=JCJUPJ_zDQ4&t=682s&ab_channel=GoogleChromeDevelopers) as it's quite thrilling.

There are several appealing aspects of this API: its straightforward interface, remarkable flexibility, and the ability to fully customize transitions using CSS animations. However, it currently has one limitation – it only works with Single-Page Applications (SPAs). [The support for Multi-Page Applications (MPAs) is on their roadmap](https://github.com/WICG/view-transitions/blob/main/explainer.md#future-work), but **it is not available at the moment**.

While waiting for MPA support is a valid option, if you are anything like me and can not wait to try it out on your server-side rendered applications, this repository explores how we can make that happen.

[Go to TLDR](#tldr).

### A fake SPA

We have a starting point – a server-side rendered MPA created using [Astro](https://astro.build/), consisting of two pages. Each time we navigate from one page to another, a completely new page is generated on the server, and the browser performs a full page load to display it.

However, as mentioned earlier, the View Transitions API currently only supports SPAs. To make it work with our MPA, we need to grant it two super-powers typically reserved for client-side rendered applications:

1. A way to intercept navigation requests, and
2. A way to update a piece of the DOM with the markup from the next page.

For handling **#1** we have access to [Navigation API](https://developer.chrome.com/docs/web-platform/navigation-api/) for intercepting navigation requests.

```JavaScript
const titleRegEx = /<title>([\s\S]*)<\/title>/i;
const scriptRegEx = /<(script|SCRIPT)[\s\S]*?<\/(script|SCRIPT)>/g;
const bodyRegEx = /<body>([\s\S]*)<\/body>/i;

function isSameOrigin(url) {
    return location.origin === url.origin;
}

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
```

The `getHTMLFragment` and `updateTheDOMSomehow` functions in the example above are what we need to implement to support **#2** in our SPA wishlist. As you might have guessed from their names, these functions are going to fetch a fragment of HTML from a server somewhere, and then update a piece of the DOM with the new data.

```JavaScript
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
```

The workflow will be as follows:

1. For the initial request, nothing changes. The server renders the page as usual, and it is displayed on the browser just like a traditional MPA request.

2. When a user initiates a navigation request, such as clicking on a link, the Navigation API steps in and decides whether to handle the request on the client-side or let it go through to the server.

3. If the decision is to handle it on the client-side, we proceed by making a `fetch` request to the server to retrieve a pre-rendered fragment of the requested page. The server responds with a portion of HTML.

4. Finally, we take that HTML fragment and use it to update the DOM of the current page. From this point onward, all subsequent navigations are handled in the same way.

### Animations

Now that we have what could be called a SPA at our disposal, we can proceed with the implementation of animations using the View Transitions API.

#### How roughly works

1. When we invoke the `document.startViewTransition()`, Chrome captures a screenshot of the current page's state before any updates are made. This screenshot is placed on top of the page, allowing us to modify the DOM underneath while preserving the original UI appearance.

2. Once the DOM is updated with the new HTML fragment, Chrome takes another screenshot, reflecting the state of the page after the updates. The transition animation occurs between these two screenshots, with one animating in and the other animating out.

3. After the animation completes, both screenshots disappear, revealing the actual updated DOM once again.

#### Entire HTML Document

By default, the API animates the entire HTML document. We will get fade-in/fade-out animation, which looks something like this:

<p align="center">
    <img src="README-files/Transitions-1.gif" alt="Default fade in/out animation using the View Transitions API.">
</p>

The API gives a `transition-tag-name` of `root` to the HTML document, which we can target via CSS to customize the animation. `::page-transition-outgoing-image` and `::page-transition-incoming-image` pseudo-elements target the screenshot taken before and after the DOM updates, respectively.

#### Different elements

Moreover, we can give certain elements a **different transition tag name**. By giving an element its own transition tag name, Chrome will **cut a separate screenshot** for it so that it can be transitioned with a different animation than the rest of the page.

In our case, we will give them to the title and book images.

```JavaScript
// Title.astro

---
const { isSmall = false } = Astro.props;

let classes = "block max-w-sm mx-auto my-0 hover:scale-105 transition-transform";

if (isSmall) {
    classes += " scale-85 hover:scale-90";
}
---

<a href="/" class={classes}>
    <img
        src="/title.svg"
        alt="Recommended Books"
        class="w-full h-full object-cover"
        style="view-transition-name: title"
    />
</a>
```

```JavaScript
// BookImage.astro

---
const { id, title, img } = Astro.props;
---

<img
    src={img}
    alt={`Cover image for ${title}`}
    class="aspect-book w-full h-full object-cover rounded"
    style={`view-transition-name: book-${id}`}
/>
```

And here is the result:

<p align="center">
    <img src="README-files/Transitions-2.gif" alt="Final transition, with different elements on the page transitioning independently.">
</p>

### Issues and Possible Improvements

#### Latency

The primary problem is the lack of handling latency when requesting fragments of HTML. While prefetching and caching assets can help to some extent, a more general solution is needed.

One approach is to update the UI immediately with a placeholder that resembles the page being loaded. Once the actual data arrives, the placeholder can be replaced with the real content. However, this adds complexity, as each page would require placeholders for other pages it could transition to.

Automating the generation of placeholders might be a possible solution but is not straightforward.

#### Race Conditions

Navigating through multiple pages quickly may lead to situations where the current URL does not match the displayed page. This occurs due to a conflict between instant URL updates and the time required for transition animations to resolve.

To address this, the Navigation API offers an `AbortSignal` mechanism to cancel redundant navigation requests when the user clicks on different links rapidly. Additionally, the API provides a `transition.abandon()` method to jump directly to the final stage of transitions, which can help in scenarios where users spam the back button.

Despite these solutions, it is challenging to handle all possible race conditions that users might encounter, and improvements in future API versions are hoped for.

### MPA vs SPA

You might be wondering why we went through the effort of transforming an Astro MPA into a (somewhat) SPA just to utilize the View Transitions API. Would not it have been simpler to start with an SPA from the beginning?

That's a valid question, but there are some crucial distinctions between our approach and a traditional SPA:

- Rendering occurs entirely on the server (or during build time for Static Site Generation), rather than on the client-side. As a result, the client doesn't need to manage any state, handle events, use Virtual DOMs, or deal with other complexities commonly found in UI frameworks.

- Client-side routing and animations are handled directly by the browser's API, eliminating the need to send a JavaScript library or framework to the client for this purpose. Furthermore, unlike traditional SPA routers, implementing route changes using the Navigation API doesn't require wrapping the entire application in it.

### Conclusion

The View Transitions API brings significant advantages to both SPAs and MPAs alike.

For SPAs, this API offers a more efficient way to handle page transitions by reducing the amount of JavaScript sent to client devices. Instead of relying on bulky third-party libraries, SPAs can now utilize the browser's built-in capabilities, resulting in improved performance.

As for MPAs, the future support of this API will enable them to achieve something currently not possible: seamless transitioning between server-side rendered pages without the need for any JavaScript involvement.

We have introduced the fundamental aspects of the API. Although, if you desire more extensive customization options I recommend you reading [the article on the Chrome Developers' blog](https://developer.chrome.com/docs/web-platform/view-transitions/). If you come across any insights or suggestions, do not hesitate to [share your feedback with the Chrome team](https://github.com/WICG/view-transitions). By doing so, we can all contribute to its improvement, benefiting the entire web development community in the long run.

❤️ Thank you for reading.

<h3 id="tldr">TL;DR</h3>

The article introduces the [View Transitions API](https://developer.chrome.com/docs/web-platform/view-transitions/), enabling smooth web page transitions. It currently only supports SPAs, but the article demonstrates how to adapt MPAs into pseudo-SPAs to utilize the API. It covers the workflow and animations of the API, along with addressing issues like latency and race conditions. The advantages include efficient handling of page transitions for SPAs by reducing JavaScript usage and improved performance. Additionally, the future support for MPAs will enable seamless transitioning between server-side rendered pages without JavaScript involvement.

<!-- Books Recommendation MPA link -->

The author has also created a simply Books Recommendation MPA for live demonstration of the API features. [Go to preview](#preview).

## License

Licensed under the [GNU General Public License v3.0](./LICENSE).
