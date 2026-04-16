const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client, scheduler) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        console.log(`🤖 Bot is ready in ${client.guilds.cache.size} servers`);
        
        await scheduler.reloadAllReminders();
        
        const statusMessages = [
            'Managing reminders ⏰',
            'Helping users stay organized 📋',
            'Never forget anything again 💭',
            'Your personal reminder assistant 🤖'
        ];
        
        let statusIndex = 0;
        
        client.user.setActivity(statusMessages[0], { type: 'WATCHING' });
        
        setInterval(() => {
            statusIndex = (statusIndex + 1) % statusMessages.length;
            client.user.setActivity(statusMessages[statusIndex], { type: 'WATCHING' });
        }, 30000);
        
        console.log('📊 Bot status rotation started');
    }
};
