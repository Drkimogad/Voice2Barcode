// Mode switching
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        
        document.querySelectorAll('#voiceInput, #textInput, #uploadSection').forEach(el => {
            el.style.display = 'none';
        });
        
        if (currentMode === 'voice') document.getElementById('voiceInput').style.display = 'block';
        if (currentMode === 'text') document.getElementById('textInput').style.display = 'block';
        if (currentMode === 'upload') document.getElementById('uploadSection').style.display = 'block';
    });
});
