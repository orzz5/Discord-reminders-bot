const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clean')
        .setDescription('Remove all your active reminders'),

    async execute(interaction, client) {
        try {
            const reminders = await db.getReminders(interaction.user.id);
            
            if (reminders.length === 0) {
                const noRemindersEmbed = new EmbedBuilder()
                    .setTitle('📋 No Reminders to Clean')
                    .setDescription('You don\'t have any active reminders to remove.')
                    .setColor('#3498db')
                    .setTimestamp();
                
                return interaction.reply({ embeds: [noRemindersEmbed] });
            }

            const confirmEmbed = new EmbedBuilder()
                .setTitle('⚠️ Confirm Removal')
                .setDescription(`Are you sure you want to remove all **${reminders.length}** of your active reminders?\n\nThis action cannot be undone!`)
                .setColor('#e74c3c')
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_clean')
                        .setLabel('✅ Yes, Remove All')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel_clean')
                        .setLabel('❌ Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ embeds: [confirmEmbed], components: [row] });

            const filter = i => {
                return i.user.id === interaction.user.id && 
                       (i.customId === 'confirm_clean' || i.customId === 'cancel_clean');
            };

            const collector = interaction.channel.createMessageComponentCollector({ 
                filter, 
                time: 30000 
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'confirm_clean') {
                    try {
                        const removedCount = await db.deleteAllReminders(interaction.user.id);
                        
                        const successEmbed = new EmbedBuilder()
                            .setTitle('✅ All Reminders Removed')
                            .setDescription(`Successfully removed **${removedCount}** reminder${removedCount !== 1 ? 's' : ''}.`)
                            .setColor('#2ecc71')
                            .setTimestamp();

                        await i.update({ embeds: [successEmbed], components: [] });
                    } catch (error) {
                        console.error('Error cleaning reminders:', error);
                        const errorEmbed = new EmbedBuilder()
                            .setTitle('❌ Error')
                            .setDescription('Failed to remove reminders. Please try again later.')
                            .setColor('#e74c3c')
                            .setTimestamp();

                        await i.update({ embeds: [errorEmbed], components: [] });
                    }
                } else if (i.customId === 'cancel_clean') {
                    const cancelEmbed = new EmbedBuilder()
                        .setTitle('❌ Cancelled')
                        .setDescription('Reminder removal has been cancelled.')
                        .setColor('#95a5a6')
                        .setTimestamp();

                    await i.update({ embeds: [cancelEmbed], components: [] });
                }
                
                collector.stop();
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle('⏰ Timed Out')
                        .Description('Confirmation timed out. No reminders were removed.')
                        .setColor('#95a5a6')
                        .setTimestamp();

                    interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
                }
            });

        } catch (error) {
            console.error('Error in clean command:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to process your request. Please try again later.')
                .setColor('#e74c3c')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
