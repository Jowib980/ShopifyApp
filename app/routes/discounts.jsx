import { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  Button,
  AppProvider,
  BlockStack,
  Text,
  TextContainer, 
  Spinner,  
  ResourceList, 
  ResourceItem
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { Outlet } from "@remix-run/react";

export default function Create() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOffers, setShowOffers] = useState(false);

  const fetchOffers = () => {
    setLoading(true);
      fetch("https://emporium.cardiacambulance.com/shopify/proxy/offer-products") // proxy from your app
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
          setOffers(data || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchOffers();
  },[]);

  return (
    <AppProvider i18n={enTranslations}>
      <Page title="Choose campaign type">
        <Layout>
        {/* Total offers + Show/Hide button */}
          <Layout.Section>
            <Card sectioned>
                <Text variant="headingMd">Total Offers: {Object.keys(offers).length}</Text>
                <Button onClick={() => setShowOffers(!showOffers)}>
                  {showOffers ? "Hide Offers" : "Show Offers"}
                </Button>
            </Card>
          </Layout.Section>

          {/* Loading */}
          {loading && (
            <Layout.Section>
              <Spinner size="large" />
            </Layout.Section>
          )}

          {/* Offers list */}
          {showOffers && !loading && offers.length > 0 && (
            <Layout.Section>
              <div
                style={{
                  display: "grid",
                  gap: "20px",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                }}
              >
                {offers.map((item) => {
                  const { offer, product, id } = item;
                  return (
                    <Card key={id} sectioned title={offer.name} subdued>

                        <Text>
                          <strong>Offer Name:</strong> {offer.name}
                        </Text>

                        {/*<Text>
                          <strong>Type:</strong> {offer.type === "discount" ? "Discount Offer" : "Free Offer"}
                        </Text>*/}
                        {offer.type === "discount" && (
                          <Text>
                            <strong>Buy</strong> {offer.buy_quantity} <strong>get</strong> {offer.discount_percent}% off!
                          </Text>
                        )}
                        {offer.type === "free" && (
                          <Text>
                            <strong>Buy </strong> {offer.buy_quantity} <strong>get</strong> {offer.free_quantity} free!
                          </Text>
                        )}
                        <Text>
                          <strong>Product:</strong> {product?.title || "N/A"}
                        </Text>
                      
                    </Card>
                  );
                })}
              </div>
              
            </Layout.Section>
          )}


          {!loading && showOffers && Object.keys(offers).length === 0 && (
            <Layout.Section>
              <Text>No offers found.</Text>
            </Layout.Section>
          )}

          <Layout.Section>
            <div
              style={{
                display: "grid",
                gap: "20px",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              }}
            >
              {/* Price rule */}
              <Card>
                  <Text variant="headingSm" as="h3">
                    Price rule
                  </Text>
                  <Text>Example: 10% off on shoes</Text>
                  <Button
                    primary
                    onClick={() =>
                      (window.location.href = "/discounts/price")
                    }
                  >
                    Create
                  </Button>
              </Card>

              {/* Minimum quantity/volume */}
              <Card>
                  <Text variant="headingSm" as="h3">
                    Minimum quantity/volume
                  </Text>
                  <Text>Example: Buy 2+, Save 5%</Text>
                  <Button
                    primary
                    onClick={() =>
                      (window.location.href = "/discounts/create/min-quantity")
                    }
                  >
                    Create
                  </Button>
              </Card>

              {/* Minimum value */}
              <Card>
                  <Text variant="headingSm" as="h3">
                    Minimum value
                  </Text>
                  <Text>Example: Spend +$100, Save 5%</Text>
                  <Button
                    primary
                    onClick={() =>
                      (window.location.href = "/discounts/create/min-value")
                    }
                  >
                    Create
                  </Button>
              </Card>
            </div>
          </Layout.Section>
        </Layout>
      </Page>

      <Outlet />
    </AppProvider>
  );
}
