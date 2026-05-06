import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import emergencyRoutes from './routes/emergency.js';
import locationRoutes from './routes/location.js';
import communicationRoutes from './routes/communication.js';
import relationshipRoutes from './routes/relationships.js';
import evidenceRoutes from './routes/evidenceRoutes.js';
import chatRequestRoutes from './routes/chatRequests.js';
dotenv.config();

const app = express();
const server = createServer(app);
const isDevelopment = process.env.NODE_ENV === "development";

const io = new Server(server, {
  cors: {
    origin: isDevelopment
      ? true                  // allow all origins in dev
      : process.env.FRONTEND_URL || "http://localhost:3000",  // restrict in prod
    methods: ["GET", "POST"],
  },
});

// Production-ready rate limiting with different limits for different endpoints
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: {
    success: false,
    message: message || 'Too many requests, please try again later.',
    retryAfter: Math.ceil(windowMs / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks and static assets
    return req.path === '/health' || req.path.startsWith('/static');
  }
});

// Different rate limits for different types of requests
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  20, // 20 auth requests per 15 minutes
  'Too many authentication attempts, please try again later.'
);

const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes  
  300, // 300 general requests per 15 minutes
  'Too many requests, please try again later.'
);

const emergencyLimiter = createRateLimit(
  1 * 60 * 1000, // 1 minute
  10, // 10 emergency requests per minute
  'Too many emergency requests, please wait before trying again.'
);

const locationLimiter = createRateLimit(
  1 * 60 * 1000, // 1 minute
  30, // 30 location updates per minute
  'Too many location updates, please slow down.'
);

const uploadLimiter = createRateLimit(
  2 * 60 * 1000, // 2 minutes
  15, // 15 uploads per 2 minutes (more reasonable for normal usage)
  'Too many file uploads, please wait before trying again.'
);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Socket.io connection handling
io.on('connection', (socket) => {
  // console.log('User connected:', socket.id);

  socket.on('join-room', (userId) => {
    socket.join(userId);
    // console.log(`User ${userId} joined their room`);
  });

  socket.on('emergency-trigger', (data) => {
    // Broadcast emergency to all connected members
    socket.to(data.memberId).emit('emergency-alert', data);
  });

  socket.on('location-update', (data) => {
    // Broadcast location updates to emergency contacts
    socket.to(data.memberId).emit('location-update', data);
  });

  socket.on('disconnect', () => {
    // console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Routes with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/emergency', emergencyLimiter, emergencyRoutes);
app.use('/api/location', locationLimiter, locationRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/relationships', relationshipRoutes);
app.use('/api/evidence', uploadLimiter, evidenceRoutes);
app.use('/api/chat-requests', chatRequestRoutes);
// Comprehensive health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'unknown',
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      rateLimits: {
        general: '300 requests per 15 minutes',
        auth: '20 requests per 15 minutes',
        emergency: '10 requests per minute',
        location: '30 requests per minute',
        upload: '5 requests per 5 minutes'
      }
    };

    // Check database connection
    try {
      await mongoose.connection.db.admin().ping();
      healthCheck.services.database = 'connected';
    } catch (dbError) {
      healthCheck.services.database = 'disconnected';
      healthCheck.status = 'DEGRADED';
    }

    // Check if we're approaching memory limits
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (memoryUsagePercent > 90) {
      healthCheck.status = 'WARNING';
      healthCheck.memory = {
        ...healthCheck.memory,
        usagePercent: memoryUsagePercent,
        warning: 'High memory usage detected'
      };
    }

    const statusCode = healthCheck.status === 'OK' ? 200 : 
                     healthCheck.status === 'DEGRADED' ? 503 : 200;

    res.status(statusCode).json(healthCheck);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});
app.use('/uploads', express.static('uploads'));

// Test email endpoint
app.post('/test-email', async (req, res) => {
  try {
    const notificationService = (await import('./services/notificationService.js')).default;
    const result = await notificationService.sendTestEmail();
    
    if (result) {
      res.json({ success: true, message: 'Test email sent successfully' });
    } else {
      res.json({ success: false, message: 'Failed to send test email' });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ success: false, message: 'Error sending test email', error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!' 
  });
});
// console.log("USER TYPE:", req.user.userType);
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('Server continuing without MongoDB - some features may not work');
  });

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
