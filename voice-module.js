/**
 * Voice Module - Handles all text-to-speech functionality for the bot
 * Manages voice selection, tuning, and synthesis
 */

// Voice state
const VoiceModule = {
    availableVoices: [],
    currentSpeech: null,
    isPlaying: false,

    // Default voice settings structure
    defaultSettings: {
        voiceEnabled: true,
        voiceIndex: 0,
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        tone: 'natural' // natural, warm, professional, energetic
    },

    /**
     * Initialize voice module and populate available voices
     */
    init() {
        if (!('speechSynthesis' in window)) {
            console.log('Speech synthesis not supported in this browser');
            return false;
        }

        // Get available voices
        this.availableVoices = window.speechSynthesis.getVoices();

        // Some browsers load voices asynchronously
        if (this.availableVoices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => this.init();
            return false;
        }

        return true;
    },

    /**
     * Get grouped voices by gender
     */
    getVoicesByGender() {
        const grouped = {
            male: [],
            female: [],
            neutral: []
        };

        this.availableVoices.forEach((voice, index) => {
            const nameUpper = voice.name.toUpperCase();
            const item = { index, name: voice.name, lang: voice.lang };

            if (nameUpper.includes('FEMALE') || nameUpper.includes('WOMAN') || nameUpper.includes('GIRL')) {
                grouped.female.push(item);
            } else if (nameUpper.includes('MALE') || nameUpper.includes('MAN') || nameUpper.includes('BOY')) {
                grouped.male.push(item);
            } else {
                grouped.neutral.push(item);
            }
        });

        return grouped;
    },

    /**
     * Populate voice select dropdown
     */
    populateVoiceSelect(selectElement, currentIndex = 0) {
        if (!selectElement) return;

        selectElement.innerHTML = '<option value="">-- Select Voice --</option>';

        const grouped = this.getVoicesByGender();

        // Add female voices
        if (grouped.female.length > 0) {
            const femaleGroup = document.createElement('optgroup');
            femaleGroup.label = '👩 Female Voices';
            grouped.female.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.index;
                option.textContent = `${voice.name} (${voice.lang})`;
                femaleGroup.appendChild(option);
            });
            selectElement.appendChild(femaleGroup);
        }

        // Add male voices
        if (grouped.male.length > 0) {
            const maleGroup = document.createElement('optgroup');
            maleGroup.label = '👨 Male Voices';
            grouped.male.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.index;
                option.textContent = `${voice.name} (${voice.lang})`;
                maleGroup.appendChild(option);
            });
            selectElement.appendChild(maleGroup);
        }

        // Add neutral voices
        if (grouped.neutral.length > 0) {
            const neutralGroup = document.createElement('optgroup');
            neutralGroup.label = '🤖 Other Voices';
            grouped.neutral.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.index;
                option.textContent = `${voice.name} (${voice.lang})`;
                neutralGroup.appendChild(option);
            });
            selectElement.appendChild(neutralGroup);
        }

        // Set current selection
        if (currentIndex >= 0 && currentIndex < this.availableVoices.length) {
            selectElement.value = currentIndex;
        }
    },

    /**
     * Remove emoji characters from text for clean speech
     */
    stripEmojis(text) {
        return text
            .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    /**
     * Apply tone adjustments to speech synthesis
     */
    applyToneAdjustments(utterance, tone) {
        switch (tone) {
            case 'warm':
                utterance.pitch = 1.1;
                utterance.rate = 0.95;
                break;
            case 'professional':
                utterance.pitch = 1.0;
                utterance.rate = 1.0;
                break;
            case 'energetic':
                utterance.pitch = 1.2;
                utterance.rate = 1.1;
                break;
            case 'natural':
            default:
                utterance.pitch = 1.0;
                utterance.rate = 1.0;
        }
    },

    /**
     * Speak text with current voice settings
     */
    speakText(text, settings) {
        if (!settings.voiceEnabled || !text) return;

        if (!('speechSynthesis' in window)) {
            console.log('Speech synthesis not supported');
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        this.isPlaying = false;

        // Clean text: strip HTML tags and emojis
        let cleanText = text.replace(/<[^>]*>/g, ' ');
        cleanText = this.stripEmojis(cleanText);
        cleanText = cleanText.replace(/\s+/g, ' ').trim();

        // Skip if text is too long (recipes)
        if (cleanText.length > 500) {
            console.log('Text too long for speech synthesis');
            return;
        }

        this.currentSpeech = new SpeechSynthesisUtterance(cleanText);
        this.currentSpeech.rate = settings.rate || 1.0;
        this.currentSpeech.pitch = settings.pitch || 1.0;
        this.currentSpeech.volume = settings.volume || 1.0;
        this.currentSpeech.lang = 'en-US';

        // Apply tone adjustments
        if (settings.tone) {
            this.applyToneAdjustments(this.currentSpeech, settings.tone);
        }

        // Apply selected voice
        if (settings.voiceIndex >= 0 && settings.voiceIndex < this.availableVoices.length) {
            this.currentSpeech.voice = this.availableVoices[settings.voiceIndex];
        }

        // Add event handlers
        this.currentSpeech.onstart = () => {
            this.isPlaying = true;
            this.addSpeakingIndicator();
        };

        this.currentSpeech.onend = () => {
            this.isPlaying = false;
            this.removeSpeakingIndicator();
            this.currentSpeech = null;
        };

        this.currentSpeech.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
            this.isPlaying = false;
            this.removeSpeakingIndicator();
        };

        window.speechSynthesis.speak(this.currentSpeech);
    },

    /**
     * Play a sample with current settings
     */
    playSample(sampleText, settings) {
        const sample = sampleText || this.getSampleText();
        this.speakText(sample, settings);
    },

    /**
     * Get sample text for voice testing
     */
    getSampleText() {
        return `Hi there! This is a sample of how your wellness coach sounds. I'm here to help you stay healthy, track your nutrition, plan meals, and motivate you to reach your fitness goals. You can adjust my voice speed, pitch, and tone to make sure I sound just right for you. Feel free to try different settings and find what works best for your daily wellness journey.`;
    },

    /**
     * Stop speaking immediately
     */
    stop() {
        window.speechSynthesis.cancel();
        this.isPlaying = false;
        this.removeSpeakingIndicator();
        this.currentSpeech = null;
    },

    /**
     * Add speaking indicator animation
     */
    addSpeakingIndicator() {
        const header = document.querySelector('.ai-chat-header');
        if (!header || header.querySelector('.speaking-indicator')) return;

        const indicator = document.createElement('div');
        indicator.className = 'speaking-indicator';
        indicator.innerHTML = '<div class="speaking-dot"></div><div class="speaking-dot"></div><div class="speaking-dot"></div>';
        header.appendChild(indicator);
    },

    /**
     * Remove speaking indicator
     */
    removeSpeakingIndicator() {
        const indicator = document.querySelector('.speaking-indicator');
        if (indicator) {
            indicator.remove();
        }
    },

    /**
     * Update voice on select change
     */
    handleVoiceSelect(selectElement, settingsCallback) {
        const index = parseInt(selectElement.value) || 0;
        settingsCallback({ voiceIndex: index });
    },

    /**
     * Update rate (speed) with slider
     */
    handleRateChange(sliderElement, settingsCallback) {
        const rate = parseFloat(sliderElement.value);
        settingsCallback({ rate });
    },

    /**
     * Update pitch with slider
     */
    handlePitchChange(sliderElement, settingsCallback) {
        const pitch = parseFloat(sliderElement.value);
        settingsCallback({ pitch });
    },

    /**
     * Update volume with slider
     */
    handleVolumeChange(sliderElement, settingsCallback) {
        const volume = parseFloat(sliderElement.value);
        settingsCallback({ volume });
    },

    /**
     * Update tone with select
     */
    handleToneChange(selectElement, settingsCallback) {
        const tone = selectElement.value;
        settingsCallback({ tone });
    },

    /**
     * Toggle voice enabled/disabled
     */
    toggleVoiceEnabled(settingsCallback) {
        settingsCallback({ voiceEnabled: true }, (current) => ({
            voiceEnabled: !current.voiceEnabled
        }));
    }
};

// Initialize on module load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => VoiceModule.init());
} else {
    VoiceModule.init();
}
