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

    /**
     * @description Sets up the event listeners for the consent modal.
     * This includes handling the checkbox, agree/decline buttons, and language switcher.
     */
    function initConsentModal() {
        // Enable the 'Agree' button only when the user checks the consent box.
        consentCheckbox.addEventListener('change', () => {
            agreeBtn.disabled = !consentCheckbox.checked;
        });

        // When the user agrees, hide the modal and initialize the main application.
        agreeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            app.style.display = 'block';
            initApp();
        });

        // If the user declines, show a message and stop.
        declineBtn.addEventListener('click', () => {
            document.body.innerHTML = '<h1>Consent Declined</h1><p>You have declined to participate. You can close this window.</p>';
        });

        // Add listeners for the language switch buttons.
        langEnBtn.addEventListener('click', () => switchLanguage('en'));
        langTlBtn.addEventListener('click', () => switchLanguage('tl'));
    }

    /**
     * @description Switches the consent form's language between English and Tagalog.
     * @param {string} lang - The language to switch to ('en' or 'tl').
     */
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

    /**
     * @description Initializes the main application after consent has been given.
     * It fetches the CSRF token, sets up the camera (or demo mode), and adds form listeners.
     */
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

    /**
     * @description Fetches a CSRF token from the backend to secure form submissions.
     */
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

    /**
     * @description Requests access to the user's camera and streams the feed to the video element.
     * Enforces that the connection must be HTTPS.
     */
    async function initializeCamera() {
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

    /**
     * @description Sets up the application for demo mode.
     * It replaces the camera feed with a sample image and uses fake GPS coordinates.
     */
    function setupDemoMode() {
        document.querySelector('.camera-module').innerHTML = `<img id="demo-image" src="sample.jpg" alt="Sample Image">`;
        watermark.textContent = "DEMO MODE";
        locationData = { latitude: 14.5995, longitude: 120.9842 }; // Fake Manila coordinates
        locationStatus.textContent = `Demo Location: ${locationData.latitude}, ${locationData.longitude}`;
    }

    /**
     * @description Handles the logic for the 'Include my location' checkbox.
     * It requests geolocation data from the browser when checked.
     */
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

    /**
     * @description Handles the main form submission process.
     * It prevents default submission, captures an image from the video/demo,
     * adds a watermark, and sends all data to the backend via fetch.
     * @param {Event} event - The form submission event.
     */
    async function handleFormSubmit(event) {
        event.preventDefault();
        showFormStatus('Processing...', false);

        const formData = new FormData(form);

        if (locationData) {
            formData.append('latitude', locationData.latitude);
            formData.append('longitude', locationData.longitude);
        }

        // This function takes the final image blob and sends it.
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

        // Capture image from demo or live camera, then call processAndSubmit.
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

    /**
     * @description Draws a watermark on the canvas with a timestamp.
     * @param {CanvasRenderingContext2D} context - The 2D context of the canvas.
     * @param {number} width - The width of the canvas.
     * @param {number} height - The height of the canvas.
     */
    function addWatermark(context, width, height) {
        const timestamp = new Date().toLocaleString();
        const text = `DEMO - CONSENT GIVEN + ${timestamp}`;
        context.font = '20px Arial';
        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.textAlign = 'left';
        context.textBaseline = 'bottom';
        context.fillText(text, 10, height - 10);
    }

    /**
     * @description Displays a status message (success or error) to the user below the form.
     * @param {string} message - The message to display.
     * @param {boolean} isError - Whether the message is an error.
     */
    function showFormStatus(message, isError) {
        formStatus.textContent = message;
        formStatus.className = 'status ' + (isError ? 'error' : 'success');
    }

    // --- Start the application by showing the consent modal ---
    initConsentModal();
});
