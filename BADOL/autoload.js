const fs = require('fs');
const path = require('path');
const Logger = require('../logger/logs');
const c = require('../logger/color');
const { exec } = require('child_process');

const LOCK_NAME = "MOHAMMAD BADOL";
const ALLOWED_AUTHORS = ["MOHAMMAD BADOL", "EMON HAWLADAR"]; // ২ জনই Author হিসাবে Allow

const log = new Logger(global.config?.botInfo?.timezone || global.config?.settings?.timezone || global.config?.timezone || 'Asia/Dhaka');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function installMissingPackage(packageName) {
  return new Promise((resolve, reject) => {
    log.info(`📦 Installing missing package: ${c.yellow(packageName)}...`);
    exec(`npm install ${packageName}`, (error) => {
      if (error) { log.error(`Failed to install ${packageName}: ${error.message}`); reject(error); return; }
      log.success(`✓ Successfully installed ${c.green(packageName)}`); resolve();
    });
  });
}

async function tryInstallAndLoad(filePath) {
  try { delete require.cache[require.resolve(filePath)]; const command = require(filePath); return { success: true, command }; }
  catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      const match = error.message.match(/Cannot find module '([^']+)'/);
      if (match) {
        const missingPackage = match[1];
        try {
          await installMissingPackage(missingPackage);
          delete require.cache[require.resolve(filePath)];
          const command = require(filePath);
          return { success: true, command };
        } catch (installError) {
          return { success: false, error: `Failed to install ${missingPackage}: ${installError.message}` };
        }
      }
    }
    return { success: false, error: error.message };
  }
}

async function loadCommands(showProgress = true) {
  const commandsPath = path.join(__dirname, '..', 'BADOL-CMDS', 'cmds');
  const loadedCommands = []; const errorCommands = [];
  if (!fs.existsSync(commandsPath)) {
    fs.mkdirSync(commandsPath, { recursive: true });
    log.warn('Commands directory not found, created: BADOL-CMDS/cmds');
    return { loaded: [], errors: [] };
  }
  const files = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  const disabledCommands = global.config?.settings?.disabledCommands || global.config?.disabledCommands || [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i]; if (disabledCommands.includes(file)) continue;
    const filePath = path.join(commandsPath, file);
    const result = await tryInstallAndLoad(filePath);
    if (!result.success) { errorCommands.push({ file, error: result.error }); if (showProgress) log.error(`Failed to load command ${c.yellow(file)}: ${result.error}`); continue; }
    try {
      const command = result.command;
      if (!command || typeof command!== 'object') throw new Error('Invalid export');
      if (!command.config) throw new Error('Missing config');
      if (!command.config.name) throw new Error('Missing config.name');

      // ════════ DUAL AUTHOR CHECK ════════
      if (!command.config.author) {
        command.config.author = LOCK_NAME; // না থাকলে Main Lock
      }
      if (!ALLOWED_AUTHORS.includes(command.config.author)) {
        throw new Error(`Author Not Allowed: ${command.config.author} - Only ${ALLOWED_AUTHORS.join(" & ")} allowed`);
      }
      // ════════════════════════════════════

      if (!command.BADOL &&!command.onReply &&!command.onCallback &&!command.onLoad &&!command.onChat) throw new Error('Missing BADOL() function');
      if (global.badol.commands.has(command.config.name)) { errorCommands.push({ file, error: `Duplicate: ${command.config.name}` }); continue; }
      global.badol.commands.set(command.config.name, command);
      if (command.config.aliases) command.config.aliases.forEach(alias => global.badol.commands.set(alias, command));
      loadedCommands.push(file);
      if (command.onLoad && typeof command.onLoad === 'function' && global.bot) { try { await command.onLoad.call(command, { api: global.bot.telegram || global.bot, bot: global.bot }); } catch (e) { log.error(`Error in onLoad for ${command.config.name}:`, e.message); } }
      if (showProgress) { await sleep(50); log.loading('Loading Commands', i + 1, files.length); }
    } catch (error) { errorCommands.push({ file, error: error.message }); if (showProgress) log.error(`Failed to load command ${c.yellow(file)}: ${error.message}`); }
  }
  return { loaded: loadedCommands, errors: errorCommands };
}

async function loadEvents(showProgress = true) {
  const eventsPath = path.join(__dirname, '..', 'BADOL-CMDS', 'events');
  const loadedEvents = []; const errorEvents = [];
  if (!fs.existsSync(eventsPath)) {
    fs.mkdirSync(eventsPath, { recursive: true });
    return { loaded: [], errors: [] };
  }
  const files = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (let i = 0; i < files.length; i++) {
    const file = files[i]; const filePath = path.join(eventsPath, file); const result = await tryInstallAndLoad(filePath);
    if (!result.success) { errorEvents.push({ file, error: result.error }); continue; }
    try {
      const event = result.command;
      if (!event?.config?.name) throw new Error('Missing config');
      if (!event.config.author) event.config.author = LOCK_NAME;
      if (!ALLOWED_AUTHORS.includes(event.config.author)) throw new Error(`Author Not Allowed: ${event.config.author}`);
      if (!event.BADOL) throw new Error('Missing BADOL()');
      global.badol.events.set(event.config.name, event);
      loadedEvents.push(file);
    } catch (error) { errorEvents.push({ file, error: error.message }); }
  }
  return { loaded: loadedEvents, errors: errorEvents };
}

