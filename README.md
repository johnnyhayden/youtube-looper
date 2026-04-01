# YouTube Looper - Guitar Practice Tool

A specialized YouTube video looper designed for guitar players learning solos and licks. Features precise loop control, fine-grained speed adjustment (25%-200% in 5% increments), keyboard shortcuts, and MIDI control for hands-free operation with your Helix Floor.

## Tech Stack

- **Next.js 16** (React 19, TypeScript)
- **Tailwind CSS 4** with Radix UI components
- **YouTube IFrame API** for embedded playback
- **MIDI Bridge** — standalone Node.js server using `easymidi` + WebSocket

## Features

- **Visual Timeline**: Click and drag to set loop regions, or tap to mark points while playing
- **Fine-Grained Speed Control**: 25% to 200% in 5% increments
- **Per-Video Presets**: Save and recall your favorite practice loops (e.g., "Intro Riff - 50%", "Full Solo - 75%")
- **Video History**: Quick access to your 10 most recently practiced videos
- **Keyboard Shortcuts**: Full control without leaving your guitar
- **MIDI Control**: Use your Helix Floor footswitches to control playback

## Prerequisites

- Node.js >= 18.0.0
- npm

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Start the MIDI Bridge (Optional)

If you want to use MIDI control with your Helix Floor:

```bash
cd midi-bridge
npm install
npm start
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `[` | Set loop start at current time |
| `]` | Set loop end at current time |
| `L` | Toggle loop on/off |
| `←` / `→` | Seek -5s / +5s |
| `Shift + ←` / `→` | Seek -1s / +1s |
| `-` / `+` | Decrease / Increase speed by 5% |
| `1` - `9` | Load preset 1-9 |
| `S` | Save current loop as preset |
| `R` | Reset (full video, 100% speed) |

## MIDI Setup with Helix Floor

The MIDI bridge allows you to control the looper with your Helix Floor footswitches. This is perfect for hands-free control while practicing.

### Step 1: Connect Your Helix

Connect your Helix Floor to your computer via USB. The Helix will appear as a MIDI device.

### Step 2: Configure Helix Command Center

On your Helix Floor, you need to assign footswitches to send MIDI CC messages:

1. Press **MENU** on your Helix
2. Navigate to **Command Center**
3. Select a footswitch you want to use
4. Set **Command** to **MIDI CC**
5. Set **MIDI Ch** to **1** (or any channel)
6. Set **CC#** according to the mapping below
7. Set **Value** to **127** (or use an expression pedal for speed control)

### Default MIDI CC Mappings

| CC Number | Action |
|-----------|--------|
| CC 1 | Play / Pause |
| CC 2 | Toggle Loop |
| CC 3 | Next Preset |
| CC 4 | Previous Preset |
| CC 5 | Speed Down 5% |
| CC 6 | Speed Up 5% |
| CC 7 | Set Speed (0-127 maps to 25%-200%) |

### Step 3: Start the MIDI Bridge

```bash
cd midi-bridge
npm install
npm start
```

You should see output like:

```
🎸 YouTube Looper MIDI Bridge
============================

📁 Config file: /Users/you/.youtube-looper/midi-config.json

🎹 MIDI CC Mappings:
   CC 1 → play_pause
   CC 2 → toggle_loop
   ...

📡 Available MIDI inputs:
   1. Helix Floor

🌐 WebSocket server listening on ws://localhost:3001

🎹 Connected to MIDI device: Helix Floor

✨ Ready! Press Ctrl+C to stop.
```

### Step 4: Customize MIDI Mappings

Edit `~/.youtube-looper/midi-config.json` to customize the CC mappings:

```json
{
  "mappings": {
    "1": "play_pause",
    "2": "toggle_loop",
    "3": "next_preset",
    "4": "prev_preset",
    "5": "speed_down",
    "6": "speed_up",
    "7": "set_speed"
  }
}
```

Available actions:
- `play_pause` - Toggle play/pause
- `toggle_loop` - Toggle loop on/off
- `next_preset` - Load the next saved preset
- `prev_preset` - Load the previous saved preset
- `speed_down` - Decrease speed by 5%
- `speed_up` - Increase speed by 5%
- `set_speed` - Set speed based on CC value (0-127 → 25%-200%)

### Example Helix Setup

Here's a suggested footswitch layout:

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   FS1       │   FS2       │   FS3       │   FS4       │
│  Play/Pause │  Toggle Loop│  Prev Preset│  Next Preset│
│   CC 1      │   CC 2      │   CC 4      │   CC 3      │
└─────────────┴─────────────┴─────────────┴─────────────┘
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   FS5       │   FS6       │   EXP 1     │   EXP 2     │
│  Speed Down │  Speed Up   │  (Guitar)   │  Speed Ctrl │
│   CC 5      │   CC 6      │             │   CC 7      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**Tip**: Use Expression Pedal 2 for speed control - heel down = 25%, toe down = 200%. This lets you smoothly adjust speed while playing!

## Data Storage

All your data is stored locally in `~/.youtube-looper/`:

- `videos.json` - Your saved videos and presets
- `midi-config.json` - Your MIDI CC mappings

## Workflow Tips

### Learning a New Solo

1. **First Pass**: Watch at 100% to get the overall feel
2. **Break It Down**: Set loop points around difficult sections
3. **Slow It Down**: Start at 50% or lower
4. **Gradual Speed Up**: Increase by 5-10% as you nail each section
5. **Save Presets**: Save your practice spots for quick recall

### Suggested Presets

For a typical guitar solo, consider saving these presets:

1. "Full Solo - 50%" - The entire solo at half speed
2. "Full Solo - 75%" - The entire solo at 3/4 speed
3. "Intro Lick - 40%" - The opening phrase, very slow
4. "Fast Run - 35%" - That tricky fast section
5. "Ending - 60%" - The finale

## Troubleshooting

### MIDI Device Not Found

1. Make sure your Helix is connected via USB
2. Check that no other software (DAW, etc.) is using the MIDI device
3. Try unplugging and reconnecting the USB cable
4. Restart the MIDI bridge

### Loop Not Working

1. Make sure both loop start and end are set (green markers on timeline)
2. Make sure loop end is after loop start
3. Click the "Enable Loop" button or press `L`

### Video Not Loading

1. Make sure you're using a valid YouTube URL
2. Try using just the video ID (the 11-character code)
3. Some videos may have embedding disabled by the uploader

## Project Structure

```
youtube-looper/
├── app/                  # Next.js app router
│   ├── api/              # REST API routes (presets, videos, history)
│   └── page.tsx          # Main page component
├── components/           # React components (player, timeline, controls)
│   └── ui/               # Reusable Radix-based UI primitives
├── lib/                  # State management, storage, types, MIDI client
└── midi-bridge/          # Standalone MIDI-to-WebSocket bridge server
```

## Development

```bash
# Run the Next.js app in development mode
npm run dev

# Run the MIDI bridge
cd midi-bridge && npm start

# Build for production
npm run build
npm start
```

## License

MIT - Use freely for your guitar practice sessions!
