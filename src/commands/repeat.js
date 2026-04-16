const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { DAYS } = require('../utils/timeUtils');
const { validateReminderSelection, validateRepeatDays } = require('../utils/validation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('repeat')
        .setDescription('Set repeat days for an existing reminder')
        .addStringOption(option =>
            option.setName('reminder')
                .setDescription('Select the reminder to set repeat days for')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('days')
                .setDescription('Days to repeat (comma-separated, e.g., Monday,Wednesday,Friday)')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const reminderId = interaction.options.getString('reminder');
        const selectedDays = interaction.options.getString('days').split(',');

        try {
            const userReminders = await db.getReminders(interaction.user.id);
            
            const selectionValidation = validateReminderSelection(reminderId, userReminders);
            if (!selectionValidation.isValid) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Invalid Selection')
                    .setDescription(selectionValidation.errors.join('\n'))
                    .setColor('#e74c3c')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const reminder = selectionValidation.reminder;
            
            // Parse comma-separated days and clean them
            const newDays = selectedDays.map(day => day.trim()).filter(day => DAYS.some(d => d.value === day));
            
            if (newDays.length === 0) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('â\u009d Invalid Days')
                    .setDescription('Please provide valid days (e.g., Monday,Wednesday,Friday)')
                    .setColor('#e74c3c')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            
            // Replace all repeat days with the new selection
            const repeatDays = newDays;

            const repeatValidation = validateRepeatDays(repeatDays);
            if (!repeatValidation.isValid) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Invalid Repeat Days')
                    .setDescription(repeatValidation.errors.join('\n'))
                    .setColor('#e74c3c')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const success = await db.updateReminder(interaction.user.id, parseInt(reminderId), { 
                repeat_days: repeatDays.length > 0 ? repeatDays : null 
            });
            
            if (!success) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Error')
                    .setDescription('Failed to update reminder repeat settings. Please try again.')
                    .setColor('#e74c3c')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const action = repeatDays.length > 0 ? 'updated' : 'removed';
            const repeatDaysText = repeatDays.length > 0 ? repeatDays.join(', ') : 'None';
            
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Repeat Settings Updated')
                .setDescription(`Repeat settings for **"${reminder.name}"** have been ${action}.`)
                .setColor('#2ecc71')
                .addFields(
                    { name: '🕐 Time', value: reminder.time, inline: true },
                    { name: '📅 Original Day', value: reminder.day, inline: true },
                    { name: '🔄 Repeat Days', value: repeatDaysText, inline: false },
                    { name: '🆔 ID', value: reminder.id.toString(), inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error setting repeat days:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to update repeat settings. Please try again later.')
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
