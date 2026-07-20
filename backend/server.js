require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { initSocketHandler } = require('./sockets/socketHandler');
const { resumeAllInTransitTransports } = require('./sockets/transportSimulator');

const authRoutes = require('./routes/authRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const organRoutes = require('./routes/organRoutes');
const recipientRoutes = require('./routes/recipientRoutes');
const matchRoutes = require('./routes/matchRoutes');
const transportRoutes = require('./routes/transportRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] }
});

app.set('io', io);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'organbay-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/organs', organRoutes);
app.use('/api/recipients', recipientRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/transports', transportRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/audit-logs', auditRoutes);

// Central error handler (keeps stack traces out of API responses).
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

initSocketHandler(io);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`[server] OrganBay backend listening on port ${PORT}`);
      // Recover any transports left mid-flight from before a restart --
      resumeAllInTransitTransports(io).catch((err) =>
        console.error('[server] Failed to resume in-transit transports:', err.message)
      );
    });
  })
  .catch((err) => {
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  });