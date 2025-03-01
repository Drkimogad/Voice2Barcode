// Placeholder for face recognition login logic
document.getElementById('loginBtn').addEventListener('click', async () => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const faceLoginMessage = document.getElementById('faceLoginMessage');
    
    faceLoginMessage.style.display = 'block';
    faceLoginMessage.textContent = 'Initializing face recognition...';

    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models'); // Load model
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models'); 
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

        // Access the camera and start the video stream
        navigator.mediaDevices.getUserMedia({ video: {} })
            .then(stream => {
                video.srcObject = stream;
                video.play();
                video.width = 640;
                video.height = 480;

                // Detect faces in the video stream
                setInterval(async () => {
                    const detections = await faceapi.detectAllFaces(video)
                        .withFaceLandmarks()
                        .withFaceDescriptors();

                    if (detections.length > 0) {
                        faceLoginMessage.textContent = 'Face recognized! You are logged in.';
                        // Handle successful login (e.g., redirect or show logged-in UI)
                    }
                }, 100);
            })
            .catch(err => {
                faceLoginMessage.textContent = 'Error: Unable to access camera.';
            });
    } catch (err) {
        faceLoginMessage.textContent = 'Error: Unable to load face recognition models.';
    }
});
