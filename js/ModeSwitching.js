// ModeSwitching.js - Enhanced Version
export function initializeModeSwitching() {
    const modes = {
        voice: {
            button: '[data-mode="voice"]',
            section: '[data-section="voice"]',
            default: true
        },
        text: {
            button: '[data-mode="text"]',
            section: '[data-section="text"]'
        },
        upload: {
            button: '[data-mode="upload"]',
            section: '[data-section="upload"]'
        }
    };

    const modeButtons = document.querySelectorAll('.mode-btn');
    let currentMode = null;

    // Accessibility enhancements
    function setAriaStates(activeButton) {
        modeButtons.forEach(btn => {
            btn.setAttribute('aria-selected', 'false');
            btn.setAttribute('tabindex', '-1');
        });
        activeButton.setAttribute('aria-selected', 'true');
        activeButton.setAttribute('tabindex', '0');
    }

    // Section visibility management
    function toggleSections(targetMode) {
        const allSections = document.querySelectorAll('[data-section]');
        
        allSections.forEach(section => {
            section.classList.remove('active');
            section.hidden = true;
        });

        const activeSection = document.querySelector(
            modes[targetMode].section
        );
        
        if (activeSection) {
            activeSection.hidden = false;
            activeSection.classList.add('active');
            activeSection.focus();
        } else {
            console.warn(`Section for mode ${targetMode} not found`);
        }
    }

    // Handle mode change
    function switchMode(event) {
        const targetButton = event.currentTarget;
        const targetMode = targetButton.dataset.mode;

        if (currentMode === targetMode) return;

        // Remove active class from all buttons
        modeButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        targetButton.classList.add('active');
        
        // Update states
        setAriaStates(targetButton);
        toggleSections(targetMode);
        currentMode = targetMode;

        // Event for other components
        document.dispatchEvent(new CustomEvent('modeChanged', {
            detail: { mode: targetMode }
        }));
    }

    // Initialize default mode
    function setDefaultMode() {
        const defaultMode = Object.values(modes).find(m => m.default);
        const defaultButton = defaultMode ? 
            document.querySelector(defaultMode.button) :
            modeButtons[0];
            
        defaultButton?.click();
    }

    // Event Listeners
    modeButtons.forEach(btn => {
        btn.addEventListener('click', switchMode);
        btn.addEventListener('keydown', e => {
            if (['Enter', 'Space'].includes(e.code)) {
                e.preventDefault();
                btn.click();
            }
        });
    });

    // Initialize
    setDefaultMode();
}
