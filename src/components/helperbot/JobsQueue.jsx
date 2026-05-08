<!DOCTYPE html>
<html lang="en">
 <head>
  <meta charset="utf-8"/>
  <link href="https://media.base44.com/images/public/69eba790f70db4a3aaec2969/090f67b6a_logo.png" rel="icon" type="image/svg+xml"/>
  <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
  <link href="/manifest.json" rel="manifest"/>
  <title>
   src | Lithos (Copy)
  </title>
  <script crossorigin="" src="/assets/index-C8jwDeYl.js" type="module">
  </script>
  <link crossorigin="" href="/assets/index-BfUAWIxV.css" rel="stylesheet"/>
  <script type="module">
   if (window.self === window.top) {
  let lastPath = "";
  function getPageNameFromPath(path) {
    const segments = path.split("/").filter(Boolean);
    return segments[0] || null;
  }
  function trackPageView() {
    const path = window.location.pathname;
    if (path === lastPath) return;
    lastPath = path;
    const pageName = getPageNameFromPath(path) || "home";
    const appId = "69f0a3d06340c5e09e24a356";
    if (!appId) return;
    fetch(`/app-logs/${appId}/log-user-in-app/${pageName}`, {
      method: "POST",
    }).catch(() => {});
  }
  const originalPushState = history.pushState.bind(history);
  history.pushState = function (...args) {
    originalPushState(...args);
    trackPageView();
  };
  const originalReplaceState = history.replaceState.bind(history);
  history.replaceState = function (...args) {
    originalReplaceState(...args);
    trackPageView();
  };
  window.addEventListener("popstate", trackPageView);
  trackPageView();
}
  </script>
  <meta content="A curated digital gallery for high-fidelity architectural artifacts, blending material honesty with seamless acquisition." name="description"/>
  <meta content="src | Lithos (Copy)" property="og:title"/>
  <meta content="A curated digital gallery for high-fidelity architectural artifacts, blending material honesty with seamless acquisition." property="og:description"/>
  <meta content="https://media.base44.com/images/public/69eba790f70db4a3aaec2969/090f67b6a_logo.png/v1/fill/w_1200,h_630/090f67b6a_logo.png" property="og:image"/>
  <meta content="https://lithos-copy-9e24a356.base44.app/src/src/components/helperbot/JobsQueue.jsx" property="og:url"/>
  <meta content="website" property="og:type"/>
  <meta content="Lithos (Copy)" property="og:site_name"/>
  <meta content="src | Lithos (Copy)" name="twitter:title"/>
  <meta content="A curated digital gallery for high-fidelity architectural artifacts, blending material honesty with seamless acquisition." name="twitter:description"/>
  <meta content="https://media.base44.com/images/public/69eba790f70db4a3aaec2969/090f67b6a_logo.png/v1/fill/w_1200,h_630/090f67b6a_logo.png" name="twitter:image"/>
  <meta content="summary_large_image" name="twitter:card"/>
  <meta content="https://lithos-copy-9e24a356.base44.app/src/src/components/helperbot/JobsQueue.jsx" name="twitter:url"/>
  <meta content="yes" name="mobile-web-app-capable"/>
  <meta content="black" name="apple-mobile-web-app-status-bar-style"/>
  <meta content="Lithos (Copy)" name="apple-mobile-web-app-title"/>
  <meta content="noindex, nofollow" name="robots"/>
 </head>
 <body>
  <div id="root">
  </div>
 </body>
</html>
