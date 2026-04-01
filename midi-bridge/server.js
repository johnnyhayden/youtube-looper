#!/usr/bin/env node

const easymidi = require('easymidi');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const WS_PORT = 3001;
const CONFIG_DIR = path.join(os.homedir(), '.youtube-looper');
const CONFIG_FILE = path.join(CONFIG_DIR, 'midi-config.json');

// Default MIDI configuration
const defaultConfig = {
  mappings: {
    1: 'play_pause',
    2: 'toggle_loop',
    3: 'next_preset',
    4: 'prev_preset',
    5: 'speed_down',
    6: 'speed_up',
    7: 'set_speed',
  },
};

// Load configuration
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading config:', err.message);
  }

  // Create default config
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    console.log(`Created default config at ${CONFIG_FILE}`);
  } catch (err) {
    console.error('Error creating default config:', err.message);
  }

  return defaultConfig;
}

// List available MIDI inputs
function listMidiInputs() {
  const inputs = easymidi.getInputs();
  console.log('\n📡 Available MIDI inputs:');
  if (inputs.length === 0) {
    console.log('   No MIDI devices found.');
    console.log('   Make sure your Helix Floor is connected via USB.');
  } else {
    inputs.forEach((input, index) => {
      console.log(`   ${index + 1}. ${input}`);
    });
  }
  return inputs;
}

// Find Helix device
function findHelixInput(inputs) {
  // Look for Helix in device names (case insensitive)
  const helixInput = inputs.find(
    (name) =>
      name.toLowerCase().includes('helix') ||
      name.toLowerCase().includes('line 6')
  );
  return helixInput;
}

// Main server
function startServer() {
  console.log('🎸 YouTube Looper MIDI Bridge');
  console.log('============================\n');

  const config = loadConfig();
  console.log(`📁 Config file: ${CONFIG_FILE}`);
  console.log('\n🎹 MIDI CC Mappings:');
  Object.entries(config.mappings).forEach(([cc, action]) => {
    console.log(`   CC ${cc} → ${action}`);
  });

  // List MIDI inputs
  const inputs = listMidiInputs();

  // Create WebSocket server
  const wss = new WebSocket.Server({ port: WS_PORT });
  console.log(`\n🌐 WebSocket server listening on ws://localhost:${WS_PORT}`);

  // Track connected clients
  const clients = new Set();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`✅ Browser connected (${clients.size} client(s))`);

    // Send current config to client
    ws.send(JSON.stringify({ type: 'config', config }));

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`❌ Browser disconnected (${clients.size} client(s))`);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      clients.delete(ws);
    });
  });

  // Broadcast to all clients
  function broadcast(message) {
    const data = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // Try to connect to MIDI device
  let midiInput = null;

  function connectMidi() {
    const currentInputs = easymidi.getInputs();

    if (currentInputs.length === 0) {
      console.log('\n⏳ Waiting for MIDI device...');
      return false;
    }

    // Try to find Helix first, otherwise use first available
    let inputName = findHelixInput(currentInputs);
    if (!inputName && currentInputs.length > 0) {
      inputName = currentInputs[0];
    }

    if (!inputName) {
      return false;
    }

    try {
      midiInput = new easymidi.Input(inputName);
      console.log(`\n🎹 Connected to MIDI device: ${inputName}`);

      // Listen for Control Change messages
      midiInput.on('cc', (msg) => {
        console.log(`🎛️  CC ${msg.controller}: ${msg.value} (ch ${msg.channel})`);

        const action = config.mappings[msg.controller];
        if (action) {
          console.log(`   → Action: ${action}`);
          broadcast({
            type: 'midi',
            action,
            controller: msg.controller,
            value: msg.value,
            channel: msg.channel,
          });
        }
      });

      // Listen for Note messages (optional - for footswitches that send notes)
      midiInput.on('noteon', (msg) => {
        console.log(`🎵 Note ON: ${msg.note} vel ${msg.velocity} (ch ${msg.channel})`);
      });

      midiInput.on('noteoff', (msg) => {
        console.log(`🎵 Note OFF: ${msg.note} (ch ${msg.channel})`);
      });

      return true;
    } catch (err) {
      console.error(`Error connecting to MIDI device: ${err.message}`);
      return false;
    }
  }

  // Initial connection attempt
  if (!connectMidi()) {
    // Retry every 5 seconds
    const retryInterval = setInterval(() => {
      if (connectMidi()) {
        clearInterval(retryInterval);
      }
    }, 5000);
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down MIDI bridge...');
    if (midiInput) {
      midiInput.close();
    }
    wss.close();
    process.exit(0);
  });

  console.log('\n✨ Ready! Press Ctrl+C to stop.\n');
}

// Run the server
startServer();





