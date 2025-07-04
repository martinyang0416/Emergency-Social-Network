import { initializeSocket } from "./utils/socketUtils.js";

const socket = initializeSocket();

// Speech synthesis configuration
const speechConfig = {
    isPlaying: false,
    currentUtterance: null,
    voice: null
};

// Translation and speech configuration
const initializeTranslation = () => {
    // Add translation and speech-specific styles
    const style = document.createElement('style');
    style.textContent = `
        .goog-te-banner-frame, 
        .goog-te-gadget-icon,
        .goog-te-menu-value span:not(:first-child),
        .goog-te-menu-value img {
            display: none !important;
        }
        .goog-te-gadget-simple {
            border: none !important;
            background-color: transparent !important;
        }
        .goog-te-menu-value {
            color: #000 !important;
            text-decoration: none !important;
        }
        .speak-button {
            cursor: pointer;
            padding: 5px;
            margin-left: 5px;
            border: none;
            background: none;
            color: #555;
        }
        .speak-button:hover {
            color: #000;
        }
        .speaking {
            color: #0066cc;
        }
        .material-symbols-outlined {
            user-select: none;
        }
        #speakWholePageButton {
            position: fixed;
            bottom: 10px;
            right: 10px;
            padding: 10px 15px;
            background-color: #0066cc;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 9999;
        }
        #speakWholePageButton:hover {
            background-color: #0052a3;
        }
        #speakWholePageButton.speaking {
            background-color: #dc3545;
        }
    `;
    document.head.appendChild(style);

    // Add speak whole page button
    const speakWholePageButton = document.createElement('button');
    speakWholePageButton.id = 'speakWholePageButton';
    speakWholePageButton.innerHTML = '<span class="material-symbols-outlined">campaign</span> Read Page';
    speakWholePageButton.onclick = speakWholePage;
    document.body.appendChild(speakWholePageButton);

    // Initialize Google Translate Element
    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);

    // Create translation element container
    if (!document.getElementById('google_translate_element')) {
        const translateDiv = document.createElement('div');
        translateDiv.id = 'google_translate_element';
        document.body.insertBefore(translateDiv, document.body.firstChild);
    }

    // Initialize speech synthesis
    initializeSpeechSynthesis();
};

// Initialize speech synthesis
const initializeSpeechSynthesis = () => {
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = () => {
            updateSpeechVoice(getStoredLanguage());
        };
    }
};

// Store the selected language
const storeLanguage = (lang) => {
    localStorage.setItem('preferredLanguage', lang);
    updateSpeechVoice(lang);
};

// Update speech voice based on selected language
const updateSpeechVoice = (lang) => {
    if ('speechSynthesis' in window) {
        const voices = speechSynthesis.getVoices();
        const languageCode = lang.split('-')[0];
        const voice = voices.find(v => v.lang.startsWith(languageCode)) || voices[0];
        speechConfig.voice = voice;
    }
};

// Get the stored language
const getStoredLanguage = () => {
    return localStorage.getItem('preferredLanguage') || 'en';
};

// Function to get clean text content (excluding button text)
const getCleanTextContent = (element) => {
    const clone = element.cloneNode(true);
    const buttons = clone.querySelectorAll('.speak-button, .material-symbols-outlined');
    buttons.forEach(button => button.remove());
    return clone.textContent.trim();
};

// Function to get all readable text from the page
const getAllPageText = () => {
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th');
    const texts = [];
    textElements.forEach(element => {
        const cleanText = getCleanTextContent(element);
        if (cleanText) {
            texts.push(cleanText);
        }
    });
    return texts.join('. ');
};

