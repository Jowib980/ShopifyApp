import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import { useState } from 'react';

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();
  const [discountsOpen, setDiscountsOpen] = useState(false);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      {/* Shopify Admin sidebar navigation */}
      <NavMenu>
        <Link to="/app" rel="home">Dashboard</Link>
        <Link to="/app/discounts" target="_top">Discounts</Link>
        <Link to="/app/offer-badge-setting" target="_top">Offer Settings</Link>
        <Link to="/app/additional" target="_top">Additional Page</Link>
      </NavMenu>

      {/* Page content */}
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
