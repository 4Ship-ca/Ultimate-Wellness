/**
 * Conversation Module - Manages voice-to-voice conversations
 * Handles go-words, pause detection, and conversation flow
 */

const ConversationModule = {
    // Conversation state
    isInConversation: false,
    conversationBuffer: '',
    sentenceCount: 0,
    silenceTimer: null,
    isWaitingForGoWord: false,
    isListeningForWakeWord: false,
    wakeWordTimer: null,

    // Default settings
    defaultSettings: {
        conversationEnabled: true,
        goWord: 'go',
        pauseLength: 2000, // milliseconds
        endConversationPhrase: 'end conversation',
        autoStartResponse: true, // Auto-speak bot response when recognized
        multiSentenceMode: true, // Allow multiple sentences before go-word
        activeListeningEnabled: true,
        activeListeningPhrase: 'hey bot',
        activeListeningTimeout: 10 // seconds
    },

    /**
     * Initialize conversation module
     */
    init() {
        console.log('🎙️ Conversation Module initialized');
        return true;
    },

    /**
     * Start a voice conversation
     */
    startConversation(settings) {
        if (this.isInConversation) {
            console.warn('⚠️ Already in conversation');
            return false;
        }

        this.isInConversation = true;
        this.conversationBuffer = '';
        this.sentenceCount = 0;
        this.isWaitingForGoWord = false;

        console.log('🎤 Conversation started');
        this.showConversationIndicator();

        return true;
    },

    /**
     * End the current conversation
     */
    endConversation() {
        if (!this.isInConversation) return false;

        this.isInConversation = false;
        this.conversationBuffer = '';
        this.sentenceCount = 0;
        this.clearSilenceTimer();
        this.hideConversationIndicator();
        this.clearWakeWordTimer();

        console.log('👋 Conversation ended');
        return true;
    },

    /**
     * Restart passive listening after a message is sent (persistent listening mode)
     * Clears conversation state but stays in listening mode (yellow state)
     */
    restartPassiveListening(settings) {
        if (!this.isInConversation) return false;

        // Clear conversation state
        this.isInConversation = false;
        this.conversationBuffer = '';
        this.sentenceCount = 0;
        this.clearSilenceTimer();
        this.hideConversationIndicator();

        // Start passive listening again
        this.startPassiveListening(settings);

        console.log('🔄 Restarting passive listening (persistent mode)');
        return true;
    },

    /**
     * Start listening for wake word (passive listening mode)
     */
    startPassiveListening(settings) {
        if (!settings.activeListeningEnabled) return false;

        this.isListeningForWakeWord = true;
        console.log(`👂 Listening for wake word: "${settings.activeListeningPhrase}"`);

        // Only set timeout if persistent listening is disabled
        if (settings.persistentListeningEnabled) {
            console.log(`♾️ Persistent listening enabled - will listen indefinitely until mic clicked`);
        } else {
            console.log(`⏰ Will timeout in ${settings.activeListeningTimeout} seconds`);
            // Start timeout timer
            this.wakeWordTimer = setTimeout(() => {
                if (this.isListeningForWakeWord) {
                    console.log('⏸️ Wake word timeout - no phrase detected');
                    this.stopPassiveListening();
                }
            }, settings.activeListeningTimeout * 1000);
        }

        return true;
    },

    /**
     * Stop listening for wake word
     */
    stopPassiveListening() {
        this.isListeningForWakeWord = false;
        this.clearWakeWordTimer();
        console.log('🛑 Stopped listening for wake word');
    },

    /**
     * Check if transcript contains the wake phrase and start conversation
     */
    processWakeWord(transcript, settings) {
        if (!this.isListeningForWakeWord) return false;

        const lowerTranscript = transcript.toLowerCase().trim();
        const lowerPhrase = settings.activeListeningPhrase.toLowerCase().trim();

        if (lowerTranscript.includes(lowerPhrase)) {
            console.log(`🎯 Wake word detected: "${settings.activeListeningPhrase}"`);
            this.stopPassiveListening();
            this.startConversation(settings);

            // Remove the wake phrase from the transcript so the user's actual message is clean
            const cleanedTranscript = this.removeWakePhrase(transcript, settings.activeListeningPhrase);
            return {
                detected: true,
                cleanedTranscript: cleanedTranscript
            };
        }

        return { detected: false, cleanedTranscript: transcript };
    },

    /**
     * Remove wake phrase from transcript
     */
    removeWakePhrase(transcript, phrase) {
        const regex = new RegExp(phrase, 'gi');
        return transcript.replace(regex, '').trim();
    },

    /**
     * Clear wake word timer
     */
    clearWakeWordTimer() {
        if (this.wakeWordTimer) {
            clearTimeout(this.wakeWordTimer);
            this.wakeWordTimer = null;
        }
    },

    /**
     * Process incoming voice input
     * Returns true if message should be sent, false if waiting for more input
     */
    processVoiceInput(transcript, settings) {
        if (!this.isInConversation) {
            // Single message mode (not in conversation)
            return true;
        }

        // Check for end conversation phrase
        const lowerTranscript = transcript.toLowerCase().trim();
        if (lowerTranscript.includes(settings.endConversationPhrase.toLowerCase())) {
            console.log('🛑 End conversation phrase detected');

            // Send any buffered content first
            if (this.conversationBuffer.trim()) {
                this.sendBufferedMessage(this.conversationBuffer);
            }

            // In persistent listening mode, restart passive listening instead of ending
            if (settings.persistentListeningEnabled) {
                this.restartPassiveListening(settings);
            } else {
                this.endConversation();
            }
            return false;
        }

        // Check for go-word
        if (settings.multiSentenceMode) {
            if (this.hasGoWord(lowerTranscript, settings.goWord)) {
                // Go-word found, send the message (remove go-word from transcript)
                const cleanedTranscript = this.removeGoWord(transcript, settings.goWord);
                this.conversationBuffer += ' ' + cleanedTranscript;

                console.log('✅ Go-word detected, sending message');
                return true; // Send message
            } else {
                // No go-word, buffer the input and wait for more
                this.conversationBuffer += ' ' + transcript;
                this.sentenceCount++;

                console.log(`📝 Buffered sentence ${this.sentenceCount}: "${transcript}"`);
                console.log(`⏳ Waiting for "${settings.goWord}" or ${settings.pauseLength}ms silence...`);

                // Start silence timer for pause-based sending
                this.startSilenceTimer(settings);

                return false; // Don't send yet
            }
        } else {
            // Single sentence mode - send after each utterance
            this.conversationBuffer = transcript;
            return true; // Send immediately
        }
    },

    /**
     * Check if transcript contains the go-word
     */
    hasGoWord(transcript, goWord) {
        const words = transcript.toLowerCase().split(/\s+/);
        return words.includes(goWord.toLowerCase());
    },

    /**
     * Remove the go-word from transcript
     */
    removeGoWord(transcript, goWord) {
        const regex = new RegExp(`\\b${goWord}\\b`, 'gi');
        return transcript.replace(regex, '').trim();
    },

    /**
     * Start silence timer for pause detection
     */
    startSilenceTimer(settings) {
        this.clearSilenceTimer();

        this.silenceTimer = setTimeout(() => {
            if (this.conversationBuffer.trim()) {
                console.log('⏸️ Pause detected, sending message');
                this.sendBufferedMessage(this.conversationBuffer);

                // After sending, check if we should loop back to passive listening
                if (settings.persistentListeningEnabled) {
                    // Use a small delay to ensure message is processed before restarting
                    setTimeout(() => {
                        this.restartPassiveListening(settings);
                    }, 100);
                } else {
                    this.endConversation();
                }
            }
        }, settings.pauseLength);
    },

    /**
     * Clear the silence timer
     */
    clearSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    },

    /**
     * Send the buffered message
     */
    sendBufferedMessage(message) {
        if (!message.trim()) return;

        const input = document.getElementById('aiChatInput');
        if (input) {
            input.value = message.trim();
            sendAIMessage();
            this.conversationBuffer = '';
        }
    },

    /**
     * Get the current buffer content
     */
    getBuffer() {
        return this.conversationBuffer.trim();
    },

    /**
     * Get conversation status
     */
    getStatus() {
        return {
            isInConversation: this.isInConversation,
            buffer: this.conversationBuffer,
            sentenceCount: this.sentenceCount,
            isWaitingForSilence: this.silenceTimer !== null
        };
    },

    /**
     * Show visual indicator that conversation is active
     */
    showConversationIndicator() {
        const container = document.getElementById('aiChatMessages');
        if (!container) return;

        let indicator = document.getElementById('conversationIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'conversationIndicator';
            indicator.className = 'conversation-indicator';
            indicator.innerHTML = `
                <div class="conversation-status">
                    <span class="pulse-dot"></span>
                    Voice Conversation Active
                </div>
            `;
            container.parentElement.insertBefore(indicator, container);
        }
    },

    /**
     * Hide conversation indicator
     */
    hideConversationIndicator() {
        const indicator = document.getElementById('conversationIndicator');
        if (indicator) {
            indicator.remove();
        }
    },

    /**
     * Get formatted settings from DOM
     */
    getConversationSettings() {
        return {
            conversationEnabled: document.getElementById('conversationEnabled')?.checked ?? true,
            goWord: document.getElementById('conversationGoWord')?.value?.toLowerCase()?.trim() || 'go',
            pauseLength: parseInt(document.getElementById('conversationPauseLength')?.value) || 2000,
            endConversationPhrase: document.getElementById('conversationEndPhrase')?.value?.toLowerCase()?.trim() || 'end conversation',
            autoStartResponse: document.getElementById('conversationAutoStart')?.checked ?? true,
            multiSentenceMode: document.getElementById('conversationMultiSentence')?.checked ?? true
        };
    },

    /**
     * Initialize conversation settings UI
     */
    initializeConversationSettings(userSettings) {
        const settings = userSettings?.conversationSettings || this.defaultSettings;

        const conversationEnabled = document.getElementById('conversationEnabled');
        const goWord = document.getElementById('conversationGoWord');
        const pauseLength = document.getElementById('conversationPauseLength');
        const endPhrase = document.getElementById('conversationEndPhrase');
        const autoStart = document.getElementById('conversationAutoStart');
        const multiSentence = document.getElementById('conversationMultiSentence');

        if (conversationEnabled) conversationEnabled.checked = settings.conversationEnabled;
        if (goWord) goWord.value = settings.goWord;
        if (pauseLength) {
            pauseLength.value = settings.pauseLength;
            updatePauseLengthDisplay(settings.pauseLength);
        }
        if (endPhrase) endPhrase.value = settings.endConversationPhrase;
        if (autoStart) autoStart.checked = settings.autoStartResponse;
        if (multiSentence) multiSentence.checked = settings.multiSentenceMode;

        console.log('✅ Conversation settings initialized');
    },

    /**
     * Show helper text for current mode
     */
    showConversationHelper(settings) {
        let helperText = '';

        if (settings.multiSentenceMode) {
            helperText = `📝 Multi-sentence mode: Say multiple sentences, then say "${settings.goWord}" to send, or pause for ${settings.pauseLength}ms to auto-send.`;
        } else {
            helperText = `📝 Single-sentence mode: Each sentence is sent immediately after recognition.`;
        }

        helperText += ` Say "${settings.endConversationPhrase}" to end the conversation.`;

        console.log(helperText);
        return helperText;
    }
};

// Initialize on module load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ConversationModule.init());
} else {
    ConversationModule.init();
}
