const express = require("express");
const axios = require("axios");
const nacl = require("tweetnacl");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Cloudflare Account ID
const ACCOUNT_ID = "YOUR_ACCOUNT_ID";  // <-- اپنا account ID یہاں لگائیں

// API Token (Render.com Environment Variable)
const CF_API_TOKEN = process.env.CF_API_TOKEN;

app.get("/", (req, res) => {
  res.send("WarpX Cloudflare API Server Running ✔");
});

// 🔥 Generate WarpX VPN Config
app.get("/getconfig", async (req, res) => {
  try {
    // 1) Generate WireGuard keys
    const keyPair = nacl.box.keyPair();
    const publicKey = Buffer.from(keyPair.publicKey).toString("base64");
    const privateKey = Buffer.from(keyPair.secretKey).toString("base64");

    // 2) Register device with Cloudflare
    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/devices`,
      {
        name: "WarpX-Device",
        public_key: publicKey,
        policy: {}
      },
      {
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = response.data;

    if (!result.success) {
      return res.status(400).json({ error: "Device registration failed", details: result });
    }

    // 3) Build final config for Android App
    const device = result.result;

    const config = {
      private_key: privateKey,
      public_key: publicKey,
      warp_ip: device.ip,
      warp_gateway: "162.159.193.1",
      server: "engage.cloudflareclient.com:2408",
    };

    res.json({
      success: true,
      config
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cloudflare API error", details: err.message });
  }
});

// Server Port (Render uses process.env.PORT)
app.listen(process.env.PORT || 3000, () => {
  console.log("WarpX VPN Server started ✔");
});

