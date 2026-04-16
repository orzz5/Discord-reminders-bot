const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { validateReminderSelection } = require('../utils/validation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a specific reminder')
        .addStringOption(option =>
            option.setName('reminder')
                .setDescription('Select the reminder to remove')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async execute(interaction, client) {
        const reminderId = interaction.options.getString('reminder');

        try {
            const userReminders = await db.getReminders(interaction.user.id);
            
            const validation = validateReminderSelection(reminderId, userReminders);
            if (!validation.isValid) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Invalid Selection')
                    .setDescription(validation.errors.join('\n'))
                    .setColor('#e74c3c')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const success = await db.deleteReminder(interaction.user.id, parseInt(reminderId));
            
            if (!success) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Error')
                    .setDescription('Failed to remove the reminder. Please try again.')
                    .setColor('#e74c3c')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const removedReminder = validation.reminder;
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Reminder Removed')
                .setDescription(`Your reminder **"${removedReminder.name}"** has been successfully removed.`)
                .setColor('#2ecc71')
                .addFields(
                    { name: '🕐 Time', value: removedReminder.time, inline: true },
                    { name: '📅 Day', value: removedReminder.day, inline: true },
                    { name: '🆔 ID', value: removedReminder.id.toString(), inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error removing reminder:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to remove reminder. Please try again later.')
                .setColor('#e74c3c')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },

    async autocomplete(interaction, client) {
        try {
            const userReminders = await db.getReminders(interaction.user.id);
            
            const focusedValue = interaction.options.getFocused();
            const choices = userReminders.map(reminder => ({
                name: `${reminder.name} - ${reminder.time} on ${reminder.day}`,
                value: reminder.id.toString()
            }));

            const filtered = choices.filter(choice =>
                choice.name.toLowerCase().includes(focusedValue.toLowerCase())
            );

            await interaction.respond(filtered.slice(0, 25));
        } catch (error) {
            console.error('Error in autocomplete:', error);
        }
    }
};
