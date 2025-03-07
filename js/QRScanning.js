function handleScan(content) {
    try {
        // Attempt to parse the scanned content as JSON
        const data = JSON.parse(content);

        // Display the scanned data content on the page
        displayScannedContent(data);

        // Enable the download button if content is valid
        document.getElementById('downloadBtn').disabled = false;

        // Store the scanned data globally for future use (e.g., for downloading)
        window.lastScannedData = data;

    } catch (error) {
        // If content is not valid JSON, show an error message
        updateStatus('Invalid QR code content', 'error');
    }
}

// Updated to handle text, voice, audio, and timestamp content
function displayScannedContent(data) {
    const scannedContent = document.getElementById('scannedContent');
    const messageText = document.getElementById('messageText');
    const scannedAudio = document.getElementById('scannedAudio');

    // Show the scanned content section
    scannedContent.hidden = false;

    // Clear previous content in case of re-scan
    scannedAudio.innerHTML = '';
    messageText.textContent = '';

    // Handle different content types
    if (data.type === 'text') {
        // Display the text content
        messageText.textContent = data.data;
        
        // Optionally add voice details if available
        if (data.voice) {
            messageText.textContent += ` (Voice: ${data.voice})`;  // Display voice used for TTS
        }
        
        // Optionally display timestamp if available
        if (data.timestamp) {
            const timestamp = new Date(data.timestamp).toLocaleString(); // Format timestamp
            messageText.textContent += ` (Timestamp: ${timestamp})`;  // Display timestamp
        }

    } else if (data.type === 'audio') {
        // Handle audio content (e.g., play the audio)
        const audio = new Audio(data.data);
        audio.controls = true;
        scannedAudio.appendChild(audio);
        
        // Display content type details
        messageText.textContent = `Audio content (${data.mimeType})`;

    } else {
        // Show an error for unsupported content types
        updateStatus('Unsupported content type', 'error');
    }
}

// Update the status message on the page (error or success)
function updateStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;

    // Add styling based on message type
    if (type === 'error') {
        statusElement.style.color = 'red';
    } else {
        statusElement.style.color = 'green';
    }
}
