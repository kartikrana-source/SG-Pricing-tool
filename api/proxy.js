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

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (err) {
      return {};
    }
  }

  let rawBody = "";
  for await (const chunk of req) {
    rawBody += chunk;
  }

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch (err) {
    return {};
  }
}

function getSigninPayload(options = {}) {
  const loginIdOverride =
    typeof options.loginIdOverride === "string"
      ? options.loginIdOverride.trim()
      : "";
  const loginId =
    loginIdOverride || process.env.DEMO_LOGIN_ID || process.env.LOGIN_ID;
  const password =
    process.env.DEMO_LOGIN_PASSWORD || process.env.LOGIN_PASSWORD;
  const lob = process.env.DEMO_LOB || process.env.LOB || "simasgdemo";

  if (!loginId) {
    return {
      error:
        "Missing signin loginId. Provide outletCode/loginId in request or set DEMO_LOGIN_ID (or LOGIN_ID).",
    };
  }

  if (!password) {
    return {
      error:
        "Missing signin password. Set DEMO_LOGIN_PASSWORD (or LOGIN_PASSWORD) in Vercel environment variables.",
    };
  }

  return {
    loginId,
    password,
    unlimitedExpiry: false,
    lob,
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "POST" && req.query.action === "signin") {
      const requestBody = await readJsonBody(req);
      const signinPayload = getSigninPayload({
        loginIdOverride: requestBody.outletCode || requestBody.loginId,
      });

      if (signinPayload.error) {
        return res.status(500).json({
          error: "Missing signin configuration",
          details: signinPayload.error,
        });
      }

      const signinResponse = await axios({
        method: "POST",
        url: SIGNIN_URL,
        headers: {
          lob: signinPayload.lob,
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json;charset=UTF-8",
          "User-Agent": "Mozilla/5.0",
        },
        data: signinPayload,
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
