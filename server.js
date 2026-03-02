const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Enhanced CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control', 'Pragma'],
  credentials: false
}));

// Additional CORS headers for mobile/web compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Cache-Control, Pragma');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(bodyParser.json());

// Initialize with sample data to avoid null errors
let latestData = { 
  temperature: 22.5, 
  humidity: 45.0, 
  timestamp: new Date().toISOString() 
};

let sheetUrl = null;

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: "Weather API Server Running",
    timestamp: new Date().toISOString(),
    endpoints: {
      "GET /data": "Get latest weather data",
      "POST /data": "Submit weather data", 
      "POST /register": "Register Google Sheets URL",
      "GET /health": "Health check"
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    latestData: latestData
  });
});

// Register Google Sheets URL
app.post('/register', (req, res) => {
  try {
    sheetUrl = req.body.sheetUrl;
    console.log('Sheet URL registered:', sheetUrl);
    res.json({ 
      status: "sheetUrl saved",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /register:', error);
    res.status(500).json({ 
      error: "Failed to register sheet URL",
      message: error.message 
    });
  }
});

// Submit weather data
app.post('/data', async (req, res) => {
  try {
    const { temperature, humidity } = req.body;

    // Validate input
    if (typeof temperature !== 'number' || typeof humidity !== 'number') {
      return res.status(400).json({ 
        error: "Invalid data format",
        message: "Temperature and humidity must be numbers"
      });
    }

    latestData = {
      temperature: parseFloat(temperature.toFixed(1)),
      humidity: parseFloat(humidity.toFixed(1)),
      timestamp: new Date().toISOString()
    };

    console.log('Data received:', latestData);

    // Send to Google Sheets if URL is registered
    if (sheetUrl) {
      try {
        await axios.post(sheetUrl, { 
          temperature: latestData.temperature, 
          humidity: latestData.humidity,
          timestamp: latestData.timestamp
        }, {
          timeout: 5000 // 5 second timeout
        });
        console.log('Data sent to Google Sheets successfully');
      } catch (sheetError) {
        console.error('Error sending to Google Sheets:', sheetError.message);
        // Don't fail the main request if Google Sheets fails
      }
    }

    res.json({ 
      status: "data received",
      data: latestData
    });

  } catch (error) {
    console.error('Error in /data POST:', error);
    res.status(500).json({ 
      error: "Failed to process data",
      message: error.message 
    });
  }
});

// Get latest weather data
app.get('/data', (req, res) => {
  try {
    // Add cache control headers to prevent caching issues
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    console.log('Data requested:', latestData);
    res.json(latestData);
  } catch (error) {
    console.error('Error in /data GET:', error);
    res.status(500).json({ 
      error: "Failed to get data",
      message: error.message 
    });
  }
});

// Keep-alive endpoint for preventing Replit sleep
app.get('/ping', (req, res) => {
  res.json({ 
    status: "pong",
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: "Internal server error",
    message: error.message 
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ 
    error: "Endpoint not found",
    availableEndpoints: ["/", "/data", "/register", "/health", "/ping"]
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🌤  Weather API Server running on port ${port}`);
  console.log(`🔧 Health check: /health`);
  console.log(`📊 Data endpoint: /data`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Keep the process alive and log activity
setInterval(() => {
  console.log(`⚡ Server alive at ${new Date().toISOString()} - Latest data:`, latestData);
}, 30000); // Log every 30 seconds
