const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { formatReminderTime } = require('../utils/timeUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('Show all your active reminders'),

    async execute(interaction, client) {
        try {
            const reminders = await db.getReminders(interaction.user.id);
            
            if (reminders.length === 0) {
                const noRemindersEmbed = new EmbedBuilder()
                    .setTitle('📋 No Active Reminders')
                    .setDescription('You don\'t have any active reminders. Use `/reminder` to create one!')
                    .setColor('#3498db')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [noRemindersEmbed] });
            }

            const listEmbed = new EmbedBuilder()
                .setTitle('📋 Your Active Reminders')
                .setDescription(`You have **${reminders.length}** active reminder${reminders.length !== 1 ? 's' : ''}`)
                .setColor('#3498db')
                .setTimestamp();

            reminders.forEach((reminder, index) => {
                const formattedTime = formatReminderTime(reminder.time, reminder.timezone);
                const repeatInfo = reminder.repeat_days && reminder.repeat_days.length > 0 
                    ? `\n🔄 Repeats: ${reminder.repeat_days.join(', ')}` 
                    : '';
                
                listEmbed.addFields({
                    name: `${index + 1}. ${reminder.name}`,
                    value: `🕐 ${formattedTime} (${reminder.timezone})\n📅 ${reminder.day}${repeatInfo}\n🔔 Ping: ${reminder.ping ? 'Yes' : 'No'}\n🆔 ID: ${reminder.id}`,
                    inline: false
                });
            });

            if (listEmbed.data.fields.length > 25) {
                const chunks = [];
                let currentChunk = new EmbedBuilder()
                    .setTitle('📋 Your Active Reminders')
                    .setDescription(`You have **${reminders.length}** active reminders`)
                    .setColor('#3498db')
                    .setTimestamp();

                for (let i = 0; i < listEmbed.data.fields.length; i++) {
                    if (currentChunk.data.fields.length >= 10) {
                        chunks.push(currentChunk);
                        currentChunk = new EmbedBuilder()
                            .setTitle('📋 Your Active Reminders (Continued)')
                            .setColor('#3498db')
                            .setTimestamp();
                    }
                    currentChunk.addFields(listEmbed.data.fields[i]);
                }
                
                if (currentChunk.data.fields.length > 0) {
                    chunks.push(currentChunk);
                }

                await interaction.reply({ embeds: chunks });
            } else {
                await interaction.reply({ embeds: [listEmbed] });
            }

        } catch (error) {
            console.error('Error listing reminders:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to retrieve reminders. Please try again later.')
                .setColor('#e74c3c')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
