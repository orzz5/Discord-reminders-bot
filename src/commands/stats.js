const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View your reminder statistics and streak'),

    async execute(interaction, client) {
        try {
            const [stats, streak] = await Promise.all([
                db.getStats(interaction.user.id),
                db.getStreak(interaction.user.id)
            ]);

            const completionRate = stats.total > 0 
                ? Math.round((stats.completed / stats.total) * 100) 
                : 0;

            const statsEmbed = new EmbedBuilder()
                .setTitle('📊 Your Reminder Statistics')
                .setDescription('Here\'s your performance overview')
                .setColor('#3498db')
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    {
                        name: '✅ Completed Reminders',
                        value: stats.completed.toString(),
                        inline: true
                    },
                    {
                        name: '❌ Not Completed',
                        value: stats.not_completed.toString(),
                        inline: true
                    },
                    {
                        name: '📈 Total Reminders',
                        value: stats.total.toString(),
                        inline: true
                    },
                    {
                        name: ' Current Streak',
                        value: `${streak.current_streak} day${streak.current_streak !== 1 ? 's' : ''}`,
                        inline: true
                    },
                    {
                        name: '⭐ Longest Streak',
                        value: `${streak.longest_streak} day${streak.longest_streak !== 1 ? 's' : ''}`,
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Keep up the great work! Every completed reminder builds your streak.' 
                });

            if (stats.total === 0) {
                statsEmbed.setDescription('You haven\'t completed any reminders yet. Start creating reminders with `/reminder` and build your streak!');
            }

            if (completionRate >= 80) {
                statsEmbed.setColor('#2ecc71');
                statsEmbed.addFields({
                    name: '🏆 Achievement',
                    value: 'Excellent performance! You\'re doing great!',
                    inline: false
                });
            } else if (completionRate >= 60) {
                statsEmbed.setColor('#f39c12');
                statsEmbed.addFields({
                    name: '💪 Keep Going',
                    value: 'Good progress! Keep working on improving your completion rate.',
                    inline: false
                });
            } else if (stats.total > 0) {
                statsEmbed.setColor('#e74c3c');
                statsEmbed.addFields({
                    name: '📚 Room for Improvement',
                    value: 'Focus on completing more reminders to build your streak.',
                    inline: false
                });
            }

            if (streak.current_streak >= 7) {
                statsEmbed.addFields({
                    name: '🎉 Milestone',
                    value: `Amazing! You've maintained a ${streak.current_streak}-day streak!`,
                    inline: false
                });
            }

            await interaction.reply({ embeds: [statsEmbed] });

        } catch (error) {
            console.error('Error fetching stats:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to retrieve statistics. Please try again later.')
                .setColor('#e74c3c')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
