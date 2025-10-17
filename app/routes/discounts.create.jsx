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
  DataTable,
  ButtonGroup,
  ResourceList, 
  ResourceItem
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { Outlet } from "@remix-run/react";
import { useNavigate } from "@remix-run/react";
import "../assets/css/style.css";
import {PlusIcon, ArrowLeftIcon} from '@shopify/polaris-icons';
import PercentForm from './discounts.percent.jsx';
import FreeForm from './discounts.free.jsx';
import FixedAmountForm from './discounts.price.jsx';
import { useAppBridge } from '@shopify/app-bridge-react';

export function links() {
  return [{ rel: "stylesheet", href: "../assets/css/style.css" }];
}


export default function Create() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showPercentForm, setShowPercentfrom] = useState(false);
  const [showFreeForm, setShowFreeForm] = useState(false);
  const [showFixedAmountForm, setShowFixedAmountForm] = useState(false);
  const [currency, setCurrency] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("");

  const app = useAppBridge();
  const [shop, setShop] = useState("");

  useEffect(() => {
    if (app && app.config && app.config.host) {
      const decoded = atob(app.config.host); // e.g. "admin.shopify.com/store/userportal"
      console.log("Decoded host:", decoded);

      let shopDomain = "";

      // Detect if this is a modern Shopify admin path
      if (decoded.includes("admin.shopify.com/store/")) {
        // Extract "userportal" part and append ".myshopify.com"
        const storeHandle = decoded.split("/store/")[1]?.split("/")[0];
        shopDomain = `${storeHandle}.myshopify.com`;
      } else {
        // Fallback for older format
        shopDomain = decoded.split("/")[0];
      }

      console.log("✅ Shop domain:", shopDomain);
      setShop(shopDomain);
    }
  }, [app]);


  useEffect(() => {
    if (!shop) return; // wait until shop is decoded

    localStorage.removeItem("offers");
    localStorage.removeItem("currencydata");

    if (!localStorage.getItem("offers")) {
      fetchOffers();
    }
    if (!localStorage.getItem("currencydata")) {
      fetchCurrency();
    }
  }, [shop]);



   const fetchCurrency = () => {
    setLoading(true);
    fetch(`https://emporium.cardiacambulance.com/api/get-currency?shop=${shop}`)
     .then((res) => res.json())
     .then((data) => {
      console.log("currencydata", data);
        setCurrency(data.currency || "INR");
        setCurrencySymbol(data.symbol || "Rs.");
        localStorage.setItem("currencydata", JSON.stringify(data));
        setLoading(false);
     })
     .catch(() => setLoading(false));
  };


  const fetchOffers = () => {
    setLoading(true);
    fetch(`https://emporium.cardiacambulance.com/api/offer-products?shop=${shop}`)
      .then((res) => res.json())
      .then((data) => {
        setOffers(data || []);
        localStorage.setItem('offers', JSON.stringify(data));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };


  const handlePercent = () => {
    setShowPercentfrom(true);
    setShowFreeForm(false);
    setShowFixedAmountForm(false);
  }

  const handleFree = () => {
    setShowPercentfrom(false);
    setShowFreeForm(true);
    setShowFixedAmountForm(false);
  }

  const handleFixedAmount = () => {
    setShowPercentfrom(false);
    setShowFreeForm(false);
    setShowFixedAmountForm(true);
  }


  const handleBack = () => {
    navigate("/app");
  }


return (
    <AppProvider i18n={enTranslations}>
      <Page title="Create Specific Product Discount">
        {loading && (      
          <div className="loader-overlay">
            <span className="loader"></span>
          </div>
        )}


        <Layout>
          <Layout.Section>
            <div style={{marginBottom: "10px"}}>
              <Button icon={ArrowLeftIcon} onClick={handleBack}>Back</Button>
            </div>
          </Layout.Section>
        </Layout>

        
        <Layout>
          <Layout.Section>
            <Card>
              <div
                style={{
                  display: "grid",
                  gap: "10px",
                  gridTemplateColumns: "repeat(3, minmax(300px, 1fr))",
                }}
              >
                {/* Percent offer */}
                <Card>
                  <div className="space">
                    <Text variant="headingSm" as="h3">
                      Percentage Based Discount
                    </Text>
                  </div>
                  <div className="space">
                    <Text>Example: Buy 2 Get 10% off!</Text>
                  </div>
                  <div className="space">
                    <Button
                      primary
                      onClick={handlePercent}
                    >
                      Create
                    </Button>
                  </div>
                </Card>
                      
                {/* Free offer */}
                <Card>
                  <div className="space">
                    <Text variant="headingSm" as="h3">
                      Free Product Discount
                    </Text>
                  </div>
                  <div className="space">
                    <Text>Example: Buy 2 Get 1 free!</Text>
                  </div>
                  <div className="space">
                    <Button
                      primary
                      onClick={handleFree}
                    >
                      Create
                    </Button>
                  </div>
                </Card>
                      
                {/* Fixed amount offer */}
                <Card>
                  <div className="space">
                    <Text variant="headingSm" as="h3">
                     Amount Based Discount
                    </Text>
                  </div>
                  <div className="space">
                    <Text>Example: Buy 2 Get 10{currencySymbol} off!</Text>
                  </div>
                  <div className="space">
                    <Button
                      primary
                      onClick={handleFixedAmount}
                    >
                      Create
                    </Button>
                  </div>
                </Card>
                    
              </div>
            </Card>
          </Layout.Section>

        <Layout.Section>
          {showPercentForm && (
            <PercentForm />
          )}

          {showFreeForm && (
            <FreeForm />
          )}

          {showFixedAmountForm && (
            <FixedAmountForm />
          )}

        </Layout.Section>


          <Outlet />
        
        </Layout>
      </Page>

    </AppProvider>

  );
}
