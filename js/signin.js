document.getElementById('loginBtn').addEventListener('click', async () => {
    const video = document.createElement('video');
    const faceLoginMessage = document.getElementById('faceLoginMessage');
    
    faceLoginMessage.style.display = 'block';
    faceLoginMessage.textContent = 'Initializing face recognition...';

    try {
        // Load models
        await faceapi.nets.ssdMobilenetv1.loadFromUri('https://drkimogad.github.io/Voice2Barcode/models/ssd_mobilenetv1_model-weights_manifest.json');
        await faceapi.nets.faceLandmark68Net.loadFromUri('https://drkimogad.github.io/Voice2Barcode/models/face_landmark_68_model-shard1_manifest.json');
        await faceapi.nets.faceRecognitionNet.loadFromUri('https://drkimogad.github.io/Voice2Barcode/models/face_recognition_model-shard2_manifest.json');

        // Access camera
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
                        setTimeout(() => {
                            window.location.href = 'dashboard.html'; // Redirect to dashboard
                        }, 1000);
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