// Function to speak text
const speakText = (text, element) => {
    if (!('speechSynthesis' in window)) {
        console.warn('Text-to-speech not supported in this browser');
        return;
    }

    // If already speaking, stop it
    if (speechConfig.isPlaying) {
        speechSynthesis.cancel();
        speechConfig.isPlaying = false;
        element?.classList.remove('speaking');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = speechConfig.voice;
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onend = () => {
        speechConfig.isPlaying = false;
        element?.classList.remove('speaking');
    };

    utterance.onerror = () => {
        speechConfig.isPlaying = false;
        element?.classList.remove('speaking');
    };

    speechConfig.isPlaying = true;
    element?.classList.add('speaking');
    speechConfig.currentUtterance = utterance;
    speechSynthesis.speak(utterance);
};

// Function to speak the whole page
const speakWholePage = () => {
    const button = document.getElementById('speakWholePageButton');

    if (!('speechSynthesis' in window)) {
        console.warn('Text-to-speech not supported in this browser');
        return;
    }

    if (speechConfig.isPlaying) {
        speechSynthesis.cancel();
        speechConfig.isPlaying = false;
        button.classList.remove('speaking');
        button.innerHTML = '<span class="material-symbols-outlined">campaign</span> Read Page';
        return;
    }

    // Force English voice and language
    const voices = speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    speechConfig.voice = englishVoice;

    const text = getAllPageText();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = englishVoice;
    utterance.lang = 'en'; // Force English language
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onend = () => {
        speechConfig.isPlaying = false;
        button.classList.remove('speaking');
        button.innerHTML = '<span class="material-symbols-outlined">campaign</span> Read Page';
    };

    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        speechConfig.isPlaying = false;
        button.classList.remove('speaking');
        button.innerHTML = '<span class="material-symbols-outlined">campaign</span> Read Page';
    };

    speechConfig.isPlaying = true;
    button.classList.add('speaking');
    button.innerHTML = '<span class="material-symbols-outlined">stop_circle</span> Stop Reading';
    speechConfig.currentUtterance = utterance;
    speechSynthesis.speak(utterance);
};

// Add speak buttons to elements
const addSpeakButtons = () => {
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th');
    textElements.forEach(element => {
        if (!element.querySelector('.speak-button') && getCleanTextContent(element)) {
            const button = document.createElement('button');
            button.className = 'speak-button material-symbols-outlined notranslate';
            button.innerHTML = 'volume_up';
            button.title = 'Click to hear this text';
            button.onclick = (e) => {
                e.stopPropagation();
                const cleanText = getCleanTextContent(element);
                if (cleanText) {
                    speakText(cleanText, button);
                }
            };
            element.appendChild(button);
        }
    });
};

// Define the Google Translate initialization function
window.googleTranslateElementInit = function () {
    const limitedLanguages = 'en,es,fr,de,it,ja,ko,zh-CN,zh-TW';

    const translateElement = new google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: limitedLanguages,
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false,
    }, 'google_translate_element');

    const removeTranslateFromElements = () => {
        const elements = document.querySelectorAll('img, .material-symbols-outlined, .speak-button');
        elements.forEach(el => {
            el.classList.add('notranslate');
        });
    };

    removeTranslateFromElements();
    const observer = new MutationObserver(() => {
        removeTranslateFromElements();
        // addSpeakButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    if (window.google && window.google.translate) {
        const select = document.querySelector('.goog-te-combo');
        if (select) {
            select.addEventListener('change', function () {
                storeLanguage(this.value);
            });

            const storedLang = getStoredLanguage();
            if (storedLang !== 'en') {
                select.value = storedLang;
                select.dispatchEvent(new Event('change'));
            }
        }
    }

    // setTimeout(addSpeakButtons, 1000);
};

// Function to restore language preference
const restoreLanguage = () => {
    const storedLang = getStoredLanguage();
    if (storedLang !== 'en') {
        const checkInterval = setInterval(() => {
            const select = document.querySelector('.goog-te-combo');
            if (select) {
                select.value = storedLang;
                select.dispatchEvent(new Event('change'));
                clearInterval(checkInterval);
            }
        }, 100);

        setTimeout(() => clearInterval(checkInterval), 5000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initializeTranslation();
    setTimeout(restoreLanguage, 1000);

    socket.on("name changed", (data) => {
        if (data.currentUserName === sessionStorage.getItem("username")) {
            sessionStorage.setItem("username", data.username);

            Swal.fire({
                title: "Name has been changed",
                text: `Your username has been updated to "${data.username}".`,
                icon: "success",
                confirmButtonText: "OK",
            }).then(() => {
                const currentLang = document.querySelector('.goog-te-combo')?.value;
                if (currentLang) {
                    storeLanguage(currentLang);
                }
                window.location.reload();
            });
        }
    });

    socket.on("status changed", (data) => {
        console.log(data);
        Swal.fire({
            title: "Status Changed",
            text: `Your account status has been updated to "${data.accountStatus}". You will be logged out now.`,
            icon: "success",
            confirmButtonText: "OK",
        }).then(() => {
            sessionStorage.clear();
            window.location.href = "/";
        });
    });
});