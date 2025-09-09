// script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const modal = document.getElementById('consent-modal');
    const agreeBtn = document.getElementById('agree-btn');
    const declineBtn = document.getElementById('decline-btn');
    const consentCheckbox = document.getElementById('consent-checkbox');
    const langEnBtn = document.getElementById('lang-en');
    const langTlBtn = document.getElementById('lang-tl');
    const consentEn = document.getElementById('consent-en');
    const consentTl = document.getElementById('consent-tl');
    const app = document.getElementById('app');
    const video = document.getElementById('camera-preview');
    const canvas = document.getElementById('snapshot-canvas');
    const watermark = document.getElementById('watermark');
    const form = document.getElementById('user-form');
    const csrfTokenInput = document.getElementById('csrf-token');
    const geolocateCheckbox = document.getElementById('geolocate-checkbox');
    const locationStatus = document.getElementById('location-status');
    const formStatus = document.getElementById('form-status');

    let stream = null;
    let locationData = null;
    const isDemoMode = new URLSearchParams(window.location.search).has('demo');

    // --- Consent Modal Logic ---
    function initConsentModal() {
        consentCheckbox.addEventListener('change', () => {
            agreeBtn.disabled = !consentCheckbox.checked;
        });

        agreeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            app.style.display = 'block';
            initApp();
        });

        declineBtn.addEventListener('click', () => {
            document.body.innerHTML = '<h1>Consent Declined</h1><p>You have declined to participate. You can close this window.</p>';
        });

        langEnBtn.addEventListener('click', () => switchLanguage('en'));
        langTlBtn.addEventListener('click', () => switchLanguage('tl'));
    }

    function switchLanguage(lang) {
        if (lang === 'en') {
            consentEn.style.display = 'block';
            consentTl.style.display = 'none';
            langEnBtn.classList.add('active');
            langTlBtn.classList.remove('active');
        } else {
            consentEn.style.display = 'none';
            consentTl.style.display = 'block';
            langTlBtn.classList.add('active');
            langEnBtn.classList.remove('active');
        }
    }

    // --- Application Initialization ---
    async function initApp() {
        await fetchCsrfToken();
        if (isDemoMode) {
            setupDemoMode();
        } else {
            await initializeCamera();
        }
        geolocateCheckbox.addEventListener('change', handleGeolocation);
        form.addEventListener('submit', handleFormSubmit);
    }

    async function fetchCsrfToken() {
        try {
            const response = await fetch('upload.php');
            const data = await response.json();
            if (data.success) {
                csrfTokenInput.value = data.data.csrf_token;
            } else {
                showFormStatus('Error: Could not retrieve security token.', true);
            }
        } catch (error) {
            showFormStatus('Error: Could not connect to the server.', true);
        }
    }

    // --- Camera & Demo Mode ---
    async function initializeCamera() {
        // Enforce HTTPS
        if (window.location.protocol !== 'https:') {
            app.innerHTML = '<h1>HTTPS Required</h1><p>A secure connection (HTTPS) is required to access the camera.</p>';
            return;
        }

        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            video.srcObject = stream;
        } catch (err) {
            console.error("Camera Error:", err);
            const errorMessage = err.name === 'NotAllowedError'
                ? 'You denied camera access.'
                : 'Could not access the camera. Please ensure it is not in use by another application and that you have granted permission.';
            document.querySelector('.camera-module').innerHTML = `<p style="color: red; text-align: center;">${errorMessage}</p>`;
        }
    }

    function setupDemoMode() {
        document.querySelector('.camera-module').innerHTML = `<img id="demo-image" src="sample.jpg" alt="Sample Image">`;
        watermark.textContent = "DEMO MODE";
        locationData = { latitude: 14.5995, longitude: 120.9842 }; // Fake Manila coordinates
        locationStatus.textContent = `Demo Location: ${locationData.latitude}, ${locationData.longitude}`;
    }

    // --- Geolocation ---
    function handleGeolocation() {
        if (geolocateCheckbox.checked) {
            locationStatus.textContent = 'Getting location...';
            if (isDemoMode) {
                locationStatus.textContent = `Demo Location: ${locationData.latitude}, ${locationData.longitude}`;
                return;
            }
            if (!navigator.geolocation) {
                locationStatus.textContent = 'Geolocation is not supported by your browser.';
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    locationData = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    locationStatus.textContent = `Location captured: ${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`;
                },
                () => {
                    locationStatus.textContent = 'Could not get location. Please allow permission.';
                    geolocateCheckbox.checked = false;
                }
            );
        } else {
            locationData = null;
            locationStatus.textContent = '';
        }
    }

    // --- Form Submission ---
    async function handleFormSubmit(event) {
        event.preventDefault();
        showFormStatus('Processing...', false);

        const formData = new FormData(form);

        if (locationData) {
            formData.append('latitude', locationData.latitude);
            formData.append('longitude', locationData.longitude);
        }

        const processAndSubmit = (imageBlob) => {
            formData.append('photo', imageBlob, 'snapshot.jpg');

            fetch('upload.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showFormStatus(data.message, false);
                    form.reset();
                    // Stop the camera stream after successful submission
                    if (stream) {
                        stream.getTracks().forEach(track => track.stop());
                        video.srcObject = null;
                    }
                } else {
                    showFormStatus(`Error: ${data.message}`, true);
                }
            })
            .catch(error => {
                console.error('Submit Error:', error);
                showFormStatus('An unexpected error occurred.', true);
            });
        };

        if (isDemoMode) {
            const demoImage = document.getElementById('demo-image');
            canvas.width = demoImage.naturalWidth;
            canvas.height = demoImage.naturalHeight;
            const context = canvas.getContext('2d');
            context.drawImage(demoImage, 0, 0);
            addWatermark(context, canvas.width, canvas.height);
            canvas.toBlob(processAndSubmit, 'image/jpeg');
        } else {
            if (!stream) {
                showFormStatus('Camera is not active. Cannot submit.', true);
                return;
            }
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            addWatermark(context, canvas.width, canvas.height);
            canvas.toBlob(processAndSubmit, 'image/jpeg');
        }
    }

    function addWatermark(context, width, height) {
        const timestamp = new Date().toLocaleString();
        const text = `DEMO - CONSENT GIVEN + ${timestamp}`;
        context.font = '20px Arial';
        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.textAlign = 'left';
        context.textBaseline = 'bottom';
        context.fillText(text, 10, height - 10);
    }

    function showFormStatus(message, isError) {
        formStatus.textContent = message;
        formStatus.className = 'status ' + (isError ? 'error' : 'success');
    }

    // --- Start the application ---
    initConsentModal();
});
