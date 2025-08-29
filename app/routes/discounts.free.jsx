import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  TextField,
  Select,
  Button,
  Text,
  Modal,
  ResourceList,
  ResourceItem,
  Spinner,
  AppProvider,
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

export default function PriceCampaignForm() {
  const [campaignName, setCampaignName] = useState("");
  const [discountType, setDiscountType] = useState("free");
  const [freeQuantity, setFreeQuantity] = useState("0");
  const [buyQuantity, setBuyQuantity] = useState("0");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [offers, setOffers] = useState([]);

  const discountOptions = [{ label: "Free", value: "free" }];

  const fetchOffers = () => {
    setLoading(true);
      fetch("https://emporium.cardiacambulance.com/api/offer-products") // proxy from your app
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
          setOffers(data || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
  }

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchOffers();
      fetch("https://emporium.cardiacambulance.com/shopify/proxy/sync-products")
        .then((res) => res.json())
        .then((data) => {
          setProducts(data || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [open]);

  const handleToggle = () => setOpen(!open);

  // New submitOffer function that also saves in DB
async function submitOffer(offerData) {
  try {

    setLoading(true);
    // 1️⃣ Call Shopify API
    const shopifyResponse = await fetch(
      "https://emporium.cardiacambulance.com/api/create-offer",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Offer: Buy ${offerData.buy_quantity}`,
          offer_data: [offerData],
        }),
      }
    );

    const shopifyData = await shopifyResponse.json();

    if (!shopifyData || shopifyData.errors || shopifyData.userErrors?.length) {
      alert("Error creating Shopify offer");
      console.error(shopifyData);
      return false;

      setLoading(false);
    }

    // 2️⃣ Call your Laravel DB API to save offer
    const dbResponse = await fetch(
      "https://emporium.cardiacambulance.com/api/product-offers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: offerData.name,
          product_ids: offerData.product_id, // Make sure it matches your DB field
          type: offerData.type || "free",
          buy_quantity: offerData.buy_quantity,
          free_quantity: offerData.free_quantity || null,
          discount_percent: offerData.discount_percent || null,
        }),
      }
    );

    const dbData = await dbResponse.json();

    if (!dbData || dbData.message !== "Offer applied to products") {
      alert("Error saving offer in DB");
      console.error(dbData);
      return false;
    }

    alert("Offer successfully created in Shopify and saved in DB!");
    return true;

  } catch (err) {
    console.error(err);
    alert("Failed to create offer");
    return false;
  }
}

// Handle create offer
const handleCreateOffer = async () => {
  if (selected.length === 0) {
    alert("Please select products to apply discount");
    return;
  }

  const payload = {
    name: campaignName,
    product_id: selected.map((p) => p.id),
    type: "discount",
    buy_quantity: parseInt(buyQuantity) || 1,
    free_quantity: parseInt(freeQuantity) || 0
  };

  const success = await submitOffer(payload);

  if (success) {
    setSelected([]);
    setOpen(false);
  }
};


  return (
    <AppProvider i18n={enTranslations}>
      <Page title="Create Discount Campaign">
      {loading ? (
          <div style={{ padding: "20px", textAlign: "center" }}>
              <Spinner />
            </div>
        ):( 
        <Layout>
          {/* Campaign Name */}
          <Layout.Section>
            <Card sectioned>
              <TextField
                label="Campaign name"
                placeholder="e.g. Buy 2 Get 1 free"
                value={campaignName}
                onChange={setCampaignName}
                helpText="This name helps you identify the campaign internally."
              />
            </Card>
          </Layout.Section>

          {/* Discount */}
          <Layout.Section>
            <Card sectioned>
              <Select
                label="Discount"
                options={discountOptions}
                value={discountType}
                onChange={setDiscountType}
              />
             <TextField
                label="Buy Quantity"
                placeholder="e.g. 2"
                value={buyQuantity}
                onChange={setBuyQuantity}
              />
              <TextField
                label="Free Quantity"
                placeholder="e.g. 1"
                type="number"
                value={freeQuantity}
                onChange={setFreeQuantity}              
              />
            </Card>
          </Layout.Section>

          {/* Products */}
          <Layout.Section>
            <Card sectioned>
              <Text variant="headingMd">Products</Text>
              <Button onClick={handleToggle}>Browse Products</Button>
            </Card>
          </Layout.Section>

          {/* Apply Discount */}
          <Layout.Section>
            <Button primary onClick={handleCreateOffer}>
              Apply Discount
            </Button>
          </Layout.Section>
        </Layout>
        )}

        {/* Modal to select products */}
        <Modal
          open={open}
          onClose={handleToggle}
          title="Select Products"
          primaryAction={{
            content: "Done",
            onAction: handleToggle,
          }}
          large
        >
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <Spinner />
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center" }}>No products found</div>
          ) : (
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={products.map((p) => ({ ...p, id: p.id.toString() }))}
                selectable
                selectedItems={[
                  ...selected.map((p) => p.id.toString()),
                  // Pre-check products that already have offers
                  ...offers.map((o) => o.product_id.toString()),
                ]}
                onSelectionChange={(selectedIds) => {
                  const newSelected = products.filter((p) =>
                    selectedIds.includes(p.id.toString())
                  );

                  // Filter out products that already have offers (cannot deselect)
                  const filteredSelected = newSelected.filter(
                    (p) => !offers.some((o) => o.product_id.toString() === p.id.toString())
                  );

                  setSelected([...filteredSelected, ...offers.map((o) => {
                    const prod = products.find(p => p.id.toString() === o.product_id.toString());
                    return prod;
                  })]);
                }}
                renderItem={(item) => {
                  const { id, title, image_srcs } = item;

                  const existingOffer = offers.find((op) => op.product_id.toString() === id);
                  const isDisabled = !!existingOffer;

                  return (
                    <ResourceItem
                      id={id}
                      accessibilityLabel={`View details for ${title}`}
                      selectable={!isDisabled} // Disable row selection
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "5px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {image_srcs && (
                            <img
                              src={image_srcs}
                              alt={title}
                              style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px" }}
                            />
                          )}
                          <p>{title}</p>
                        </div>

                        {existingOffer && (
                          <div style={{ backgroundColor: "#bf0711", padding: "5px", borderRadius: "5px" }}>
                            <p style={{ color: "white", fontSize: "13px", margin: 0, fontWeight: "bold" }}>
                              Discount already applied
                            </p>
                          </div>
                        )}
                      </div>
                    </ResourceItem>
                  );
                }}
              />

            </div>
          )}
        </Modal>

      </Page>
    </AppProvider>
  );
}
