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
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("0");
  const [buyQuantity, setBuyQuantity] = useState("0");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState([]);

  const discountOptions = [{ label: "Percentage", value: "percentage" }];

  useEffect(() => {
    if (open) {
      setLoading(true);
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

  // New submitOffer function
  // async function submitOffer(offerData) {
  //   try {
  //     const response = await fetch("https://emporium.cardiacambulance.com/api/create-offer", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         title: `Offer: Buy ${offerData.buy_quantity}`,
  //         offer_data: [offerData],
  //       }),
  //     });

  //     const data = await response.json();
  //     console.log(data);
  //     if (data) {
  //       alert("Offer successfully created and active at checkout!");
  //       return true;
  //     } else {
  //       alert("Error creating offer");
  //       return false;
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     alert("Failed to create offer");
  //     return false;
  //   }
  // }

  // const handleCreateOffer = async () => {
  //   if (selected.length === 0) {
  //     alert("Please select products to apply discount");
  //     return;
  //   }

  //   const payload = {
  //     name: campaignName,
  //     product_id: selected.map((p) => p.id),
  //     type: "discount",
  //     buy_quantity: parseInt(buyQuantity) || 1,
  //     discount_percent: discountType === "percentage" ? parseInt(discountValue) : null,
  //   };

  //   const success = await submitOffer(payload);
  //   if (success) {
  //     setSelected([]);
  //     setOpen(false);
  //   }
  // };

  // New submitOffer function that also saves in DB
async function submitOffer(offerData) {
  try {
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
          type: offerData.type || "discount",
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
    discount_percent: discountType === "percentage" ? parseInt(discountValue) : null,
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
        <Layout>
          {/* Campaign Name */}
          <Layout.Section>
            <Card sectioned>
              <TextField
                label="Campaign name"
                placeholder="e.g. 20% off"
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
                type="number"
                value={discountValue}
                onChange={setDiscountValue}
                suffix={discountType === "percentage" ? "%" : " "}
              />
              <TextField
                label="Buy Quantity"
                placeholder="e.g. 2"
                value={buyQuantity}
                onChange={setBuyQuantity}
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
                selectedItems={selected.map((p) => p.id.toString())}
                onSelectionChange={(selectedIds) => {
                  const newSelected = products.filter((p) =>
                    selectedIds.includes(p.id.toString())
                  );
                  setSelected(newSelected);
                }}
                renderItem={(item) => {
                  const { id, title, image_srcs } = item;
                  return (
                    <ResourceItem id={id} accessibilityLabel={`View details for ${title}`}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px 0" }}>
                        {image_srcs && (
                          <img
                            src={image_srcs}
                            alt={title}
                            style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px" }}
                          />
                        )}
                        <p>{title}</p>
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
