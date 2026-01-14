// ============ EMAIL TEMPLATE SYSTEM ============
// Bot-generated email content with configurable triggers and timing

// ============ EMAIL TEMPLATE SCHEMA ============

const EmailTemplateSchema = {
    id: 'weekly_summary',
    
    // Template Config
    name: 'Weekly Summary',
    enabled: true,
    priority: 1,
    
    // Trigger Conditions
    trigger: {
        type: 'schedule', // 'schedule'|'event'|'milestone'
        schedule: {
            frequency: 'weekly', // 'daily'|'weekly'|'monthly'
            dayOfWeek: 0, // 0=Sunday, 6=Saturday
            time: '09:00',
            timezone: 'America/Toronto'
        },
        event: null, // For event-based triggers
        milestone: null // For milestone-based triggers
    },
    
    // Email Structure (bot fills in)
    structure: {
        subject: 'Your Weekly Wellness Summary - ${week}',
        greeting: 'Hi ${userName}!',
        
        sections: [
            {
                id: 'summary',
                title: 'This Week\'s Progress',
                botPrompt: 'Summarize user\'s week: weight change, points average, exercise days, sleep quality',
                required: true
            },
            {
                id: 'achievements',
                title: '🎉 Wins This Week',
                botPrompt: 'List 3 specific achievements from the week',
                required: true
            },
            {
                id: 'insights',
                title: '💡 Insights',
                botPrompt: 'Analyze patterns and provide actionable insights',
                required: false
            },
            {
                id: 'recipe',
                title: '🍳 Perfect Recipe for You',
                botPrompt: 'Suggest top-scored recipe based on pantry, preferences, schedule',
                required: true
            },
            {
                id: 'goals',
                title: '🎯 This Week\'s Goals',
                botPrompt: 'Suggest 2-3 specific goals for upcoming week',
                required: true
            }
        ],
        
        closing: 'You\'ve got this!',
        signature: 'Your Wellness Coach'
    },
    
    // Personalization
    personalization: {
        useName: true,
        includeStats: true,
        includeRecipe: true,
        tone: 'encouraging' // 'encouraging'|'casual'|'professional'
    },
    
    // Delivery
    delivery: {
        method: 'email', // 'email'|'notification'|'sms'
        email: '${userEmail}',
        sendImmediately: false,
        retryOnFail: true
    },
    
    // Metadata
    lastSent: '2026-01-01',
    sentCount: 12,
    openRate: 0.85,
    clickRate: 0.42
};

// ============ EMAIL TEMPLATES LIBRARY ============

const EMAIL_TEMPLATES = {
    weekly_summary: {
        id: 'weekly_summary',
        name: 'Weekly Summary',
        enabled: true,
        trigger: {
            type: 'schedule',
            schedule: { frequency: 'weekly', dayOfWeek: 0, time: '09:00' }
        },
        structure: {
            subject: 'Your Weekly Wellness Summary',
            sections: [
                {
                    id: 'summary',
                    title: 'This Week\'s Progress',
                    botPrompt: `Generate weekly summary including:
                    - Weight change (if tracked)
                    - Average daily points
                    - Days with exercise
                    - Sleep quality average
                    - Water goal achievement
                    Keep it positive and specific.`
                },
                {
                    id: 'achievements',
                    title: '🎉 Your Wins',
                    botPrompt: `List 3 specific achievements:
                    - Zero-point meals eaten
                    - Exercise consistency
                    - Weight loss progress
                    - Sleep improvements
                    - Water goal days
                    Focus on what went well.`
                },
                {
                    id: 'recipe',
                    title: '🍳 Perfect Recipe for Next Week',
                    botPrompt: `Suggest top-scored recipe based on:
                    - Pantry ingredients
                    - User preferences (7.5+ rated)
                    - Available points
                    - Upcoming week schedule
                    Include prep time and why it's perfect for them.`
                },
                {
                    id: 'goals',
                    title: '🎯 Let\'s Aim For',
                    botPrompt: `Suggest 2-3 specific, achievable goals:
                    - Based on patterns (e.g., "Exercise 4 days")
                    - Areas needing improvement
                    - Next milestone
                    Make them SMART goals.`
                }
            ]
        }
    },
    
    daily_reminder: {
        id: 'daily_reminder',
        name: 'Daily Check-in',
        enabled: false,
        trigger: {
            type: 'schedule',
            schedule: { frequency: 'daily', time: '20:00' }
        },
        structure: {
            subject: 'Don\'t Forget to Log Your Day!',
            sections: [
                {
                    id: 'reminder',
                    title: 'Quick Check',
                    botPrompt: `Friendly reminder to log:
                    - Today's meals (if missing)
                    - Water intake
                    - Exercise
                    - Sleep (before bed)
                    Keep it brief and encouraging.`
                }
            ]
        }
    },
    
    milestone: {
        id: 'milestone',
        name: 'Milestone Celebration',
        enabled: true,
        trigger: {
            type: 'milestone',
            milestone: {
                type: 'weight_goal', // 'weight_goal'|'streak'|'total_loss'
                threshold: 10 // 10 lbs lost
            }
        },
        structure: {
            subject: '🎉 Amazing Achievement Unlocked!',
            sections: [
                {
                    id: 'celebration',
                    title: 'You Did It!',
                    botPrompt: `Celebrate milestone with:
                    - What they achieved
                    - How far they've come
                    - Impact on their journey
                    - What's next
                    Be enthusiastic and specific!`
                }
            ]
        }
    },
    
    recipe_followup: {
        id: 'recipe_followup',
        name: 'Recipe Follow-up',
        enabled: true,
        trigger: {
            type: 'event',
            event: {
                type: 'recipe_suggested',
                delay: '3_days' // Follow up 3 days after suggestion
            }
        },
        structure: {
            subject: 'Did you try the ${recipeName}?',
            sections: [
                {
                    id: 'followup',
                    title: 'We\'d Love to Know',
                    botPrompt: `Ask if they made the recipe:
                    - Did you try it?
                    - How would you rate it?
                    - Would you make it again?
                    - What did you think?
                    Be casual and curious.`
                }
            ]
        }
    },
    
    low_activity_nudge: {
        id: 'low_activity_nudge',
        name: 'Activity Nudge',
        enabled: true,
        trigger: {
            type: 'event',
            event: {
                type: 'low_activity',
                threshold: '3_days_no_exercise'
            }
        },
        structure: {
            subject: 'Missing Your Workouts?',
            sections: [
                {
                    id: 'nudge',
                    title: 'Let\'s Get Moving',
                    botPrompt: `Gentle nudge to exercise:
                    - Acknowledge the gap (no judgment)
                    - Suggest easy activities
                    - Mention points they could earn
                    - Remind of how good it feels
                    Be supportive, not pushy.`
                }
            ]
        }
    }
};

