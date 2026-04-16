const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { TIMEZONES, DAYS } = require('../utils/timeUtils');
const { validateReminderSelection, validateEditInput, sanitizeInput } = require('../utils/validation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit')
        .setDescription('Edit an existing reminder')
        .addStringOption(option =>
            option.setName('reminder')
                .setDescription('Select the reminder to edit')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('time')
                .setDescription('New time in HH:MM format (e.g., 14:30)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('day')
                .setDescription('New day of the week')
                .setRequired(false)
                .addChoices(
                    ...DAYS.map(day => ({ name: day.name, value: day.value }))
                )
        )
        .addStringOption(option =>
            option.setName('timezone')
                .setDescription('New timezone')
                .setRequired(false)
                .addChoices(
                    ...TIMEZONES.map(tz => ({ name: tz.name, value: tz.value }))
                )
        ),

    async execute(interaction, client) {
        const reminderId = interaction.options.getString('reminder');
        const time = interaction.options.getString('time');
        const day = interaction.options.getString('day');
        const timezone = interaction.options.getString('timezone');

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

            const updates = {};
            if (time !== null) updates.time = time;
            if (day !== null) updates.day = day;
            if (timezone !== null) updates.timezone = timezone;

            if (Object.keys(updates).length === 0) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ No Changes')
                    .setDescription('Please specify at least one field to edit.')
                    .setColor('#e74c3c')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const editValidation = validateEditInput(updates);
            if (!editValidation.isValid) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Invalid Input')
                    .setDescription(editValidation.errors.join('\n'))
                    .setColor('#e74c3c')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const success = await db.updateReminder(interaction.user.id, parseInt(reminderId), updates);
            
            if (!success) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Error')
                    .setDescription('Failed to update the reminder. Please try again.')
                    .setColor('#e74c3c')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            const updatedReminder = await db.getReminder(interaction.user.id, parseInt(reminderId));
            
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Reminder Updated')
                .setDescription(`Your reminder **"${updatedReminder.name}"** has been successfully updated.`)
                .setColor('#2ecc71')
                .addFields(
                    { name: '🕐 Time', value: updatedReminder.time, inline: true },
                    { name: '📅 Day', value: updatedReminder.day, inline: true },
                    { name: '🌍 Timezone', value: updatedReminder.timezone, inline: true },
                    { name: '🆔 ID', value: updatedReminder.id.toString(), inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error editing reminder:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to edit reminder. Please try again later.')
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
