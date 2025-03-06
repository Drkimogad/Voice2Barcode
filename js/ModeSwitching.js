function initializeModeSwitching() {
    let cachedSections = null;
    let isSwitching = false;
    let currentMode = null;

    // Auto-discover modes from HTML structure
    const modes = Array.from(document.querySelectorAll('.mode-btn')).reduce((acc, btn) => {
        const mode = btn.dataset.mode;
        acc[mode] = {
            button: `[data-mode="${mode}"]`,
            section: `[data-section="${mode}"]`
        };
        return acc;
    }, {});

    const modeButtons = document.querySelectorAll('.mode-btn');

    // Accessibility and performance optimizations
    const setAriaStates = (activeButton) => {
        modeButtons.forEach(btn => {
            btn.setAttribute('aria-selected', 'false');
            btn.setAttribute('tabindex', '-1');
        });
        activeButton.setAttribute('aria-selected', 'true');
        activeButton.setAttribute('tabindex', '0');
    };

    const toggleSections = (targetMode) => {
        if (!cachedSections) {
            cachedSections = document.querySelectorAll('[data-section]');
        }

        cachedSections.forEach(section => {
            const isTarget = section.dataset.section === targetMode;
            section.classList.toggle('active', isTarget);
            section.hidden = !isTarget;
            
            if (isTarget) {
                section.focus();
                setTimeout(() => {
                    const firstFocusable = section.querySelector('button, [tabindex]');
                    firstFocusable?.focus();
                }, 100);
            }
        });
    };

    const switchMode = (event) => {
        if (isSwitching) return;
        isSwitching = true;

        const targetButton = event.currentTarget;
        const targetMode = targetButton.dataset.mode;

        try {
            if (currentMode === targetMode) return;
            if (!modes[targetMode]) throw new Error(`Undefined mode: ${targetMode}`);

            // Visual transition base
            document.documentElement.style.setProperty(
                '--transition-duration', 
                targetMode === 'voice' ? '0.4s' : '0.2s'
            );

            modeButtons.forEach(btn => btn.classList.remove('active'));
            targetButton.classList.add('active');
            
            setAriaStates(targetButton);
            toggleSections(targetMode);
            currentMode = targetMode;

            // Persist mode
            localStorage.setItem('lastMode', targetMode);

            // Screen reader announcement
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.textContent = `${targetMode} mode activated`;
            document.body.appendChild(announcement);
            setTimeout(() => announcement.remove(), 1000);

            // System-wide notification
            document.dispatchEvent(new CustomEvent('modeChanged', {
                detail: { 
                    mode: targetMode,
                    previousMode: currentMode
                }
            }));

        } catch (error) {
            updateStatus(`Mode error: ${error.message}`, 'error');
            console.error('Mode switching failed:', error);
        } finally {
            setTimeout(() => isSwitching = false, 300);
        }
    };

    // Initialize with saved preference or default
    const setInitialMode = () => {
        const savedMode = localStorage.getItem('lastMode');
        const defaultMode = Object.keys(modes)[0];
        const initialMode = modes[savedMode] ? savedMode : defaultMode;
        
        document.querySelector(modes[initialMode].button)?.click();
        
        if (!modes[savedMode]) {
            localStorage.removeItem('lastMode');
        }
    };

    // Event listeners with debouncing
    const handleModeInteraction = (e) => {
        if (['Enter', 'Space'].includes(e.code)) e.preventDefault();
        if (e.type === 'click' || e.code === 'Enter' || e.code === 'Space') {
            switchMode(e);
        }
    };

    modeButtons.forEach(btn => {
        btn.addEventListener('click', handleModeInteraction);
        btn.addEventListener('keydown', handleModeInteraction);
    });

    // Initial setup
    setInitialMode();
}

window.initializeModeSwitching = initializeModeSwitching;
