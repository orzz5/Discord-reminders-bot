const cron = require('node-cron');
const db = require('../database/db');
const { shouldExecuteReminder } = require('./timeUtils');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class ReminderScheduler {
    constructor(client) {
        this.client = client;
        this.activeReminders = new Map();
        this.processedReminders = new Set();
        this.init();
    }

    init() {
        cron.schedule('* * * * *', async () => {
            await this.checkReminders();
        });
    }

    async checkReminders() {
        try {
            const reminders = await db.getAllActiveReminders();
            const currentTime = new Date();

            for (const reminder of reminders) {
                const reminderKey = `${reminder.id}-${currentTime.getMinutes()}-${currentTime.getHours()}`;
                
                if (this.processedReminders.has(reminderKey)) {
                    continue;
                }

                if (shouldExecuteReminder(reminder, currentTime)) {
                    await this.executeReminder(reminder);
                    this.processedReminders.add(reminderKey);
                    
                    setTimeout(() => {
                        this.processedReminders.delete(reminderKey);
                    }, 60000);
                }
            }
        } catch (error) {
            console.error('Error checking reminders:', error);
        }
    }

    async executeReminder(reminder) {
        try {
            const user = await this.client.users.fetch(reminder.user_id);
            
            const embed = new EmbedBuilder()
                .setTitle('⏰ Reminder')
                .setDescription(`**${reminder.name}**`)
                .setColor('#3498db')
                .addFields(
                    { name: 'Scheduled Time', value: reminder.time, inline: true },
                    { name: 'Day', value: reminder.day, inline: true },
                    { name: 'Timezone', value: reminder.timezone, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Please mark this reminder as completed or not completed' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`reminder_complete_${reminder.id}`)
                        .setLabel('✅ Finished')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`reminder_incomplete_${reminder.id}`)
                        .setLabel('❌ Not finished')
                        .setStyle(ButtonStyle.Danger)
                );

            const messageContent = reminder.ping ? `<@${reminder.user_id}> ` : '';

            try {
                const dmMessage = await user.send({
                    content: messageContent,
                    embeds: [embed],
                    components: [row]
                });

                this.activeReminders.set(reminder.id, {
                    messageId: dmMessage.id,
                    channelId: dmMessage.channelId,
                    userId: reminder.user_id,
                    reminderId: reminder.id,
                    timestamp: Date.now()
                });

                setTimeout(() => {
                    this.disableReminderButtons(reminder.id);
                }, 24 * 60 * 60 * 1000);

            } catch (dmError) {
                console.log(`Failed to send DM to user ${reminder.user_id}, trying fallback...`);
                
                const guild = this.client.guilds.cache.first();
                if (guild) {
                    try {
                        const member = await guild.members.fetch(reminder.user_id);
                        const channel = member.communicationDisabledUntil ? 
                            await member.createDM() : 
                            await guild.systemChannel;
                        
                        if (channel) {
                            await channel.send({
                                content: `<@${reminder.user_id}> I couldn't send you a DM, so here's your reminder:`,
                                embeds: [embed],
                                components: [row]
                            });
                        }
                    } catch (fallbackError) {
                        console.error(`Failed to send fallback message for reminder ${reminder.id}:`, fallbackError);
                    }
                }
            }

        } catch (error) {
            console.error(`Error executing reminder ${reminder.id}:`, error);
        }
    }

    async disableReminderButtons(reminderId) {
        const reminderData = this.activeReminders.get(reminderId);
        if (!reminderData) return;

        try {
            const user = await this.client.users.fetch(reminderData.userId);
            const dmChannel = await user.createDM();
            
            const message = await dmChannel.messages.fetch(reminderData.messageId);
            if (message) {
                const disabledRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`reminder_complete_${reminderId}`)
                            .setLabel('✅ Finished')
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId(`reminder_incomplete_${reminderId}`)
                            .setLabel('❌ Not finished')
                            .setStyle(ButtonStyle.Danger)
                            .setDisabled(true)
                    );

                await message.edit({ components: [disabledRow] });
            }
        } catch (error) {
            console.error(`Error disabling buttons for reminder ${reminderId}:`, error);
        }

        this.activeReminders.delete(reminderId);
    }

    async handleReminderInteraction(interaction, reminderId, completed) {
        const reminderData = this.activeReminders.get(reminderId);
        
        if (!reminderData) {
            await interaction.reply({
                content: 'This reminder is no longer active.',
                ephemeral: true
            });
            return;
        }

        if (interaction.user.id !== reminderData.userId) {
            await interaction.reply({
                content: 'You can only interact with your own reminders.',
                ephemeral: true
            });
            return;
        }

        try {
            await db.recordReminderCompletion(reminderData.userId, reminderId, completed);
            await db.updateStreak(reminderData.userId, completed);

            // Check if reminder has repeat days
            const reminder = await db.getReminderById(reminderId);
            
            let responseMessage = `Your reminder has been marked as ${completed ? 'completed' : 'not completed'}.`;
            
            if (reminder && reminder.repeat_days && reminder.repeat_days.length > 0) {
                // Reminder has repeat days, keep it active
                responseMessage += `\n\nThis reminder will repeat on: ${reminder.repeat_days.join(', ')}`;
            } else {
                // No repeat days, remove the reminder
                await db.updateReminderStatus(reminderId, false);
                responseMessage += '\n\nThis reminder has been completed and removed.';
            }

            const responseEmbed = new EmbedBuilder()
                .setTitle(completed ? 'â\u009c Reminder Completed' : 'â\u009d Reminder Not Completed')
                .setDescription(responseMessage)
                .setColor(completed ? '#2ecc71' : '#e74c3c')
                .setTimestamp();

            await interaction.update({
                embeds: [responseEmbed],
                components: []
            });

            this.activeReminders.delete(reminderId);

        } catch (error) {
            console.error('Error handling reminder interaction:', error);
            await interaction.reply({
                content: 'There was an error processing your response.',
                ephemeral: true
            });
        }
    }

    async reloadAllReminders() {
        try {
            const reminders = await db.getAllActiveReminders();
            console.log(`Loaded ${reminders.length} active reminders on startup`);
            
            const missedReminders = [];
            const now = new Date();
            
            for (const reminder of reminders) {
                const reminderTime = new Date();
                const [hours, minutes] = reminder.time.split(':');
                reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                
                if (reminderTime < now) {
                    missedReminders.push(reminder);
                }
            }
            
            if (missedReminders.length > 0) {
                console.log(`Detected ${missedReminders.length} missed reminders while bot was offline`);
            }
            
        } catch (error) {
            console.error('Error reloading reminders:', error);
        }
    }

    getActiveReminder(reminderId) {
        return this.activeReminders.get(reminderId);
    }
}

module.exports = ReminderScheduler;
