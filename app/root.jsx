import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

import styles from "@shopify/polaris/build/esm/styles.css?url";

export const links = () => [
  { rel: "stylesheet", href: styles },
];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider i18n={enTranslations}>
          <Outlet />
        </AppProvider>

        <ScrollRestoration />
        <Scripts />


        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              const APP_DOMAIN = "https://shopapp.cardiacambulance.com";
              const origFetch = window.fetch;
              const currentOrigin = window.location.origin;

              window.fetch = function(resource, options) {
                try {
                  // Normalize URL
                  let url;
                  if (typeof resource === "string") {
                    url = resource.startsWith("http") ? resource : currentOrigin + resource;
                  } else if (resource && resource.url) {
                    url = resource.url.startsWith("http") ? resource.url : currentOrigin + resource.url;
                  } else if (resource && resource.href) {
                    url = resource.href.startsWith("http") ? resource.href : currentOrigin + resource.href;
                  } else {
                    return origFetch.call(this, resource, options);
                  }

                  // 1️⃣ Handle manifest requests only
                  if (url.includes("/__manifest")) {
                    const parsed = new URL(url, APP_DOMAIN);
                    let p = parsed.searchParams.get("p") || "";

                    parsed.searchParams.set("p", p);

                    return origFetch.call(this, APP_DOMAIN + "/__manifest" + parsed.search, options);
                  }

                  // 2️⃣ All other requests → untouched
                  return origFetch.call(this, resource, options);

                } catch (e) {
                  console.error("🔥 Fetch override error", e, resource);
                  return origFetch.call(this, resource, options);
                }
              };
            })();`,
          }}
        />

      </body>
    </html>
  );
}
