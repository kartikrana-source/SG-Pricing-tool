import axios from "axios";

/**
 * Only allow demo.salescode.ai domain
 * Prevent open proxy abuse
 */
function isAllowedDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "demo.salescode.ai";
  } catch (err) {
    return false;
  }
}

const SIGNIN_URL = "https://demo.salescode.ai/signin?lob=simasgdemo";
const SIGNIN_PAYLOAD = {
  loginId: process.env.DEMO_LOGIN_ID || "integration_user",
  password:
    process.env.DEMO_LOGIN_PASSWORD ||
    "NPa4p4ho4zqWeSDSKPx/FvAskPKAJR6mquvU2WG8bJHxJ9DlnOkmPF0oGocwOCCWBnj+gqNV/eQREh9T4b/d2hC2s6H6VCTOCIwLnQLhIdw9DM7f2wUjqQ6qB9bRKha42tNoYp44uUzCFRFt2Rv7+IgGHWmVFZNivs32KNJ4QII=",
  unlimitedExpiry: false,
  lob: process.env.DEMO_LOB || "simasgdemo",
};

export default async function handler(req, res) {
  try {
    if (req.method === "POST" && req.query.action === "signin") {
      const signinResponse = await axios({
        method: "POST",
        url: SIGNIN_URL,
        headers: {
          lob: SIGNIN_PAYLOAD.lob,
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json;charset=UTF-8",
          "User-Agent": "Mozilla/5.0",
        },
        data: SIGNIN_PAYLOAD,
        timeout: 20000,
      });

      return res.status(signinResponse.status).json(signinResponse.data);
    }

    // Only allow GET for proxy pass-through
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        error: "Missing url parameter",
      });
    }

    if (!isAllowedDomain(url)) {
      return res.status(403).json({
        error: "Unauthorized domain",
      });
    }

    console.log("🔁 Calling External API:", url);

    const response = await axios({
      method: "GET",
      url: url,
      headers: {
        Authorization: req.headers.authorization || "",
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 20000,
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error("----- PROXY ERROR -----");
    console.error("Status:", error.response?.status);
    console.error("Response:", error.response?.data);
    console.error("Message:", error.message);
    console.error("-----------------------");

    return res.status(error.response?.status || 500).json({
      error: "Proxy error",
      status: error.response?.status,
      details: error.response?.data || error.message,
    });
  }
}
