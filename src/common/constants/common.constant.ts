export const CRONJOB_INTERVALS = {
    EVERY_MINUTE: '* * * * *',
    EVERY_5_MINUTES: '*/5 * * * *',
    EVERY_10_MINUTES: '*/10 * * * *',
    EVERY_15_MINUTES: '*/15 * * * *',
    EVERY_30_MINUTES: '*/30 * * * *',
    EVERY_HOUR: '0 * * * *',
    EVERY_2_HOURS: '0 */2 * * *',
    EVERY_3_HOURS: '0 */3 * * *',
    EVERY_6_HOURS: '0 */6 * * *',
    EVERY_12_HOURS: '0 */12 * * *',
    EVERY_DAY_AT_MIDNIGHT: '0 0 * * *',
    EVERY_DAY_AT_6AM: '0 6 * * *',
    EVERY_WEEK: '0 0 * * 0',
    EVERY_MONTH: '0 0 1 * *',
};

export const MESSAGE_TYPE = {
    NORMAL: 'NORMAL',
    FOLLOWUP_QUESTION: 'FOLLOWUP_QUESTION',
    ANSWER: 'ANSWER',
    PLAN_SUMMARY: 'PLAN_SUMMARY',
};

export const MESSAGE_ROLE = {
    USER: 'USER',
    ASSISTANT: 'ASSISTANT',
    SYSTEM: 'SYSTEM',
};

export const CONVERSATION_STATUS = {
    COLLECTING_INFO: 'COLLECTING_INFO',
    PLANNING: 'PLANNING',
    COMPLETED: 'COMPLETED',
    ASKING_MORE_INFO: 'ASKING_MORE_INFO',
    PENDING: 'PENDING',
    PLAN_READY: 'PLAN_READY',
};