// ============ BOT EMAIL GENERATION ============

/**
 * Generate email content using bot
 * @param {String} templateId - Email template ID
 * @param {Object} userData - User data for personalization
 * @returns {Object} Generated email
 */
async function generateEmail(templateId, userData = {}) {
    const template = EMAIL_TEMPLATES[templateId];
    if (!template || !template.enabled) {
        throw new Error(`Template ${templateId} not found or disabled`);
    }
    
    // Gather user context
    const context = {
        userName: userSettings?.name || 'there',
        userEmail: userSettings?.email || null,
        
        // Weekly stats
        weeklyStats: await BotDataAPI.getWeeklySummary(),
        
        // Recipes
        topRecipe: (await getRecipeRecommendations({ limit: 1 }))[0],
        
        // Patterns
        patterns: await BotDataAPI.analyzeFoodPatterns(7),
        exerciseSummary: await BotDataAPI.getExerciseSummary(7),
        sleepSummary: await BotDataAPI.getSleepSummary(7),
        
        // Goals
        weightProgress: await BotDataAPI.getWeightProgress()
    };
    
    // Generate each section using bot
    const generatedSections = [];
    
    for (const section of template.structure.sections) {
        const sectionContent = await generateEmailSection(section, context);
        generatedSections.push(sectionContent);
    }
    
    // Build final email
    const email = {
        subject: interpolate(template.structure.subject, context),
        body: buildEmailHTML(template, generatedSections, context),
        textBody: buildEmailText(template, generatedSections, context),
        sentDate: new Date().toISOString()
    };
    
    // Store sent email
    await storeSentEmail(templateId, email);
    
    return email;
}

/**
 * Generate section content using bot
 * @param {Object} section - Section config
 * @param {Object} context - User context
 * @returns {String} Generated content
 */
async function generateEmailSection(section, context) {
    // Call bot with section prompt + context
    const systemPrompt = `You are a supportive wellness coach generating an email section.
    
    Section: ${section.title}
    Prompt: ${section.botPrompt}
    
    User Context:
    ${JSON.stringify(context, null, 2)}
    
    Generate engaging, personal content for this section. Be specific, encouraging, and actionable.
    Keep it concise (2-3 sentences). Use emojis sparingly.`;
    
    try {
        const response = await callClaudeAPI(section.botPrompt, context, systemPrompt);
        return response;
    } catch (error) {
        console.error('Error generating section:', error);
        return `[Content generation failed - please check settings]`;
    }
}

/**
 * Build HTML email from sections
 */
