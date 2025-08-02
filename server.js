// server.js
const WebSocket = require("ws");
const express = require("express");
const cors = require("cors");
const path = require("path"); // Now needed to serve static files

const app = express();
const PORT = process.env.PORT || 3000; // Use Vercel's PORT for deployment, fallback for local

let flightPlans = []; // Store multiple flight plans

// Connect to WebSocket
const ws = new WebSocket("wss://24data.ptfs.app/wss", {
  headers: { Origin: "" } // Required as per docs
});

ws.on("open", () => console.log("✅ WebSocket connected"));
ws.on("message", (data) => {
  try {
    const parsed = JSON.parse(data);

    // Handle both regular and event flight plans
    if (parsed.t === "FLIGHT_PLAN" || parsed.t === "EVENT_FLIGHT_PLAN") {
      const flightPlan = parsed.d;

      // Add timestamp and source info
      flightPlan.timestamp = new Date().toISOString();
      flightPlan.source = parsed.t === "EVENT_FLIGHT_PLAN" ? "Event" : "Main";

      // Add new flight plan to array, keep last 20
      flightPlans.unshift(flightPlan);
      if (flightPlans.length > 20) {
        flightPlans = flightPlans.slice(0, 20);
      }

      console.log(`📡 Received ${flightPlan.source} FlightPlan:`, flightPlan.callsign);
    }
  } catch (err) {
    console.error("❌ Parse error:", err);
  }
});

ws.on("error", (err) => {
  console.error("❌ WebSocket error:", err);
});

ws.on("close", () => {
  console.log("❌ WebSocket connection closed");
});

app.use(cors()); // Enable CORS for API requests
app.use(express.json()); // Enable JSON body parsing

// *** NEW: Serve static files from the 'public' directory ***
// This line makes all files in the 'public' folder accessible directly
// E.g., 'index.html' is at '/', 'style.css' is at '/style.css', 'script.js' is at '/script.js'
app.use(express.static(path.join(__dirname, 'public')));

// REST: Get all flight plans
// This endpoint will be accessible at /flight-plans
app.get("/flight-plans", (req, res) => {
  res.json(flightPlans);
});

// Health check endpoint
// This endpoint will be accessible at /health
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    wsConnected: ws.readyState === WebSocket.OPEN,
    flightPlansCount: flightPlans.length
  });
});

// For any other route not matched by static files or specific API routes,
// serve the index.html (useful for single-page applications with client-side routing)
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });


app.listen(PORT, () => console.log(`🌐 Server running at http://localhost:${PORT}`));