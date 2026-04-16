const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { TIMEZONES, DAYS, getTimeUntilReminder, formatReminderTime, getReminderTimestamp } = require('../utils/timeUtils');
const { validateReminderInput, sanitizeInput } = require('../utils/validation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminder')
        .setDescription('Create a new reminder')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Description/name for your reminder')
                .setRequired(true)
                .setMaxLength(100)
        )
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Time in HH:MM format (e.g., 14:30)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('day')
                .setDescription('Day of the week')
                .setRequired(true)
                .addChoices(
                    ...DAYS.map(day => ({ name: day.name, value: day.value }))
                )
        )
        .addStringOption(option =>
            option.setName('timezone')
                .setDescription('Your timezone')
                .setRequired(true)
                .addChoices(
                    ...TIMEZONES.map(tz => ({ name: tz.name, value: tz.value }))
                )
        )
        .addBooleanOption(option =>
            option.setName('ping')
                .setDescription('Should the bot ping you when the reminder triggers?')
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const name = sanitizeInput(interaction.options.getString('name'));
        const time = interaction.options.getString('time');
        const day = interaction.options.getString('day');
        const timezone = interaction.options.getString('timezone');
        const ping = interaction.options.getBoolean('ping');

        const validation = validateReminderInput(name, time, day, timezone, ping);
        if (!validation.isValid) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Invalid Input')
                .setDescription(validation.errors.join('\n'))
                .setColor('#e74c3c')
                .setTimestamp();
            
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            const isDuplicate = await db.checkDuplicateReminder(name, time, day, timezone, ping, null);
            if (isDuplicate) {
                const duplicateEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Duplicate Reminder')
                    .setDescription('A reminder with exactly the same details already exists.')
                    .setColor('#f39c12')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [duplicateEmbed], ephemeral: true });
            }

            const reminderId = await db.createReminder(interaction.user.id, name, time, day, timezone, ping);
            
            const timeUntil = getTimeUntilReminder(day, time, timezone);
            const formattedTime = formatReminderTime(time, timezone);
            const timestamp = getReminderTimestamp(day, time, timezone);

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Reminder Created')
                .setDescription(`Your reminder **"${name}"** has been successfully created!`)
                .setColor('#2ecc71')
                .addFields(
                    { name: '⏰ Time', value: `${formattedTime} (${timezone})`, inline: true },
                    { name: '📅 Day', value: day, inline: true },
                    { name: '🔔 Ping', value: ping ? 'Yes' : 'No', inline: true },
                    { name: '🕰️ Reminder Time', value: timestamp, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: `Reminder ID: ${reminderId}` });

            // Try to send DM first, fallback to channel if DM fails
            try {
                const user = await interaction.client.users.fetch(interaction.user.id);
                await user.send({ embeds: [successEmbed] });
                
                // Send brief confirmation in channel
                const channelEmbed = new EmbedBuilder()
                    .setTitle('✅ Reminder Created')
                    .setDescription(`Check your DMs for reminder details!`)
                    .setColor('#3498db')
                    .setTimestamp();
                
                await interaction.reply({ embeds: [channelEmbed] });
            } catch (dmError) {
                console.log('Could not send DM, sending to channel:', dmError.message);
                await interaction.reply({ embeds: [successEmbed] });
            }

        } catch (error) {
            console.error('Error creating reminder:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to create reminder. Please try again later.')
                .setColor('#e74c3c')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
