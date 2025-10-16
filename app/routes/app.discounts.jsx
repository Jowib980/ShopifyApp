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
  TextField,
  ResourceList, 
  ResourceItem
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { Outlet } from "@remix-run/react";
import { useNavigate } from "@remix-run/react";
import "../assets/css/style.css";
import {PlusIcon, DeleteIcon} from '@shopify/polaris-icons';
import { useAppBridge } from '@shopify/app-bridge-react';


export function links() {
  return [{ rel: "stylesheet", href: "../assets/css/style.css" }];
}


export default function Create() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showActiveDiscounts, setShowActiveDiscounts] = useState(false);
  const [showDeactivateDiscounts, setShowDeactivateDiscounts] = useState(false);
  const [showDiscountOption, setShowDiscountOption] = useState(true);

  // Active discounts search & pagination
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [activePage, setActivePage] = useState(1);

  // Deactivated discounts search & pagination
  const [deactiveSearchQuery, setDeactiveSearchQuery] = useState("");
  const [deactivePage, setDeactivePage] = useState(1);

  const rowsPerPage = 10;


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
    localStorage.removeItem("offers");
    if (shop && !localStorage.getItem("offers")) {
      fetchOffers();
    }
  }, [shop]);


  const fetchOffers = () => {
    setLoading(true);
    fetch(`https://emporium.cardiacambulance.com/api/offer-products?shop=${shop}`)
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setOffers(data || []);
        localStorage.setItem('offers', JSON.stringify(data));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleShowDiscountOption = () => {
    setShowDiscountOption(true);
    setShowActiveDiscounts(false);
    setShowDeactivateDiscounts(false);
  }

  const handleGlobalDiscount = () => {
    navigate("/discounts/global");
  }

  const handleDiscountOptions = () => {
    navigate("/discounts/create");
  };

  const handleActiveDiscounts = () => {
    setShowActiveDiscounts(true);
    setShowDeactivateDiscounts(false);
    setShowDiscountOption(false);
    fetchOffers();
  }

  const handleDeactivateDiscounts = () => {
    setShowActiveDiscounts(false);
    setShowDeactivateDiscounts(true);
    setShowDiscountOption(false);
    fetchOffers();
  }
    
  const handleDiscountDeactivate = (offer_id) => {
    setLoading(true);

    fetch(`https://emporium.cardiacambulance.com/api/update-offer/${offer_id}`,{
      method: "PUT",
      headers: {
        "Content-Type" : "application/json",
        "Accept" : "application/json"
      },
      body: JSON.stringify({
        status: 0,
      }),
    })
    .then((res) => res.json())
    .then((data) => {
      setLoading(false);
      console.log(data || []);
      handleActiveDiscounts();
    })
    .catch((err) => {
      console.error("Error updating offer:", err);
    })
    .finally(() => {
      setLoading(false);
    });
  }

  const handleDiscountActivate = (offer_id) => {
    setLoading(true);

    fetch(`https://emporium.cardiacambulance.com/api/update-offer/${offer_id}`,{
      method: "PUT",
      headers: {
        "Content-Type" : "application/json",
        "Accept" : "application/json"
      },
      body: JSON.stringify({
        status: 1,
      }),
    })
    .then((res) => res.json())
    .then((data) => {
      setLoading(false);
      console.log(data || []);
      handleActiveDiscounts();
    })
    .catch((err) => {
      console.error("Error updating offer:", err);
    })
    .finally(() => {
      setLoading(false);
    });
  }

  const handleDiscountDelete = (offer_id) => {
    setLoading(true);
    fetch(`https://emporium.cardiacambulance.com/api/delete-offer/${offer_id}`,{
      method: "DELETE",
      headers: {
        "Content-Type" : "application/json",
        "Accept" : "application/json"
      },
    })
    .then((res) => res.json())
    .then((data) => {
      setLoading(false);
      console.log(data || []);
      handleActiveDiscounts();
    })
    .catch((err) => {
      console.error("Error updating offer:", err);
    })
    .finally(() => {
      setLoading(false);
    });
  }

  // Active

  const getGroupedActiveOffers = () => {
    const grouped = {};

    offers
      .filter(item => item.offer.status === "1")
      .forEach(item => {
        const offerId = item.offer_id;
        if (!grouped[offerId]) {
          grouped[offerId] = {
            offer: item.offer,
            products: [],
          };
        }
        if (item.product?.title) grouped[offerId].products.push(item.product.title);
      });

    // Return as array for pagination
    return Object.entries(grouped).map(([offer_id, { offer, products }]) => ({
      offer_id,
      offer,
      products,
    }));
  };


  const getActiveRows = () => {
    const grouped = getGroupedActiveOffers();

    const filtered = grouped.filter(({ offer, products }) => {
      const query = activeSearchQuery.toLowerCase();
      const productTitles = products.join(", ").toLowerCase();
      const offerType = offer?.type?.toLowerCase() || "";
      return productTitles.includes(query) || offerType.includes(query);
    });

    const start = (activePage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filtered.slice(start, end);
  };

  const getActiveTotalPages = () => {
    const grouped = getGroupedActiveOffers();

    const total = grouped.filter(({ offer, products }) => {
      const query = activeSearchQuery.toLowerCase();
      const productTitles = products.join(", ").toLowerCase();
      const offerType = offer?.type?.toLowerCase() || "";
      return productTitles.includes(query) || offerType.includes(query);
    }).length;

    return Math.ceil(total / rowsPerPage);
  };


  // Deactivated

  const getGroupedInActiveOffers = () => {
    const grouped = {};

    offers
      .filter(item => item.offer.status === "0")
      .forEach(item => {
        const offerId = item.offer_id;
        if (!grouped[offerId]) {
          grouped[offerId] = {
            offer: item.offer,
            products: [],
          };
        }
        if (item.product?.title) grouped[offerId].products.push(item.product.title);
      });

    // Return as array for pagination
    return Object.entries(grouped).map(([offer_id, { offer, products }]) => ({
      offer_id,
      offer,
      products,
    }));
  };


  const getDeactiveRows = () => {
    const grouped = getGroupedInActiveOffers();
    const filtered = grouped.filter(({ offer, products}) => {
      const query = deactiveSearchQuery.toLowerCase();
      const productTitles = products.join(", ").toLowerCase();
      const offerType = offer?.type?.toLowerCase() || "";
      return productTitles.includes(query) || offerType.includes(query);
    });

    const start = (deactivePage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filtered.slice(start, end);
  };

  const getDeactiveTotalPages = () => {
    const grouped = getGroupedInActiveOffers();

    const total = grouped.filter(({ offer, products }) => {
      const query = deactiveSearchQuery.toLowerCase();
      const productTitles = products.join(", ").toLowerCase();
      const offerType = offer?.type?.toLowerCase() || "";
      return productTitles.includes(query) || offerType.includes(query);
    }).length;

    return Math.ceil(total / rowsPerPage);
  };




  return (
    <AppProvider i18n={enTranslations}>
      <Page title="Create Discount Widget">
        {loading && (      
          <div className="loader-overlay">
            <span className="loader"></span>
          </div>
        )}
      
        <Layout>
            {/* Total offers + Show/Hide button */}
              <Layout.Section>
                <Card sectioned>
                  <Text variant="headingMd">
                    Total Discount Widgets Created: {
                      Array.isArray(offers)
                        ? new Set(offers.map(item => item.offer?.id)).size
                        : 0
                    }
                  </Text>
                </Card>
              </Layout.Section>

             
              <Layout.Section>
                <Card>
                  <div
                    style={{
                      display: "grid",
                      gap: "10px",
                      gridTemplateColumns: "repeat(3, minmax(200px, 1fr))",
                    }}
                  >
                    <Button
                      primary
                      onClick={handleShowDiscountOption}>
                      Create Discount
                    </Button>
                  
                    <Button onClick={handleActiveDiscounts}>
                        Active Discounts
                    </Button>
                  
                    <Button onClick={handleDeactivateDiscounts}>
                      Inactive Discounts
                    </Button>
                  </div>
                </Card>
              </Layout.Section>


              {showDiscountOption && !loading && (

                <Layout.Section>
                  <Card>
                    <div
                      style={{
                        display: "grid",
                        gap: "10px",
                        gridTemplateColumns: "repeat(2, minmax(300px, 1fr))",
                      }}
                    >
                      {/* Percent offer */}
                      <Card>
                        <Text variant="headingSm" as="h3">
                          Create Universal Discount
                        </Text>
                        <Text>Apply a universal discount to all products that don’t have any existing offers.</Text>
                          <Button
                            icon={PlusIcon}
                            primary
                            onClick={handleGlobalDiscount}
                          >
                            Create
                          </Button>
                      </Card>
                            
                      {/* Free offer */}
                      <Card>
                        <Text variant="headingSm" as="h3">
                          Create Specific Product Deal
                        </Text>
                        <Text>Create a custom discount for specific products of your choice.</Text>
                          <Button
                            icon={PlusIcon}
                            primary
                            onClick={handleDiscountOptions}
                          >
                            Create
                          </Button>
                      </Card>
                          
                    </div>
                  </Card>
                </Layout.Section>
              )}

        
              {/* Active Offers list */}
              {showActiveDiscounts && !loading && offers.length > 0 && (

                <Layout.Section>
                  <Card>
                     <Text variant="headingMd" as="h2">Active Discounts</Text>
                  </Card>
                  <div className="option-section">
                    <div className="option-1">
                      <TextField
                        label="Search Active Discounts(discount, free, amount or product name)"
                        value={activeSearchQuery}
                        onChange={(value) => {
                            setActiveSearchQuery(value);
                          setActivePage(1); // reset page on new search
                        }}
                        placeholder="Search discounts..."
                        autoComplete="off"
                      />
                    </div>

                    <div className="option-2">
                      <ButtonGroup>
                        <Text>{`Page ${activePage} of ${getActiveTotalPages()}`}</Text>
                        <Button
                          disabled={activePage === 1}
                          onClick={() => setActivePage((prev) => prev - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          disabled={activePage === getActiveTotalPages()}
                          onClick={() => setActivePage((prev) => prev + 1)}
                        >
                          Next
                        </Button>
                          
                      </ButtonGroup>
                    </div>

                  </div>

                  <div className="table-section">
                    <DataTable
                      columnContentTypes={['text', 'text', 'text']}
                      headings={['Discount', 'Product Name(s)', 'Action']}
                      rows={getActiveRows().map(({ offer_id, offer, products }) => {
                        let discountText = '';
                        if (offer.type === "discount")
                          discountText = `Buy ${offer.buy_quantity} get ${offer.discount_percent}% Off!`;
                        else if (offer.type === "free")
                          discountText = `Buy ${offer.buy_quantity} get ${offer.free_quantity} Free!`;
                        else if (offer.type === "amount")
                          discountText = `Buy ${offer.buy_quantity} get ${offer.amount_off} off!`;

                        return [
                          discountText,
                          <div
                            key={offer_id + '_products'}
                            style={{
                              wordBreak: "break-word",
                              whiteSpace: "pre-wrap",
                              maxWidth: "100%",
                            }}
                          >
                            {products.join(", ")}
                          </div>,
                          <ButtonGroup key={offer_id}>
                            <Button icon={DeleteIcon} onClick={() => handleDiscountDelete(offer_id)} />
                            <Button
                              variant="primary"
                              tone="critical"
                              onClick={() => handleDiscountDeactivate(offer_id)}
                            >
                              Inactive
                            </Button>
                          </ButtonGroup>,
                        ];
                      })}
                    />

                  </div>


                </Layout.Section>

              )}

              {/* Deactivate Offers list */}
              {showDeactivateDiscounts && !loading && offers.length > 0 && (

                <Layout.Section>
                  <Card>
                     <Text variant="headingMd" as="h2">Inactive Discounts</Text>
                  </Card>
                  <div className="option-section">
                    <div className="option-1">
                      <TextField
                        label="Search Deactivated Discounts(discount, free, amount or product name)"
                        value={deactiveSearchQuery}
                        onChange={(value) => {
                          setDeactiveSearchQuery(value);
                          setDeactivePage(1); // reset page on new search
                        }}
                        placeholder="Search discounts..."
                        autoComplete="off"
                      />
                    </div>

                    <div className="option-2">
                      <ButtonGroup>
                        <Text>{`Page ${deactivePage} of ${getDeactiveTotalPages()}`}</Text>
                        <Button
                          disabled={deactivePage === 1}
                          onClick={() => setDeactivePage((prev) => prev - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          disabled={deactivePage === getDeactiveTotalPages()}
                          onClick={() => setDeactivePage((prev) => prev + 1)}
                        >
                          Next
                        </Button>
                      </ButtonGroup>
                    </div>
                  </div>

                  <div className="table-section">
                    <DataTable
                      columnContentTypes={['text','text','text']}
                      headings={['Discount','Product Name','Action']}
                      rows={getDeactiveRows().map(({ offer_id, offer, products }) => {
                        
                        let discountText = '';
                        if (offer.type === "discount") discountText = `Buy ${offer.buy_quantity} get ${offer.discount_percent}% Off!`;
                        else if (offer.type === "free") discountText = `Buy ${offer.buy_quantity} get ${offer.free_quantity} Free!`;
                        else if (offer.type === "amount") discountText = `Buy ${offer.buy_quantity} get ${offer.amount_off} off!`;

                        return [
                          discountText,
                          <div
                            key={offer_id + '_products'}
                            style={{
                              wordBreak: "break-word",
                              whiteSpace: "pre-wrap",
                              maxWidth: "100%",
                            }}
                          >
                            {products.join(", ")}
                          </div>,
                          <ButtonGroup key={offer_id}>
                            <Button icon={DeleteIcon} onClick={() => handleDiscountDelete(offer_id)}></Button>
                            <Button variant="primary" tone="critical" onClick={() => handleDiscountActivate(offer_id)}>Active</Button>
                          </ButtonGroup>
                        ];
                      })}
                    />

                  </div>

                </Layout.Section>

              )}
        
        </Layout>
      </Page>

    </AppProvider>

  );
}
