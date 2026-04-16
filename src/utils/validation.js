const { validateTimeFormat, isTimeInPast } = require('./timeUtils');
const { TIMEZONES, DAYS } = require('./timeUtils');

function validateReminderInput(name, time, day, timezone, ping) {
    const errors = [];

    if (!name || name.trim().length === 0) {
        errors.push('Reminder name is required.');
    } else if (name.length > 100) {
        errors.push('Reminder name must be 100 characters or less.');
    }

    if (!time) {
        errors.push('Time is required.');
    } else if (!validateTimeFormat(time)) {
        errors.push('Invalid time format. Please use HH:MM format (e.g., 14:30).');
    }

    if (!day) {
        errors.push('Day is required.');
    } else if (!DAYS.some(d => d.value === day)) {
        errors.push('Invalid day selected.');
    }

    if (!timezone) {
        errors.push('Timezone is required.');
    } else if (!TIMEZONES.some(t => t.value === timezone)) {
        errors.push('Invalid timezone selected.');
    }

    if (ping === undefined || ping === null) {
        errors.push('Ping preference is required.');
    }

    if (time && day && timezone) {
        if (isTimeInPast(day, time, timezone)) {
            errors.push('The selected time has already passed for the chosen day. Please select a future time.');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

function validateEditInput(updates) {
    const errors = [];

    if (updates.time !== undefined) {
        if (!updates.time) {
            errors.push('Time cannot be empty.');
        } else if (!validateTimeFormat(updates.time)) {
            errors.push('Invalid time format. Please use HH:MM format (e.g., 14:30).');
        }
    }

    if (updates.day !== undefined) {
        if (!updates.day) {
            errors.push('Day cannot be empty.');
        } else if (!DAYS.some(d => d.value === updates.day)) {
            errors.push('Invalid day selected.');
        }
    }

    if (updates.timezone !== undefined) {
        if (!updates.timezone) {
            errors.push('Timezone cannot be empty.');
        } else if (!TIMEZONES.some(t => t.value === updates.timezone)) {
            errors.push('Invalid timezone selected.');
        }
    }

    if (updates.name !== undefined) {
        if (!updates.name || updates.name.trim().length === 0) {
            errors.push('Reminder name cannot be empty.');
        } else if (updates.name.length > 100) {
            errors.push('Reminder name must be 100 characters or less.');
        }
    }

    if (updates.ping !== undefined && typeof updates.ping !== 'boolean') {
        errors.push('Ping preference must be true or false.');
    }

    if (updates.repeat_days !== undefined) {
        if (!Array.isArray(updates.repeat_days)) {
            errors.push('Repeat days must be an array.');
        } else {
            const invalidDays = updates.repeat_days.filter(day => !DAYS.some(d => d.value === day));
            if (invalidDays.length > 0) {
                errors.push(`Invalid repeat days: ${invalidDays.join(', ')}`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

function sanitizeInput(input) {
    if (typeof input !== 'string') {
        return input;
    }
    
    return input
        .trim()
        .replace(/[<>]/g, '')
        .replace(/[\x00-\x1F\x7F]/g, '');
}

function validateReminderSelection(reminderId, userReminders) {
    const errors = [];

    if (!reminderId) {
        errors.push('Please select a reminder.');
        return { isValid: false, errors };
    }

    const reminder = userReminders.find(r => r.id === parseInt(reminderId));
    if (!reminder) {
        errors.push('Selected reminder not found.');
    }

    return {
        isValid: errors.length === 0,
        errors,
        reminder
    };
}

function validateRepeatDays(days) {
    const errors = [];

    if (!Array.isArray(days)) {
        errors.push('Repeat days must be selected as an array.');
        return { isValid: false, errors };
    }

    if (days.length === 0) {
        errors.push('Please select at least one day for repetition.');
        return { isValid: false, errors };
    }

    const invalidDays = days.filter(day => !DAYS.some(d => d.value === day));
    if (invalidDays.length > 0) {
        errors.push(`Invalid days selected: ${invalidDays.join(', ')}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

module.exports = {
    validateReminderInput,
    validateEditInput,
    sanitizeInput,
    validateReminderSelection,
    validateRepeatDays
};
