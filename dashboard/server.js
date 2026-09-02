// bot/server/server.js → BADOL/server.js - v2.0 Custom Path Fixed
// 100% Same Logic - Only Path + New Config Support

const express = require('express');
const path = require('path');
const os = require('os');
const fs = require('fs');

function getConf() {
  const cfg = global.config || {};
  return {
    botName: cfg.botInfo?.name || cfg.botName || 'BADOL-TG-BOT',
    prefix: cfg.botInfo?.prefix || cfg.prefix || '/',
    port: cfg.dashboard?.port || cfg.dashBoard?.port || 3021,
    dashboard: cfg.dashboard || cfg.dashBoard || {},
    serverUptime: cfg.serverUptime || {}
  };
}

async function createServer() {
  const conf = getConf();
  const app = express();
  const server = require('http').createServer(app);
  const PORT = conf.port;

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Detect deployment platform
  let deployName = "💻 Local";
  const hostname = os.hostname().toLowerCase();

  if (process.env.RENDER === "true") {
    deployName = "🚀 Render";
  } else if (process.env.REPL_ID) {
    deployName = "⚙️ Replit";
  } else if (process.env.PROJECT_DOMAIN) {
    deployName = `🌐 Glitch (${process.env.PROJECT_DOMAIN})`;
  } else if (hostname.includes("railway") || process.env.RAILWAY_ENVIRONMENT) {
    deployName = "🚄 Railway";
  } else if (hostname.includes("fly") || process.env.FLY_APP_NAME) {
    deployName = "🪰 Fly.io";
  } else if (process.env.HEROKU_APP_NAME) {
    deployName = "🟣 Heroku";
  } else if (process.env.VERCEL) {
    deployName = "▲ Vercel";
  }

  global.deploymentPlatform = deployName;

  // Session storage (in-memory)
  const sessions = new Map();

  // Authentication middleware
  const requireAuth = (req, res, next) => {
    const passwordProtection = conf.dashboard?.passwordProtection?.enable;

    if (!passwordProtection) {
      return next();
    }

    const sessionId = req.headers['x-session-id'];
    if (sessionId && sessions.has(sessionId)) {
      return next();
    }

    res.status(401).json({ error: 'Unauthorized' });
  };

  // Serve static dashboard - নতুন পাথ
  app.use(express.static(path.join(__dirname, '..', 'dashboard')));

  // Auth endpoints
  app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    const configPassword = conf.dashboard?.passwordProtection?.password;

    if (password === configPassword) {
      const sessionId = Math.random().toString(36).substring(7);
      sessions.set(sessionId, { timestamp: Date.now() });
      res.json({ success: true, sessionId });
    } else {
      res.status(401).json({ success: false, error: 'Invalid password' });
    }
  });

  app.get('/api/auth/check', (req, res) => {
    const passwordProtection = conf.dashboard?.passwordProtection?.enable;
    res.json({ passwordProtection: passwordProtection || false });
  });

  // View command endpoint - নতুন পাথ BADOL-CMDS/cmds
  app.get('/api/commands/view/:name', requireAuth, (req, res) => {
    try {
      const { name } = req.params;
      const commandsPath = path.join(__dirname, '..', 'BADOL-CMDS', 'cmds');
      const files = fs.readdirSync(commandsPath);

      let fileName = null;
      for (const file of files) {
        if (file.endsWith('.js')) {
          const cmdPath = path.join(commandsPath, file);
          delete require.cache[require.resolve(cmdPath)];
          const cmd = require(cmdPath);
          if (cmd.config && cmd.config.name === name) {
            fileName = file;
            break;
          }
        }
      }

      if (!fileName) {
        return res.json({ success: false, message: 'Command not found' });
      }

      const filePath = path.join(commandsPath, fileName);
      const code = fs.readFileSync(filePath, 'utf-8');
      res.json({ success: true, fileName, code });
    } catch (error) {
      res.json({ success: false, message: error.message });
    }
  });

  // View event endpoint - নতুন পাথ BADOL-CMDS/events
  app.get('/api/events/view/:name', requireAuth, (req, res) => {
    try {
      const { name } = req.params;
      const eventsPath = path.join(__dirname, '..', 'BADOL-CMDS', 'events');
      const files = fs.readdirSync(eventsPath);

      let fileName = null;
      for (const file of files) {
        if (file.endsWith('.js')) {
          const evtPath = path.join(eventsPath, file);
          delete require.cache[require.resolve(evtPath)];
          const evt = require(evtPath);
          if (evt.config && evt.config.name === name) {
            fileName = file;
            break;
          }
        }
      }

      if (!fileName) {
        return res.json({ success: false, message: 'Event not found' });
      }

      const filePath = path.join(eventsPath, fileName);
      const code = fs.readFileSync(filePath, 'utf-8');
      res.json({ success: true, fileName, code });
    } catch (error) {
      res.json({ success: false, message: error.message });
    }
  });

  // Install/update event endpoint
  app.post('/api/events/install', requireAuth, (req, res) => {
    try {
      const { fileName, code } = req.body;
      const result = global.installEventFile(fileName, code);
      res.json(result);
    } catch (error) {
      res.json({ success: false, message: error.message });
    }
  });

  // Uptime endpoint
  app.get('/uptime', (req, res) => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    res.json({
      status: 'ok',
      uptime: {
        raw: uptime,
        formatted: `${hours}h ${minutes}m ${seconds}s`
      },
      platform: deployName,
      botName: conf.botName,
      timestamp: Date.now(),
      commands: global.badol.commands.size,
      events: global.badol.events.size
    });
  });

  // Stats endpoint
  app.get('/api/stats', requireAuth, async (req, res) => {
    try {
      res.json({
        bot: {
          name: conf.botName,
          prefix: conf.prefix,
          uptime: process.uptime(),
          platform: deployName
        },
        commands: {
          total: global.badol.commands?.size || 0,
          list: global.badol.commands ? Array.from(global.badol.commands.keys()).map(name => {
            const cmd = global.badol.commands.get(name);
            return {
              name,
              description: cmd.config?.description || 'No description',
              category: cmd.config?.category || 'general',
              role: cmd.config?.role || 0
            };
          }) : []
        },
        events: {
          total: global.badol.events?.size || 0,
          list: global.badol.events ? Array.from(global.badol.events.keys()).map(name => {
            const evt = global.badol.events.get(name);
            return {
              name,
              description: evt.config?.description || 'No description',
              eventType: evt.config?.eventType || 'unknown'
            };
          }) : []
        },
        memory: process.memoryUsage(),
        timestamp: Date.now()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Command management endpoints
  app.post('/api/commands/reload', requireAuth, async (req, res) => {
    try {
      const { name } = req.body;
      const result = await global.reloadCommand(name);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/commands/unload', requireAuth, (req, res) => {
    try {
      const { name } = req.body;
      const result = global.unloadCommand(name);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/commands/install', requireAuth, (req, res) => {
    try {
      const { fileName, code } = req.body;
      const result = global.installCommandFile(fileName, code);
      if (result.success) {
        global.reloadCommand(fileName.replace('.js', ''));
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/commands/delete', requireAuth, (req, res) => {
    try {
      const { fileName } = req.body;
      const result = global.deleteCommandFile(fileName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Event management endpoints
  app.post('/api/events/reload', requireAuth, async (req, res) => {
    try {
      const { name } = req.body;
      const result = await global.reloadEvent(name);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post('/api/events/unload', requireAuth, (req, res) => {
    try {
      const { name } = req.body;
      const result = global.unloadEvent(name);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dashboard', 'index.html'));
  });

  // Initialize Socket.IO if enabled BEFORE starting server
  if (getConf().serverUptime?.socket?.enable || global.config.serverUptime?.socket?.enable) {
    try {
      const socketIO = require('./socketIO');
      await socketIO(server);
      global.log.success('✓ Socket.IO initialized successfully');
    } catch (error) {
      global.log.warn('⚠ Socket.IO initialization failed:', error.message);
    }
  }

  // Start server
  const HOST = '0.0.0.0';
  
  await new Promise((resolve, reject) => {
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        global.log.error(`Port ${PORT} is already in use`);
      } else {
        global.log.error('Server error:', error.message);
      }
      reject(error);
    });

    server.listen(PORT, HOST, () => {
      global.log.separator('═', 'green');
      global.log.success(`✓ Dashboard Server Started`);
      global.log.success(`✓ Platform: ${deployName}`);
      global.log.success(`✓ Port: ${PORT}`);
      if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        global.log.success(`✓ Dashboard URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
      } else {
        global.log.success(`✓ Local URL: http://${HOST}:${PORT}`);
      }
      global.log.separator('═', 'green');
      resolve();
    });
  });

  return server;
}

module.exports = createServer;