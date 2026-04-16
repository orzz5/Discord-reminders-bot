const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client, scheduler) {
        // Add safety check for client and commands
        if (!client || !client.commands) {
            console.error('Client or client.commands is undefined in interactionCreate');
            return;
        }

        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Command Not Found')
                    .setDescription('This command is not available.')
                    .setColor('#e74c3c')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`Error executing command ${interaction.commandName}:`, error);
                
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Command Error')
                    .setDescription('There was an error executing this command. Please try again later.')
                    .setColor('#e74c3c')
                    .setTimestamp();
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
        } else if (interaction.isButton()) {
            const customId = interaction.customId;
            
            if (customId.startsWith('reminder_complete_')) {
                const reminderId = parseInt(customId.replace('reminder_complete_', ''));
                await scheduler.handleReminderInteraction(interaction, reminderId, true);
            } else if (customId.startsWith('reminder_incomplete_')) {
                const reminderId = parseInt(customId.replace('reminder_incomplete_', ''));
                await scheduler.handleReminderInteraction(interaction, reminderId, false);
            }
        } else if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            
            if (command && command.autocomplete) {
                try {
                    await command.autocomplete(interaction, client);
                } catch (error) {
                    console.error(`Error in autocomplete for ${interaction.commandName}:`, error);
                }
            }
        }
    }
};
