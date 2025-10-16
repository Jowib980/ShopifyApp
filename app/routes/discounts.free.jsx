import { useState, useEffect, useMemo } from "react";
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
import {PlusIcon, DeleteIcon} from '@shopify/polaris-icons';
import { useAppBridge } from '@shopify/app-bridge-react';

export default function FreeForm() {
  const [campaignName, setCampaignName] = useState("");
  const [discountType, setDiscountType] = useState("free");
  const [freeQuantity, setFreeQuantity] = useState("0");
  const [buyQuantity, setBuyQuantity] = useState("0");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [offers, setOffers] = useState([]);
  const [discounts, setDiscounts] = useState([
    { buyQuantity: "", freeQuantity: "", selectedProducts: [] },
  ]);
  const [activeDiscountIndex, setActiveDiscountIndex] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Locked products (already have offers)
  const lockedIds = useMemo(
    () => new Set(offers.map((o) => String(o.product_id))),
    [offers]
  );

  const discountOptions = [{ label: "Free", value: "free" }];


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

  const fetchOffers = () => {
    setLoading(true);
    fetch(`https://emporium.cardiacambulance.com/api/offer-products?shop=${shop}`, {
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("offers", data);
        setOffers(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      setModalLoading(true);
      fetchOffers();
      fetch(`https://emporium.cardiacambulance.com/api/sync-products?shop=${shop}`, {
        credentials: "include"
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("products", data);
          setProducts(data || []);
          setModalLoading(false);
        })
        .catch(() => setModalLoading(false));
    }
  }, [open]);

// const handleToggle = () => setOpen(!open);

  // async function submitOffer(offerData) {
  //   try {
  //     setLoading(true);

  //     // 1️⃣ Shopify API
  //     const shopifyResponse = await fetch(
  //       "https://emporium.cardiacambulance.com/api/create-offer",
  //       {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({
  //           title: `Offer: Buy ${offerData.buy_quantity} Get ${offerData.free_quantity} Free`,
  //           offer_data: [offerData],
  //         }),
  //       }
  //     );

  //     const shopifyData = await shopifyResponse.json();

  //     if (
  //       !shopifyData ||
  //       shopifyData.errors ||
  //       shopifyData.userErrors?.length
  //     ) {
  //       alert("Error creating Shopify offer");
  //       console.error(shopifyData);
  //       return false;
  //     }

  //     // 2️⃣ Laravel DB API
  //     const dbResponse = await fetch(
  //       "https://emporium.cardiacambulance.com/api/product-offers",
  //       {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({
  //           name: offerData.name,
  //           product_ids: offerData.product_id,
  //           type: "free",
  //           buy_quantity: offerData.buy_quantity,
  //           free_quantity: offerData.free_quantity,
  //           discount_percent: null,
  //         }),
  //       }
  //     );

  //     const dbData = await dbResponse.json();

  //     if (!dbData || dbData.message !== "Offer applied to products") {
  //       alert("Error saving offer in DB");
  //       console.error(dbData);
  //       return false;
  //     }

  //     alert("Offer successfully created in Shopify and saved in DB!");
  //     return true;
  //   } catch (err) {
  //     console.error(err);
  //     alert("Failed to create offer");
  //     return false;
  //   } finally {
  //     setLoading(false);
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
  //     type: "free",
  //     buy_quantity: parseInt(buyQuantity) || 1,
  //     free_quantity: parseInt(freeQuantity) || 0,
  //   };

  //   const success = await submitOffer(payload);

  //   if (success) {
  //     setSelected([]);
  //     setOpen(false);
  //   }
  // };



const handleCreateOffer = async () => {
  for (const discount of discounts) {
    if (!discount.selectedProducts || discount.selectedProducts.length === 0) {
      alert("Please select products for all discount rows");
      return;
    }
  }

  try {
    setLoading(true);

    // Build payload with all discounts
    const offerData = discounts.map((discount) => ({
      name: campaignName || "Buy 2",
      product_id: discount.selectedProducts.map((p) => p.id),
      buy_quantity: parseInt(discount.buyQuantity),
      free_quantity: parseInt(discount.freeQuantity),
      type: "discount",
    }));

    console.log("offer data", offerData);

    const success = await submitOfferMultiple(offerData);
    if (!success) {
      alert("Failed to create discounts.");
      return;
    }

    // Clear localStorage
    discounts.forEach((_, i) => localStorage.removeItem(`discount-${i}-products`));

    // Reset form
    setDiscounts([{ buyQuantity: "", freeQuantity: "", selectedProducts: [] }]);
    setSelected([]);
    setOpen(false);
    fetchOffers();
    alert("All discounts applied successfully!");
  } catch (err) {
    console.error(err);
    alert("Error applying discounts");
  } finally {
    setLoading(false);
  }
};

async function submitOfferMultiple(offerData) {
  try {
    setLoading(true);

    console.log("offer2", offerData);

    // ✅ Shopify API call
    const shopifyResponse = await fetch(
      "https://emporium.cardiacambulance.com/api/create-offer",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Offer: ${offerData[0]?.name || "Buy 2"}`,
          offer_data: offerData, // Send full array
        }),
      }
    );

    const shopifyData = await shopifyResponse.json();
    console.log("shopify data", shopifyData);

    if (
      !shopifyData ||
      shopifyData.errors ||
      shopifyData.data?.discountAutomaticAppCreate?.userErrors?.length
    ) {
      console.error("Shopify API Error:", shopifyData);
      // alert("Error creating Shopify offer");
      // return false;
    }

    // ✅ Laravel DB API call
    const dbResponse = await fetch(
      "https://emporium.cardiacambulance.com/api/product-offers",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: shop,
          offer_data: offerData, // <-- correctly send array
        }),
      }
    );

    console.log("offerrrr", offerData);

    const dbData = await dbResponse.json();
    console.log("db data", dbData);

    if (!dbResponse.ok || dbData.message !== "Offer applied to products") {
      console.error("DB API Error:", dbData);
      alert("Error saving offer in DB");
      return false;
    }

    return true;
  } catch (err) {
    console.error("Fetch Error:", err);
    alert("Failed to create offer (network/CORS issue)");
    return false;
  } finally {
    setLoading(false);
  }
}

  const handleToggle = (index = null) => {
    // Only set active index if a valid number is passed
    if (index !== null && discounts[index]) {
      setActiveDiscountIndex(index);

      // Load saved products from localStorage if any
      const saved = localStorage.getItem(`discount-${index}-products`);
      if (saved) {
        const newDiscounts = [...discounts];
        newDiscounts[index] = {
          ...newDiscounts[index],
          selectedProducts: JSON.parse(saved),
        };
        setDiscounts(newDiscounts);
      }
    }

    setOpen(!open);
  };


  const handleChange = (index, field, value) => {
    const newDiscounts = [...discounts];
    newDiscounts[index][field] = value;
    setDiscounts(newDiscounts);
  };

  const handleAdd = () => {
    setDiscounts([
      ...discounts,
      { buyQuantity: "", freeQuantity: "", selectedProducts: [] }, // ✅ initialize
    ]);
  };


  const handleRemove = (index) => {
    const newDiscounts = discounts.filter((_, i) => i !== index);
    setDiscounts(newDiscounts);
  };

  const getSelectableProducts = () => {
    const selectedInOtherDiscounts = discounts
      .filter((_, i) => i !== activeDiscountIndex)
      .flatMap((d, i) => {
        const saved = localStorage.getItem(`discount-${i}-products`);
        return saved ? JSON.parse(saved).map(p => p.id) : [];
      });

    return products.filter((p) => !selectedInOtherDiscounts.includes(p.id));
  };


  return (
    <AppProvider i18n={enTranslations}>
      <Page title="Create Free Offer Campaign">
        {loading ? (
          <div className="loader-overlay">
            <span className="loader"></span>
          </div>
        ) : (
          <Layout>
            {/* Campaign Name */}
            <Layout.Section>
              <Card sectioned>
                <TextField
                  label="Campaign name"
                  placeholder="e.g. Buy 2 Get 1 Free"
                  value={campaignName}
                  onChange={setCampaignName}
                  helpText="This name helps you identify the campaign internally."
                />
              </Card>
            </Layout.Section>

            {/* Offer Config */}
            {/*<Layout.Section>
              <div
               class="discount-section"
               >
                <TextField
                  label="Buy Quantity"
                  placeholder="e.g. 2"
                  type="number"
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
              </div>
            </Layout.Section>

            
            <Layout.Section>
              <Card sectioned>
                <Text variant="headingMd">Products</Text>
                <Button onClick={handleToggle}>Browse Products</Button>
              </Card>
            </Layout.Section>*/}

             <Layout.Section>
            {discounts.map((discount, index) => (
              <div key={index} className="discount-section" style={{ marginBottom: 16 }}>
                <TextField
                  label="Buy Quantity"
                  placeholder="e.g. 2"
                  type="number"
                  value={discount.buyQuantity}
                  onChange={(value) => handleChange(index, "buyQuantity", value)}
                  style={{ marginRight: 8 }}
                />
                <TextField
                  label="Free Quantity"
                  type="number"
                  value={discount.freeQuantity}
                  onChange={(value) => handleChange(index, "freeQuantity", value)}
                  style={{ marginRight: 8 }}
                />
                {/*<Button onClick={() => setActiveDiscountIndex(index)}>Browse Products</Button>*/}

                <Button onClick={() => handleToggle(index)}>Browse Products</Button>

                <Button
                  icon={DeleteIcon}
                  onClick={() => handleRemove(index)}
                  destructive
                >
                  Remove
                </Button>
              </div>
            ))}

            <Button icon={PlusIcon} onClick={handleAdd}>
              Add Discount
            </Button>


          </Layout.Section>

            {/* Submit */}
            <Layout.Section>
              <Button primary onClick={handleCreateOffer}>
                Apply Offer
              </Button>
            </Layout.Section>
          </Layout>
        )}

        {/* Product Selector Modal */}
        {/*<Modal
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
            <div style={{ padding: "20px", textAlign: "center" }}>
              No products found
            </div>
          ) : (
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={products.map((p) => ({ ...p, id: p.id.toString() }))}
                selectable
                selectedItems={[
                  ...selected.map((p) => p.id.toString()),
                  ...offers.map((o) => o.product_id.toString()), // keep offers checked
                ]}
                onSelectionChange={(selectedIds) => {
                  // allow only new (non-offer) products
                  const filteredIds = selectedIds.filter(
                    (id) => !lockedIds.has(id)
                  );
                  setSelected(
                    products.filter((p) =>
                      filteredIds.includes(p.id.toString())
                    )
                  );
                }}
                renderItem={(item) => {
                  const { id, title, image_srcs } = item;
                  const isDisabled = lockedIds.has(id);

                  return (
                    <ResourceItem
                      id={id}
                      selectable={!isDisabled}
                      accessibilityLabel={`View details for ${title}`}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          padding: "5px 0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          {image_srcs && (
                            <img
                              src={image_srcs}
                              alt={title}
                              style={{
                                width: "50px",
                                height: "50px",
                                objectFit: "cover",
                                borderRadius: "4px",
                              }}
                            />
                          )}
                          <p>{title}</p>
                        </div>

                        {isDisabled && (
                          <div
                            style={{
                              backgroundColor: "#bf0711",
                              padding: "5px",
                              borderRadius: "5px",
                            }}
                          >
                            <p
                              style={{
                                color: "white",
                                fontSize: "13px",
                                margin: 0,
                                fontWeight: "bold",
                              }}
                            >
                              Offer already applied
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
        </Modal>*/}


{/*<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="Select Products"
  primaryAction={{ content: "Done", onAction: () => setOpen(false) }}
  large
>
  {loading ? (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <Spinner />
    </div>
  ) : products.length === 0 ? (
    <div style={{ padding: "20px", textAlign: "center" }}>No products available</div>
  ) : (
    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
      <ResourceList
        resourceName={{ singular: "product", plural: "products" }}
        items={products.map((p) => ({ ...p, id: p.id.toString() }))}
        selectedItems={
          activeDiscountIndex !== null
            ? discounts[activeDiscountIndex]?.selectedProducts.map((p) => p.id.toString()) || []
            : []
        }
        selectable
        onSelectionChange={(selectedIds) => {
          if (activeDiscountIndex === null) return;

          const selectedProducts = products.filter((p) =>
            selectedIds.includes(p.id.toString())
          );

          // Update state
          const newDiscounts = [...discounts];
          newDiscounts[activeDiscountIndex] = {
            ...newDiscounts[activeDiscountIndex],
            selectedProducts,
          };
          setDiscounts(newDiscounts);

          // Save in localStorage
          localStorage.setItem(
            `discount-${activeDiscountIndex}-products`,
            JSON.stringify(selectedProducts)
          );
        }}

        renderItem={(item) => {
          const { id, title, image_srcs } = item;

          // Disable if selected in other discounts
          const selectedInOtherDiscounts = discounts
            .filter((_, i) => i !== activeDiscountIndex)
            .flatMap((d) => (d.selectedProducts || []).map((p) => p.id.toString()));

          const isDisabled = selectedInOtherDiscounts.includes(id);

          return (
            <ResourceItem
              id={id}
              accessibilityLabel={`View details for ${title}`}
              disabled={isDisabled}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  padding: "5px 0",
                  opacity: isDisabled ? 0.5 : 1,
                }}
              >
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
                {offers.find((o) => o.product_id.toString() === id) && (
                  <div style={{ backgroundColor: "#bf0711", padding: "5px", borderRadius: "5px" }}>
                    <p style={{ color: "white", fontSize: "13px", margin: 0, fontWeight: "bold" }}>
                      Offer already applied
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
</Modal>*/}



<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="Select Products"
  primaryAction={{ content: "Done", onAction: () => setOpen(false) }}
  large
>
  {modalLoading ? (
    <div className="loader-overlay">
      <span className="loader"></span>
    </div>
  ) : products.length === 0 ? (
    <div style={{ padding: "20px", textAlign: "center" }}>No products available</div>
  ) : (
    <div style={{ maxHeight: "500px", padding: "10px 0" }}>
      {/* ✅ Available products section */}
      <div style={{ padding: "10px 20px" }}>
        <h3 style={{ marginBottom: "10px", color: "#202223" }}>Available Products</h3>

        {products.filter(
          (p) => !offers.find((o) => o.product_id.toString() === p.id.toString())
        ).length === 0 ? (
          <p style={{ color: "#8c9196" }}>No available products to select.</p>
        ) : (
          <ResourceList
            resourceName={{ singular: "product", plural: "products" }}
            items={products
              .filter((p) => !offers.find((o) => o.product_id.toString() === p.id.toString()))
              .map((p) => ({ ...p, id: p.id.toString() })) // ✅ convert id to string
            }
            selectedItems={
              activeDiscountIndex !== null
                ? discounts[activeDiscountIndex]?.selectedProducts.map((p) => p.id.toString()) || []
                : []
            }
            selectable
            onSelectionChange={(selectedIds) => {
              if (activeDiscountIndex === null) return;

              const selectableProducts = products.filter(
                (p) => !offers.find((o) => o.product_id.toString() === p.id.toString())
              );

              const selectedProducts = selectableProducts.filter((p) =>
                selectedIds.includes(p.id.toString())
              );

              const newDiscounts = [...discounts];
              newDiscounts[activeDiscountIndex] = {
                ...newDiscounts[activeDiscountIndex],
                selectedProducts,
              };

              setDiscounts(newDiscounts);
              localStorage.setItem(
                `discount-${activeDiscountIndex}-products`,
                JSON.stringify(selectedProducts)
              );
            }}
            renderItem={(item) => {
              const { id, title, image_srcs } = item;
              const selectedInOtherDiscounts = discounts
                .filter((_, i) => i !== activeDiscountIndex)
                .flatMap((d) => (d.selectedProducts || []).map((p) => p.id.toString()));
              const isDisabled = selectedInOtherDiscounts.includes(id);

              return (
                <ResourceItem id={id} disabled={isDisabled}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      padding: "5px 0",
                      opacity: isDisabled ? 0.5 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {image_srcs && (
                        <img
                          src={image_srcs}
                          alt={title}
                          style={{
                            width: "50px",
                            height: "50px",
                            objectFit: "cover",
                            borderRadius: "4px",
                          }}
                        />
                      )}
                      <p>{title}</p>
                    </div>
                    {isDisabled && (
                      <div
                        style={{
                          backgroundColor: "#FEEAEA",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid #BF0711",
                        }}
                      >
                        <p
                          style={{
                            color: "#BF0711",
                            fontSize: "13px",
                            margin: 0,
                            fontWeight: "600",
                          }}
                        >
                          Used in other discount
                        </p>
                      </div>
                    )}
                  </div>
                </ResourceItem>
              );
            }}
          />

        )}
      </div>

      {/* ✅ Products with offers (non-selectable) */}
      {offers.length > 0 && (
        <>
          <div
            style={{
              height: "1px",
              backgroundColor: "#E1E3E5",
              margin: "15px 0",
            }}
          />
          <div style={{ padding: "10px 20px" }}>
            <h3 style={{ marginBottom: "10px", color: "#5C5F62" }}>
              Products with Existing Offers
            </h3>
            <div style={{ display: "grid", gap: "10px" }}>
              {products
                .filter((p) =>
                  offers.find((o) => o.product_id.toString() === p.id.toString())
                )
                .map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      backgroundColor: "#F9FAFB",
                      border: "1px solid #E1E3E5",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      opacity: 0.7,
                    }}
                  >
                    {item.image_srcs && (
                      <img
                        src={item.image_srcs}
                        alt={item.title}
                        style={{
                          width: "45px",
                          height: "45px",
                          objectFit: "cover",
                          borderRadius: "5px",
                        }}
                      />
                    )}
                    <div style={{ flexGrow: 1 }}>
                      <p style={{ margin: 0, fontWeight: "500" }}>{item.title}</p>
                      <p style={{ color: "#9C9EA0", margin: 0, fontSize: "13px" }}>
                        Offer already applied
                      </p>
                    </div>
                    <span
                      style={{
                        backgroundColor: "#BF0711",
                        color: "white",
                        fontSize: "12px",
                        padding: "4px 8px",
                        borderRadius: "5px",
                      }}
                    >
                      Locked
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  )}
</Modal>


      </Page>
    </AppProvider>
  );
}
