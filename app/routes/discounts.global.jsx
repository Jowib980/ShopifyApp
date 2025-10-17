import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  Button,
  AppProvider,
  TextField,
  Text,
  Spinner,
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { useNavigate } from "@remix-run/react";
import { PlusIcon, ArrowLeftIcon, DeleteIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import "../assets/css/style.css";
import { Link } from "@remix-run/react";

export default function Create() {
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [discountType, setDiscountType] = useState(""); // percentage, free, or fixed
  const [campaignName, setCampaignName] = useState("");
  const [discounts, setDiscounts] = useState([
    { buyQuantity: "", discountValue: "", selectedProducts: [] },
  ]);
  const navigate = useNavigate();
  const app = useAppBridge();
  const [shop, setShop] = useState("");
  const [pageReady, setPageReady] = useState(false);


   useEffect(() => {
    if (app && app.config && app.config.host) {
      const decoded = atob(app.config.host);

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

      setShop(shopDomain);
    }
  }, [app]);

  const fetchCurrency = () => {
    setLoading(true);
    fetch(`https://emporium.cardiacambulance.com/api/get-currency?shop=${shop}`)
     .then((res) => res.json())
     .then((data) => {
        setCurrency(data.currency || "INR");
        setCurrencySymbol(data.symbol || "Rs.");
        localStorage.setItem("currencydata", JSON.stringify(data));
        setLoading(false);
     })
     .catch(() => setLoading(false));
  };
   
  useEffect(() => {
    if (!shop) return;

    localStorage.removeItem("currencydata");

    if (!localStorage.getItem("currencydata")) {
      fetchCurrency();
    }
  }, [shop]);

  // ✅ Handle discount type selection
  const handleSelectDiscountType = (type) => {
    setDiscountType(type);
  };

  const handleChange = (index, field, value) => {
    const newDiscounts = [...discounts];
    newDiscounts[index][field] = value;
    setDiscounts(newDiscounts);
  };

  const handleCreateOffer = async () => {
    if (!discountType) {
      alert("Please select a discount type first!");
      return;
    }

    if (!campaignName || campaignName.trim() === "") {
      alert("Please enter a campaign name.");
      return;
    }

    // 🔹 Validate each discount row
    for (const discount of discounts) {
     
      if (
        !discount.buyQuantity ||
        isNaN(discount.buyQuantity) ||
        parseInt(discount.buyQuantity) <= 0
      ) {
        alert("Please enter a valid 'Buy Quantity' for discount.");
        return;
      }

      if (
        !discount.discountValue ||
        isNaN(discount.discountValue) ||
        parseInt(discount.discountValue) <= 0
      ) {
        alert("Please enter a valid 'Discount Value' for discount.");
        return;
      }
    }

    setLoading(true);

    // ✅ Prepare payload
    const payload = discounts.map((d) => ({
      shop,
      name: campaignName || "Buy 2 Offer",
      buy_quantity: d.buyQuantity,
      discount_value: d.discountValue,
      type: discountType,
    }));

    try {
      setLoading(true);

      // ✅ Step 1: Get products that do NOT have any offer
      const productsResponse = await fetch(
        `https://emporium.cardiacambulance.com/api/no-offer-products?shop=${shop}`
      );
      const noOfferProducts = await productsResponse.json();

      if (!noOfferProducts || noOfferProducts.length === 0) {
        alert("All products already have offers. Nothing to apply.");
        return;
      }

      // Attach eligible product IDs to payload
      const offerData = payload.map((p) => ({
        ...p,
        product_id: noOfferProducts.map((prod) => prod.id), // add products without offers
      }));

      // ✅ Step 2: Call Shopify API
      const shopifyResponse = await fetch(
        "https://emporium.cardiacambulance.com/api/create-offer",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop: shop,
            offer_data: offerData, // send full array
          }),
        }
      );

      const shopifyData = await shopifyResponse.json();

      if (
        !shopifyData ||
        shopifyData.errors ||
        shopifyData.data?.discountAutomaticAppCreate?.userErrors?.length
      ) {
        console.error("❌ Shopify API Error:", shopifyData);
        alert("Error creating Shopify offer");
        return false;
      }

      // ✅ Step 3: Save offer to your Laravel DB
      const dbResponse = await fetch(
        "https://emporium.cardiacambulance.com/api/global-offer",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop: shop,
            offer_data: offerData,
          }),
        }
      );

      const dbData = await dbResponse.json();

      if (!dbResponse.ok || dbData.message !== "Offer applied to products") {
        console.error("❌ DB API Error:", dbData);
        alert("Error saving offer in DB");
        return false;
      }

      alert("✅ Global offer applied successfully!");
      return true;
    } catch (err) {
      console.error("Fetch Error:", err);
      alert("❌ Failed to create offer (network/CORS issue)");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/app");
  }

  const handleAddDiscount = () => {
    setDiscounts([
      ...discounts,
      { buyQuantity: "", discountValue: "" } // new empty discount row
    ]);
  };

  const handleRemoveDiscount = (index) => {
    const updated = discounts.filter((_, i) => i !== index);
    setDiscounts(updated);
  };


  return (
    <AppProvider i18n={enTranslations}>
      <Page title="Create Universal Discount">
        {loading && (
          <div className="loader-overlay">
            <Spinner accessibilityLabel="Loading..." size="large" />
          </div>
        )}
        <Layout>
          <Layout.Section>
            <div style={{marginBottom: "10px"}}>
              <Button icon={ArrowLeftIcon} onClick={handleBack}>Back</Button>
            </div>
          </Layout.Section>
        </Layout>
        {/* ===================== Discount Type Selection ===================== */}
          <Layout>
            <Layout.Section>
              <Card>
                <div
                  style={{
                    display: "grid",
                    gap: "16px",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  }}
                >
                  {/* Percentage Discount */}
                  <Card sectioned>
                    <div className="space">
                      <Text variant="headingSm" as="h3">
                        Percentage Based Discount
                      </Text>
                    </div>
                    <div className="space">
                      <Text>Example: Buy 2 Get 10% off</Text>
                    </div>
                    <div className="space">
                      <Button
                        primary={discountType === "discount"}
                        onClick={() => handleSelectDiscountType("discount")}
                      >
                        {discountType === "discount" ? "Selected" : "Create"}
                      </Button>
                    </div>
                  </Card>

                  {/* Free Product */}
                  <Card sectioned>
                    <div className="space">
                      <Text variant="headingSm" as="h3">
                        Free Product Discount
                      </Text>
                    </div>
                    <div className="space">
                      <Text>Example: Buy 2 Get 1 Free</Text>
                    </div>
                    <div className="space">
                      <Button
                        primary={discountType === "free"}
                        onClick={() => handleSelectDiscountType("free")}
                      >
                        {discountType === "free" ? "Selected" : "Create"}
                      </Button>
                    </div>
                  </Card>

                  {/* Fixed Amount Off */}
                  <Card sectioned>
                    <div className="space">
                      <Text variant="headingSm" as="h3">
                        Amount Based Discount
                      </Text>
                    </div>
                    <div className="space">
                      <Text>Example: Buy 2 Get 100{currencySymbol} off</Text>
                    </div>
                    <div className="space">
                      <Button
                        primary={discountType === "amount"}
                        onClick={() => handleSelectDiscountType("amount")}
                      >
                        {discountType === "amount" ? "Selected" : "Create"}
                      </Button>
                    </div>
                  </Card>
                </div>
              </Card>
            </Layout.Section>
          </Layout>
          {/* ===================== Discount Form Section ===================== */}
          {discountType && (
            <div className="table-section">
              <Layout>
                <Layout.Section>
                  <Card sectioned>
                    <Text variant="headingMd" as="h2">
                      {discountType === "discount" && "Percentage Discount Setup"}
                      {discountType === "free" && "Free Product Offer Setup"}
                      {discountType === "amount" && "Fixed Amount Discount Setup"}
                    </Text>

                    <TextField
                      label="Campaign Name"
                      placeholder="e.g. Buy 2 Get 10% Off"
                      value={campaignName}
                      onChange={setCampaignName}
                      helpText="Used to identify your campaign internally."
                    />
                    {discounts.map((discount, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          gap: "12px",
                          alignItems: "center",
                          marginTop: "12px",
                        }}
                      >
                        <TextField
                          label="Buy Quantity"
                          type="number"
                          value={discount.buyQuantity}
                          onChange={(value) => handleChange(index, "buyQuantity", value)}
                        />

                        {discountType === "discount" && (
                          <TextField
                            label="Discount (%)"
                            type="number"
                            value={discount.discountValue}
                            onChange={(value) => handleChange(index, "discountValue", value)}
                          />
                        )}
                        {discountType === "amount" && (
                          <TextField
                            label={`Amount Off (${currencySymbol})`}
                            type="number"
                            value={discount.discountValue}
                            onChange={(value) => handleChange(index, "discountValue", value)}
                          />
                        )}
                        {discountType === "free" && (
                          <TextField
                            label="Free Quantity"
                            type="number"
                            value={discount.discountValue}
                            onChange={(value) => handleChange(index, "discountValue", value)}
                          />
                        )}
                        {/* Remove Button */}
                        {discounts.length > 1 && (
                          <Button
                            tone="critical"
                            onClick={() => handleRemoveDiscount(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    {/* Add More Button */}
                    <div style={{ marginTop: "12px" }}>
                      <Button icon={PlusIcon} onClick={handleAddDiscount}>Add More</Button>
                    </div>
                    <div style={{ marginTop: "24px", display: "flex" }}>
                      <div className="">
                        <Button
                         onClick={handleCreateOffer}
                         tone="success"
                         variant="primary"
                         primary
                        >
                          Apply Offer
                        </Button>
                      </div>
                      <div style={{ marginLeft: "10px" }}>
                        <Button
                          onClick={() => setDiscountType("")}
                          tone="critical"
                          variant="primary"
                          primary
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Layout.Section>
              </Layout>
            </div>
          )}
      </Page>
    </AppProvider>
  );
}
