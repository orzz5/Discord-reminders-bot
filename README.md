<<<<<<< HEAD
# Discord Reminder Bot

A professional Discord reminder bot with advanced scheduling, statistics tracking, and streak management.

## Features

### Core Commands
- **/reminder** - Create new reminders with customizable time, day, timezone, and ping settings
- **/list** - View all your active reminders
- **/remove** - Remove specific reminders with autocomplete selection
- **/clean** - Remove all your reminders at once
- **/edit** - Modify existing reminder time, day, or timezone
- **/repeat** - Set repeat days for reminders
- **/stats** - View completion statistics and streak information

### Advanced Features
- ⏰ **Smart Scheduling** - Precise time validation and timezone support
- 📊 **Statistics Tracking** - Track completed vs missed reminders
- 🔥 **Streak System** - Build and maintain completion streaks
- 🌍 **Multi-Timezone Support** - 20+ timezone options
- 🔄 **Repeat Functionality** - Set reminders to repeat on specific days
- 💬 **Interactive Buttons** - Mark reminders as finished or not finished
- 📱 **DM Delivery** - Reminders sent via direct message with fallback options
- ✅ **Input Validation** - Comprehensive error handling and validation

## Installation

### Prerequisites
- Node.js 16.0.0 or higher
- A Discord Bot Application
- SQLite3 (automatically installed with dependencies)

### Setup Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/orzz/discord-reminder-bot.git
   cd discord-reminder-bot
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Bot**
   - Copy `config.json` and fill in your bot credentials:
     - `token`: Your Discord bot token
     - `clientId`: Your bot's application ID
     - `guildId`: Your server ID (optional, for faster command deployment)

4. **Invite Bot to Server**
   - Go to Discord Developer Portal
   - Create bot application or use existing one
   - Generate invite link with necessary permissions:
     - Send Messages
     - Use Slash Commands
     - Read Message History
     - Embed Links

5. **Start the Bot**
   ```bash
   npm start
   ```

## Usage Guide

### Creating Reminders
Use `/reminder` with the following options:
- **name**: Description of your reminder (max 100 characters)
- **time**: Time in HH:MM format (24-hour format, e.g., 14:30)
- **day**: Day of the week (Monday through Sunday)
- **timezone**: Your timezone from the dropdown menu
- **ping**: Whether to ping you when reminder triggers (Yes/No)

### Managing Reminders
- **View all reminders**: `/list`
- **Remove specific reminder**: `/remove` (select from autocomplete)
- **Remove all reminders**: `/clean` (with confirmation)
- **Edit reminder**: `/edit` (select reminder and modify time/day/timezone)
- **Set repeat days**: `/repeat` (select reminder and choose repeat days)

### Statistics
- **View stats**: `/stats` shows:
  - Total completed vs missed reminders
  - Current and longest streak
  - Completion rate percentage
  - Achievement badges based on performance

## Project Structure

```
discord-reminder-bot/
├── src/
│   ├── commands/          # Slash command implementations
│   │   ├── reminder.js
│   │   ├── list.js
│   │   ├── remove.js
│   │   ├── clean.js
│   │   ├── edit.js
│   │   ├── repeat.js
│   │   └── stats.js
│   ├── events/           # Discord event handlers
│   │   ├── ready.js
│   │   └── interactionCreate.js
│   ├── utils/            # Utility functions
│   │   ├── timeUtils.js
│   │   ├── scheduler.js
│   │   └── validation.js
│   └── database/         # Database logic
│       └── db.js
├── index.js              # Main bot entry point
├── config.json           # Bot configuration
├── package.json          # Dependencies and scripts
├── .gitignore           # Git ignore rules
├── .env.example         # Environment variables template
└── README.md            # This file
```

## Configuration

### Bot Permissions Required
- Send Messages
- Use Slash Commands
- Read Message History
- Embed Links
- Add Reactions

### Environment Variables
You can use environment variables instead of config.json:
```bash
cp .env.example .env
# Edit .env with your credentials
```

## Database

The bot uses SQLite for data persistence:
- **reminders.db** - Main database file (created automatically)
- Tables: `reminders`, `reminder_stats`, `user_streaks`
- Automatic migration on startup
- No manual database setup required

## Timezones Supported

- UTC
- Eastern Time (ET)
- Central Time (CT)
- Mountain Time (MT)
- Pacific Time (PT)
- London (GMT/BST)
- Paris (CET/CEST)
- Berlin (CET/CEST)
- Madrid (CET/CEST)
- Rome (CET/CEST)
- Moscow (MSK)
- Tokyo (JST)
- Beijing (CST)
- Hong Kong (HKT)
- Singapore (SGT)
- Sydney (AEST/AEDT)
- Melbourne (AEST/AEDT)
- Auckland (NZST/NZDT)
- Dubai (GST)
- Mumbai (IST)

## Error Handling

The bot includes comprehensive error handling:
- Invalid time format detection
- Past time validation
- Duplicate reminder prevention
- Database error recovery
- DM fallback messaging
- Button interaction validation

## Contributing

This bot was developed by **orzz** (Discord: oroprogamer24)

### Developer
- **GitHub**: orzz
- **Discord**: [oroprogamer24](https://discord.com/users/667791939453583373)
- **Discord Profile**: https://discord.com/users/667791939453583373

## License

This project is licensed under the MIT License.

## Support

For support or questions:
- Contact the developer on Discord: oroprogamer24
- Create an issue in the GitHub repository
- Check the usage.txt file for detailed command examples

## Changelog

### Version 1.0.0
- Initial release with all core features
- Complete reminder management system
- Statistics and streak tracking
- Multi-timezone support
- Interactive button system
- Comprehensive error handling
=======
# Discord-reminders-bot
Discord reminder bot with /reminder, /list, /remove, /stats commands. Create scheduled reminders, track completion stats, build streaks, and manage tasks with timezone support and repeat options.
>>>>>>> c112e85b934447f90f2a577a2663f12f6c56bbb5