function buildEmailHTML(template, sections, context) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .section { background: #f9f9f9; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .cta { background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${template.structure.subject}</h1>
                <p>Hi ${context.userName}! 👋</p>
            </div>
            
            ${sections.map((content, idx) => `
                <div class="section">
                    <div class="section-title">${template.structure.sections[idx].title}</div>
                    <div>${content}</div>
                </div>
            `).join('')}
            
            <div class="footer">
                <p>You're doing great! Keep up the amazing work.</p>
                <p><a href="#" class="cta">Open App</a></p>
                <p style="margin-top: 20px; font-size: 11px;">
                    Ultimate Wellness | <a href="#">Unsubscribe</a> | <a href="#">Preferences</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
    
    return html;
}

/**
 * Build plain text version
 */
function buildEmailText(template, sections, context) {
    let text = `${template.structure.subject}\n\n`;
    text += `Hi ${context.userName}!\n\n`;
    
    sections.forEach((content, idx) => {
        text += `${template.structure.sections[idx].title}\n`;
        text += `${content}\n\n`;
    });
    
    text += `You're doing great! Keep up the amazing work.\n\n`;
    text += `---\nUltimate Wellness`;
    
    return text;
}

/**
 * Interpolate variables in strings
 */
function interpolate(str, context) {
    return str.replace(/\$\{(\w+)\}/g, (match, key) => {
        return context[key] || match;
    });
}

/**
 * Store sent email for tracking
 */
async function storeSentEmail(templateId, email) {
    const record = {
        id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        templateId: templateId,
        subject: email.subject,
        sentDate: email.sentDate,
        opened: false,
        clicked: false
    };
    
    await dbPut('sent_emails', record);
}

// ============ EMAIL SCHEDULING ============

/**
 * Check if email should be sent
 * @param {Object} template - Email template
 * @returns {Boolean} Should send
 */
async function shouldSendEmail(template) {
    if (!template.enabled) return false;
    
    const trigger = template.trigger;
    
    if (trigger.type === 'schedule') {
        return checkScheduleTrigger(trigger.schedule, template);
    } else if (trigger.type === 'event') {
        return await checkEventTrigger(trigger.event, template);
    } else if (trigger.type === 'milestone') {
        return await checkMilestoneTrigger(trigger.milestone, template);
    }
    
    return false;
}

/**
 * Check schedule trigger
 */
function checkScheduleTrigger(schedule, template) {
    const now = new Date();
    const today = now.getDay();
    const hour = now.getHours();
    
    // Check if already sent today
    if (template.lastSent) {
        const lastSent = new Date(template.lastSent);
        if (lastSent.toDateString() === now.toDateString()) {
            return false; // Already sent today
        }
    }
    
    // Check day of week (if weekly)
    if (schedule.frequency === 'weekly') {
        if (today !== schedule.dayOfWeek) return false;
    }
    
    // Check time
    const [targetHour] = schedule.time.split(':').map(Number);
    if (hour !== targetHour) return false;
    
    return true;
}

/**
 * Check event trigger
 */
async function checkEventTrigger(event, template) {
    // Example: Check for low activity
    if (event.type === 'low_activity') {
        const recent = await BotDataAPI.queryExercise({ days: 3 });
        return recent.length === 0; // No exercise in 3 days
    }
    
    // Example: Recipe follow-up
    if (event.type === 'recipe_suggested') {
        // Check if recipe was suggested 3 days ago
        // Would need tracking of recipe suggestions
        return false;
    }
    
    return false;
}

/**
 * Check milestone trigger
 */
async function checkMilestoneTrigger(milestone, template) {
    if (milestone.type === 'weight_goal') {
        const progress = await BotDataAPI.getWeightProgress();
        if (progress && progress.totalLoss >= milestone.threshold) {
            // Check if we already sent this milestone email
            const sent = await dbGetAll('sent_emails');
            const alreadySent = sent.some(e => 
                e.templateId === template.id && 
                e.milestone === milestone.threshold
            );
            return !alreadySent;
        }
    }
    
    return false;
}

// ============ EMAIL MANAGEMENT ============

/**
 * Get email template
 */
function getEmailTemplate(templateId) {
    return EMAIL_TEMPLATES[templateId];
}

/**
 * Update email template
 */
async function updateEmailTemplate(templateId, updates) {
    const template = EMAIL_TEMPLATES[templateId];
    if (!template) throw new Error('Template not found');
    
    Object.assign(template, updates);
    
    // Store in localStorage for persistence
    localStorage.setItem('emailTemplates', JSON.stringify(EMAIL_TEMPLATES));
    
    console.log(`✅ Updated template: ${templateId}`);
}

/**
 * Get all email templates
 */
function getAllEmailTemplates() {
    return Object.values(EMAIL_TEMPLATES);
}

// ============ EXPORT ============
window.EmailSystem = {
    generateEmail,
    shouldSendEmail,
    getEmailTemplate,
    updateEmailTemplate,
    getAllEmailTemplates,
    EMAIL_TEMPLATES
};

console.log('📧 Email Template System loaded');
