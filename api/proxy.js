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

export default async function handler(req, res) {
  try {
    // Only allow GET
    if (req.method !== "GET") {
      return res.status(405).json({
        error: "Method not allowed",
      });
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
