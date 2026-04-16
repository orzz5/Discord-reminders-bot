const moment = require('moment-timezone');

const TIMEZONES = [
    { name: 'UTC', value: 'UTC' },
    { name: 'Eastern Time (ET)', value: 'America/New_York' },
    { name: 'Central Time (CT)', value: 'America/Chicago' },
    { name: 'Mountain Time (MT)', value: 'America/Denver' },
    { name: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
    { name: 'London (GMT/BST)', value: 'Europe/London' },
    { name: 'Paris (CET/CEST)', value: 'Europe/Paris' },
    { name: 'Berlin (CET/CEST)', value: 'Europe/Berlin' },
    { name: 'Madrid (CET/CEST)', value: 'Europe/Madrid' },
    { name: 'Rome (CET/CEST)', value: 'Europe/Rome' },
    { name: 'Moscow (MSK)', value: 'Europe/Moscow' },
    { name: 'Tokyo (JST)', value: 'Asia/Tokyo' },
    { name: 'Beijing (CST)', value: 'Asia/Shanghai' },
    { name: 'Hong Kong (HKT)', value: 'Asia/Hong_Kong' },
    { name: 'Singapore (SGT)', value: 'Asia/Singapore' },
    { name: 'Sydney (AEST/AEDT)', value: 'Australia/Sydney' },
    { name: 'Melbourne (AEST/AEDT)', value: 'Australia/Melbourne' },
    { name: 'Auckland (NZST/NZDT)', value: 'Pacific/Auckland' },
    { name: 'Dubai (GST)', value: 'Asia/Dubai' },
    { name: 'Mumbai (IST)', value: 'Asia/Kolkata' }
];

const DAYS = [
    { name: 'Monday', value: 'Monday' },
    { name: 'Tuesday', value: 'Tuesday' },
    { name: 'Wednesday', value: 'Wednesday' },
    { name: 'Thursday', value: 'Thursday' },
    { name: 'Friday', value: 'Friday' },
    { name: 'Saturday', value: 'Saturday' },
    { name: 'Sunday', value: 'Sunday' }
];

function validateTimeFormat(time) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(time);
}

function parseTime(time, timezone) {
    if (!validateTimeFormat(time)) {
        throw new Error('Invalid time format. Please use HH:MM format (e.g., 14:30)');
    }

    const [hours, minutes] = time.split(':').map(Number);
    
    if (hours > 23 || minutes > 59) {
        throw new Error('Invalid time. Hours must be 0-23 and minutes must be 0-59.');
    }

    return { hours, minutes };
}

function getNextOccurrence(day, time, timezone) {
    const now = moment().tz(timezone);
    const targetTime = moment.tz(time, 'HH:mm', timezone);
    
    let targetDate = now.clone().day(day.toLowerCase());
    
    // Set the target time first
    targetDate.hours(targetTime.hours());
    targetDate.minutes(targetTime.minutes());
    targetDate.seconds(0);
    targetDate.milliseconds(0);
    
    // Only add a week if the target date/time is in the past
    if (targetDate.isBefore(now)) {
        targetDate.add(1, 'week');
    }
    
    return targetDate;
}

function getReminderTimestamp(day, time, timezone) {
    const nextOccurrence = getNextOccurrence(day, time, timezone);
    return `<t:${Math.floor(nextOccurrence.valueOf() / 1000)}:R>`;
}

function isTimeInPast(day, time, timezone) {
    const now = moment().tz(timezone);
    const targetTime = moment.tz(time, 'HH:mm', timezone);
    
    const today = now.day().toString().toLowerCase();
    const targetDay = day.toLowerCase();
    
    const dayMap = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
    };
    
    const currentDayNum = now.day();
    const targetDayNum = dayMap[targetDay];
    
    if (targetDayNum < currentDayNum) {
        return true;
    }
    
    if (targetDayNum === currentDayNum) {
        // For same day, create a target datetime with today's date
        const targetDateTime = now.clone().hours(targetTime.hours()).minutes(targetTime.minutes()).seconds(0).milliseconds(0);
        return targetDateTime.isBefore(now);
    }
    
    return false;
}

function getTimeUntilReminder(day, time, timezone) {
    const nextOccurrence = getNextOccurrence(day, time, timezone);
    const now = moment().tz(timezone);
    
    const duration = moment.duration(nextOccurrence.diff(now));
    
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();
    
    if (days > 0) {
        return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
}

function formatReminderTime(time, timezone) {
    const parsedTime = moment.tz(time, 'HH:mm', timezone);
    return parsedTime.format('h:mm A');
}

function getDayNumber(dayName) {
    const days = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
    };
    return days[dayName.toLowerCase()];
}

function shouldExecuteReminder(reminder, currentTime) {
    const reminderTime = moment.tz(reminder.time, 'HH:mm', reminder.timezone);
    const currentMoment = moment.tz(currentTime, reminder.timezone);
    
    const isCorrectTime = currentMoment.hours() === reminderTime.hours() && 
                         currentMoment.minutes() === reminderTime.minutes();
    
    const currentDay = currentMoment.format('dddd').toLowerCase();
    const originalDay = reminder.day.toLowerCase();
    
    // If reminder has repeat days, trigger on original day OR any repeat day
    if (reminder.repeat_days && reminder.repeat_days.length > 0) {
        const repeatDaysLower = reminder.repeat_days.map(day => day.toLowerCase());
        return isCorrectTime && (currentDay === originalDay || repeatDaysLower.includes(currentDay));
    }
    
    // Otherwise check original day only
    return isCorrectTime && currentDay === originalDay;
}

module.exports = {
    TIMEZONES,
    DAYS,
    validateTimeFormat,
    parseTime,
    getNextOccurrence,
    isTimeInPast,
    getTimeUntilReminder,
    formatReminderTime,
    getDayNumber,
    getReminderTimestamp,
    shouldExecuteReminder
};
