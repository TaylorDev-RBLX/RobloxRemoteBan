import express from "express";
import fetch from "node-fetch";

const app = express();
const API_KEY = process.env.ROBLOX_API_KEY; // keep this in env vars!

async function robloxRequest(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Roblox API error (${res.status}): ${errText}`);
  }

  return res.json();
}

app.get("/ban/:universeId/:placeId/:userId", async (req, res) => {
  const { universeId, placeId, userId } = req.params;
  const baseUrl = `https://apis.roblox.com/cloud/v2/universes/${universeId}/places/${placeId}/user-restrictions`;

  try {
    // 1. Check for existing restriction
    const restrictions = await robloxRequest("GET", baseUrl);
    let restriction = restrictions.userRestrictions?.find(
      (r) => r.user?.robloxUserId === userId.toString()
    );

    if (restriction) {
      // 2a. Update existing restriction
      const url = `${baseUrl}/${restriction.id}?updateMask=gameJoinRestriction`;
      const updated = await robloxRequest("PATCH", url, {
        gameJoinRestriction: {
          active: true,
          duration: "3600s",
          privateReason: "Banned via Discord report",
          displayReason: "You are banned for breaking the rules",
          excludeAltAccounts: true,
        },
      });
      return res.json({ success: true, action: "patched", data: updated });
    } else {
      // 2b. Create a new restriction
      const created = await robloxRequest("POST", baseUrl, {
        user: { robloxUserId: userId },
        gameJoinRestriction: {
          active: true,
          duration: "3600s",
          privateReason: "Banned via Discord report",
          displayReason: "You are banned for breaking the rules",
          excludeAltAccounts: true,
        },
      });
      return res.json({ success: true, action: "created", data: created });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Ban server running on port ${port}`));

