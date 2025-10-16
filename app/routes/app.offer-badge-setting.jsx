import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  AppProvider,
  Select,
  TextField,
  ColorPicker,
  BlockStack,
  Text,
  Button,
  Spinner,
  Label
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { Outlet } from "@remix-run/react";
import "../assets/css/style.css";
import {PlusIcon} from '@shopify/polaris-icons';
import { useAppBridge } from '@shopify/app-bridge-react';

export function links() {
  return [{ rel: "stylesheet", href: "../assets/css/style.css" }];
}

export default function OfferBadgeSetting() {
  const [placement, setPlacement] = useState("product");
  const [position, setPosition] = useState("below_title");
  const [bgColor, setBgColor] = useState("");
  const [textColor, setTextColor] = useState("");
  const [fontSize, setFontSize] = useState("14");
  const [setting, setSetting] = useState([]);
  const [showOfferSetting, setShowOfferSetting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [marginTop, setMarginTop] = useState("");
  const [marginBottom, setMarginBottom] = useState("");
  const [marginLeft, setMarginLeft] = useState("");
  const [marginRight, setMarginRight] = useState("");
  const [paddingTop, setPaddingTop] = useState("");
  const [paddingBottom, setPaddingBottom] = useState("");
  const [paddingLeft, setPaddingLeft] = useState("");
  const [paddingRight, setPaddingRight] = useState("");
  const [designType, setDesignType] = useState("design1");
  const [fontWeight, setFontWeight] = useState("");
  const [width, setWidth] = useState("");

  const app = useAppBridge();
  const [shop, setShop] = useState("");

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

  const placementOptions = [
    { label: "Product Page", value: "product" },
    { label: "Cart Page", value: "cart" },
    { label: "Both Cart & Product", value: "cart & product" }
  ];

  const positionOptions = [
    // { label: "Above Product Section", value: "above" },
    // { label: "Below Product Section", value: "below" },
    { label: "Below Price", value: "below_price"},
    { label: "Below Title", value: "below_title"},
    { label: "Below Image", value: "below_image"}
  ];

  const widthOptions = [
    { label: "100%", value: "100%" },
    { label: "auto", value: "auto" },
    { label: "fit-content", value: "fit-content" }
  ];

  const fetchOfferBadgeSetting = () => {
    setLoading(true);
    fetch(`https://emporium.cardiacambulance.com/api/offer-badge-setting?shop=${shop}`)
      .then((res) => res.json())
      .then((data) => {

        setSetting(data.settings || null);
        localStorage.setItem("badge Setting", data.settings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {

    if(!shop) return;

    const badgeSetting = localStorage.getItem("badgeSetting");
    if(!badgeSetting) {
      fetchOfferBadgeSetting();
    }

  }, [designType, shop]);


  const handleSave = async () => {
    try {
      setLoading(true);

      let tempBg = bgColor;
      let tempText = textColor;
      let tempFontWeight = fontWeight;
      let tempWidth = width;

      if (designType === "design1") {
        tempText = "white";
        tempBg = "#ed1212";
        tempFontWeight = "bold";
        tempWidth = "fit-content";
      } else if (designType === "design2") {
        tempText = "white";
        tempBg = "#576af5";
        tempFontWeight = "bold";
        tempWidth = "fit-content";
      } else if (designType === "design3") {
        tempText = "white";
        tempBg = "#2ebb4e";
        tempFontWeight = "bold";
        tempWidth = "fit-content";
      }

      const payload = {
        placement,
        position,
        bgColor: tempBg,
        textColor: tempText,
        fontSize,
        marginTop,
        marginRight,
        marginBottom,
        marginLeft,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        fontWeight: tempFontWeight,
        designType,
        width: tempWidth,
      };

      const response = await fetch(`https://emporium.cardiacambulance.com/api/offer-badge-setting?shop=${shop}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === "success") {
        alert("Settings saved!");
      } else {
        alert("Failed to save settings!");
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Error saving settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <AppProvider i18n={enTranslations}>
      <Page title="Offer Badge Settings">
        <Layout>

          <Layout.Section>
            <Card sectioned>
              <Text variant="headingMd">
                Offer Badge Setting
              </Text>
              <Button onClick={() => setShowOfferSetting(!showOfferSetting)}>
                {showOfferSetting ? "Hide Offer Badge Setting" : "Show Offer Badge Setting"}
              </Button>
            </Card>
          </Layout.Section>

          {/* Loading */}
          {loading && (
            <div className="loader-overlay">
              <span className="loader"></span>
            </div>
          )}

          {/* Show single settings object */}
          {showOfferSetting && !loading && setting && (
            <Layout.Section>
              <Card sectioned title={`Setting #${setting.id}`} subdued>
                <Text>
                  <strong>Placement:</strong> {setting.placement}
                </Text>
                <Text>
                  <strong>Position:</strong> {setting.position}
                </Text>
                <Text>
                  <strong>Background Color:</strong>{" "}
                  <span style={{ padding: "2px 6px", borderRadius: "4px" }}>
                    {setting.bg_color}
                  </span>
                </Text>
                <Text>
                  <strong>Text Color:</strong>{" "}
                  <span>{setting.text_color}</span>
                </Text>
                <Text>
                  <strong>Font Size:</strong> {setting.font_size}px
                </Text>
              </Card>
            </Layout.Section>
          )}

          {/* No data */}
          {!loading && showOfferSetting && !setting && (
            <Layout.Section>
              <Text>No offer badge settings found.</Text>
            </Layout.Section>
          )}


          <Layout.Section>
            <div
              style={{
                display: "grid",
                gap: "10px",
                gridTemplateColumns: "repeat(4, minmax(200px, 1fr))",
              }}
            >
              
                <div 
                  onClick={() => setDesignType("design1")}
                  className={`design-div1 cursor-pointer ${designType === "design1" ? "selected" : ""}`}
                >
                  <div className="design1">Buy 3 Get 10% Off!</div>
                  <div className="design1">Buy 2 Get 1 Free!</div>
                  <div className="design1">Buy 5 Get 100Rs Off!</div>
                </div>

                <div
                  onClick={() => setDesignType("design2")}
                  className={`design-div2 cursor-pointer ${designType === "design2" ? "selected" : ""}`}
                >
                  <div className="design2">Buy 3 Get 10% Off!</div>
                  <div className="design2">Buy 2 Get 1 Free!</div>
                  <div className="design2">Buy 5 Get 100Rs Off!</div>
                </div>

                <div
                  onClick={() => setDesignType("design3")}
                  className={`design-div3 cursor-pointer ${designType === "design3" ? "selected" : ""}`}
                >
                  <div className="design3">Buy 3 Get 10% Off!</div>
                  <div className="design3">Buy 2 Get 1 Free!</div>
                  <div className="design3">Buy 5 Get 100Rs Off!</div>
                </div>

                <div
                  onClick={() => setDesignType("design4")}
                  className={`design-div cursor-pointer ${designType === "design4" ? "selected" : ""}`}
                >
                  <Button
                      primary
                      icon={PlusIcon}
                      >
                      Create custom Badge
                    </Button>
                </div>

            </div>
          </Layout.Section>

          <Layout.Section>
            <Card sectioned>
              <BlockStack gap="5">
              
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                  <Select
                    label="Placement"
                    options={placementOptions}
                    value={placement}
                    onChange={setPlacement}
                  />

                  <Select
                    label="Position"
                    options={positionOptions}
                    value={position}
                    onChange={setPosition}
                  />
                </div>

                {designType === "design4" && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                    
                      <TextField
                          label="Background Color"
                          type="text"
                          value={bgColor}
                          onChange={setBgColor}
                          // helpText="Enter hex color like #df0c0c"
                      />


                      <TextField
                        label="Font Color"
                        type="text"
                        value={textColor}
                        onChange={setTextColor}
                        // helpText="Enter hex color like #ffffff"
                      />

                    </div>
                
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>

                      <TextField
                        label="Font Weight"
                        type="number"
                        placeholder="500"
                        value={fontWeight}
                        onChange={setFontWeight}
                      />

                      <Select
                        label="Widget Width"
                        options={widthOptions}
                        value={width}
                        onChange={setWidth}
                      />

                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                    
                      <div>
                        <Label>Margin</Label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                          <TextField
                            type="number"
                            value={marginTop}
                            onChange={setMarginTop}
                            placeholder="Top"
                          />

                          <TextField
                            type="number"
                            value={marginRight}
                            onChange={setMarginRight}
                            placeholder="Right"
                          />

                          <TextField
                            type="number"
                            value={marginBottom}
                            onChange={setMarginBottom}
                            placeholder="Bottom"
                          />

                          <TextField
                            type="number"
                            value={marginLeft}
                            onChange={setMarginLeft}
                            placeholder="Left"
                          />

                        </div>
                      </div>

                      <div>
                        <Label>Padding</Label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                          <TextField
                            type="number"
                            value={paddingTop}
                            onChange={setPaddingTop}
                            placeholder="Top"
                          />
                          <TextField
                            type="number"
                            value={paddingRight}
                            onChange={setPaddingRight}
                            placeholder="Right"
                          />
                          <TextField
                            type="number"
                            value={paddingBottom}
                            onChange={setPaddingBottom}
                            placeholder="Bottom"
                          />
                          <TextField
                            type="number"
                            value={paddingLeft}
                            onChange={setPaddingLeft}
                            placeholder="Left"
                          />

                        </div>
                      </div>
                    </div>
                  </>
                )}
                <button onClick={handleSave} className="submit-button">
                  Save Settings
                </button>
              </BlockStack>
            </Card>
          </Layout.Section>

        </Layout>
      </Page>
      <Outlet />
    </AppProvider>
  );
}
