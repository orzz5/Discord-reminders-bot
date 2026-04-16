const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ReminderScheduler = require('./src/utils/scheduler');

const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
    ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'src/commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

const eventsPath = path.join(__dirname, 'src/events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

const scheduler = new ReminderScheduler(client);

// Attach scheduler to client for easy access
client.scheduler = scheduler;

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client, scheduler));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client, scheduler));
    }
    
    console.log(`✅ Loaded event: ${event.name}`);
}

async function deployCommands() {
    const commands = [];
    
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if ('data' in command) {
            commands.push(command.data.toJSON());
        }
    }

    const rest = new REST({ version: '10' }).setToken(config.token);

    try {
        console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

        if (config.guildId && config.guildId !== 'YOUR_GUILD_ID_HERE') {
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${commands.length} guild application (/) commands.`);
        } else {
            await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${commands.length} global application (/) commands.`);
        }
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
}

client.login(config.token)
    .then(() => {
        console.log('🚀 Bot is starting...');
        deployCommands();
    })
    .catch(error => {
        console.error('❌ Failed to login:', error);
        process.exit(1);
    });

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    client.destroy();
    process.exit(0);
});