function unloadCommand(commandName) { try { const command = global.badol.commands.get(commandName); if (!command) return { success: false, message: 'Command not found' }; global.badol.commands.delete(commandName); if (command.config.aliases) command.config.aliases.forEach(alias => global.badol.commands.delete(alias)); return { success: true, message: `Command ${commandName} unloaded` }; } catch (error) { return { success: false, message: error.message }; } }
function unloadEvent(eventName) { try { global.badol.events.delete(eventName); return { success: true, message: `Event ${eventName} unloaded` }; } catch (e) { return { success: false, message: e.message }; } }

async function reloadCommand(commandName) {
  try {
    const commandsPath = path.join(__dirname, '..', 'BADOL-CMDS', 'cmds');
    const files = fs.readdirSync(commandsPath); const commandFile = files.find(f => f.replace('.js', '') === commandName); if (!commandFile) return { success: false, message: 'File not found' };
    delete require.cache[require.resolve(path.join(commandsPath, commandFile))]; const command = require(path.join(commandsPath, commandFile));
    if (!command?.config?.name) return { success: false, message: 'Invalid structure' };
    if (!command.config.author) command.config.author = LOCK_NAME;
    if (!ALLOWED_AUTHORS.includes(command.config.author)) return { success: false, message: `Author ${command.config.author} not allowed` };
    global.badol.commands.set(command.config.name, command); if (command.config.aliases) command.config.aliases.forEach(alias => global.badol.commands.set(alias, command)); return { success: true, message: `Command ${commandName} reloaded` };
  } catch (error) { return { success: false, message: error.message }; }
}

async function reloadEvent(eventName) {
  try {
    const eventsPath = path.join(__dirname, '..', 'BADOL-CMDS', 'events');
    const files = fs.readdirSync(eventsPath); const eventFile = files.find(f => f.replace('.js', '') === eventName); if (!eventFile) return { success: false, message: 'Not found' };
    delete require.cache[require.resolve(path.join(eventsPath, eventFile))]; const event = require(path.join(eventsPath, eventFile)); if (!event?.config) return { success: false, message: 'Invalid' }; if (!event.config.author) event.config.author = LOCK_NAME; if (!ALLOWED_AUTHORS.includes(event.config.author)) return { success: false, message: `Author not allowed` }; global.badol.events.set(event.config.name, event); return { success: true, message: `Event ${eventName} reloaded` };
  } catch (error) { return { success: false, message: error.message }; }
}

function deleteCommandFile(fileName) { try { const p = path.join(__dirname, '..', 'BADOL-CMDS', 'cmds', fileName); if (!fs.existsSync(p)) return { success: false, message: 'File not found' }; fs.unlinkSync(p); global.badol.commands.delete(fileName.replace('.js', '')); return { success: true, message: `Deleted ${fileName}` }; } catch (e) { return { success: false, message: e.message }; } }
function deleteEventFile(fileName) { try { const p = path.join(__dirname, '..', 'BADOL-CMDS', 'events', fileName); if (!fs.existsSync(p)) return { success: false, message: 'Not found' }; fs.unlinkSync(p); global.badol.events.delete(fileName.replace('.js', '')); return { success: true, message: `Deleted ${fileName}` }; } catch (e) { return { success: false, message: e.message }; } }

function installCommandFile(fileName, code) {
  try {
    const authorMatch = code.match(/author:\s*["']([^"']+)["']/);
    if (!authorMatch) {
      code = code.replace(/config:\s*{/, `config: {\n author: "${LOCK_NAME}",`);
    } else {
      const givenAuthor = authorMatch[1];
      if (!ALLOWED_AUTHORS.includes(givenAuthor)) {
        return { success: false, message: `Author ${givenAuthor} not allowed. Only ${ALLOWED_AUTHORS.join(" & ")} allowed` };
      }
    }
    const p = path.join(__dirname, '..', 'BADOL-CMDS', 'cmds', fileName); fs.writeFileSync(p, code); return { success: true, message: `Installed ${fileName}` };
  } catch (e) { return { success: false, message: e.message }; }
}

function installEventFile(fileName, code) {
  try {
    const authorMatch = code.match(/author:\s*["']([^"']+)["']/);
    if (!authorMatch) code = code.replace(/config:\s*{/, `config: {\n author: "${LOCK_NAME}",`);
    else {
      const givenAuthor = authorMatch[1];
      if (!ALLOWED_AUTHORS.includes(givenAuthor)) {
        return { success: false, message: `Author ${givenAuthor} not allowed` };
      }
    }
    const p = path.join(__dirname, '..', 'BADOL-CMDS', 'events', fileName);
    fs.writeFileSync(p, code);
    return { success: true, message: `Installed ${fileName}` };
  } catch (e) { return { success: false, message: e.message }; }
}

function saveConfig() { try { fs.writeFileSync(path.join(__dirname, '..', 'config.json'), JSON.stringify(global.config, null, 2)); } catch {} }
function restartProject() { const { exec } = require('child_process'); exec('pm2 restart index.js'); }
function evalCode(code) { try { return eval(code); } catch (e) { return `Error: ${e.message}`; } }

module.exports = { loadCommands, loadEvents, unloadCommand, unloadEvent, reloadCommand, reloadEvent, deleteCommandFile, deleteEventFile, installCommandFile, installEventFile, restartProject, evalCode };