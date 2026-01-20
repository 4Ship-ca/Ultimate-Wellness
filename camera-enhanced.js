// ============ CAMERA MODULE v2.3.0 - ENHANCED ============
// Mobile-optimized with barcode detection, auto-orientation, flash controls
// Fixes: Black screen bug, adds CV barcode detection, auto-rotation

(function() {
'use strict';

// Module state
let currentStream = null;
let videoElement = null;
let canvasElement = null;
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let currentZoom = 1;
let minZoom = 1;
let maxZoom = 4;
let touchDistance = 0;
let isGesturing = false;
let recordingTimer = null;
let recordingStartTime = null;
let flashMode = 'off'; // off, on, auto
let videoTrack = null;
let capabilities = null;
let currentOrientation = 'portrait';
let orientationLocked = false;

// Constants
const MAX_VIDEO_DURATION = 30; // 30 seconds max for videos
const BARCODE_DETECTION_INTERVAL = 500; // ms
let barcodeDetectionTimer = null;

// ============================================================================
// CAMERA INITIALIZATION
// ============================================================================

async function initCamera(videoElementId = 'cameraPreview') {
    console.log('📷 Initializing camera v2.3.0...');

    try {
        // CRITICAL FIX: Always stop and cleanup existing stream first
        await stopCamera();

        // Small delay to ensure cleanup completes
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get video element
        videoElement = document.getElementById(videoElementId);

        if (!videoElement) {
            throw new Error('Video element not found: ' + videoElementId);
        }

        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera not supported in this browser');
        }

        // Detect device type and orientation
        const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
        currentOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

        // Optimal constraints based on orientation
        const constraints = {
            video: {
                facingMode: 'environment', // Back camera

                // Auto-adjust aspect ratio based on device orientation
                aspectRatio: currentOrientation === 'portrait'
                    ? { ideal: 9/16 }  // Portrait: 9:16
                    : { ideal: 16/9 }, // Landscape: 16:9

                // Resolution constraints
                width: isMobile
                    ? { ideal: 1080, max: 1920 }
                    : { ideal: 1920 },
                height: isMobile
                    ? { ideal: 1920, max: 2560 }
                    : { ideal: 1080 },

                // Request advanced features
                zoom: true,
                torch: true,
                focusMode: 'continuous',
                whiteBalanceMode: 'continuous'
            },
            audio: false
        };

        // Request camera access
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);

        // Get video track for advanced controls
        videoTrack = currentStream.getVideoTracks()[0];

        // Get camera capabilities
        if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
            capabilities = videoTrack.getCapabilities();

            // Setup zoom
            if (capabilities.zoom) {
                minZoom = capabilities.zoom.min || 1;
                maxZoom = capabilities.zoom.max || 4;
                currentZoom = capabilities.zoom.min || 1;
                console.log(`📷 Zoom: ${minZoom}x - ${maxZoom}x`);
            }

            // Check flash/torch
            if (capabilities.torch) {
                console.log('📷 Flash/torch supported');
                createFlashControls();
            }

            console.log('📷 Capabilities:', capabilities);
        }

        // Attach stream to video element
        videoElement.srcObject = currentStream;

        // CRITICAL FIX: Ensure video plays and stays playing
        videoElement.setAttribute('playsinline', 'true');
        videoElement.setAttribute('autoplay', 'true');
        videoElement.muted = true; // Required for autoplay on some browsers

        // Wait for video to be ready
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Video loading timeout'));
            }, 5000);

            videoElement.onloadedmetadata = () => {
                clearTimeout(timeout);
                videoElement.play()
                    .then(() => {
                        console.log('✅ Video playing');
                        resolve();
                    })
                    .catch(reject);
            };
            videoElement.onerror = (e) => {
                clearTimeout(timeout);
                reject(e);
            };
        });

        // Setup touch gestures for pinch zoom
        setupTouchGestures();

        // Setup orientation change listener
        setupOrientationListener();

        // Start barcode detection (if enabled)
        startBarcodeDetection();

        console.log('✅ Camera initialized');
        console.log(`📷 Video size: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
        console.log(`📷 Orientation: ${currentOrientation}`);

        return currentStream;

    } catch (error) {
        console.error('❌ Camera init failed:', error);
        throw error;
    }
}

// ============================================================================
// CAMERA STOP & CLEANUP
// ============================================================================

async function stopCamera() {
    console.log('🛑 Stopping camera...');

    try {
        // Stop barcode detection
        stopBarcodeDetection();

        // Stop all media tracks
        if (currentStream) {
            currentStream.getTracks().forEach(track => {
                track.stop();
                console.log(`Stopped: ${track.kind}`);
            });
            currentStream = null;
        }

        // CRITICAL FIX: Properly cleanup video element
        if (videoElement) {
            videoElement.pause();
            videoElement.srcObject = null;
            videoElement.load(); // Reset element state

            // Remove event listeners
            videoElement.removeEventListener('touchstart', handleTouchStart);
            videoElement.removeEventListener('touchmove', handleTouchMove);
            videoElement.removeEventListener('touchend', handleTouchEnd);
        }

        // Stop recording if active
        if (isRecording) {
            stopRecording();
        }

        // Cleanup flash UI
        removeFlashControls();

        // Reset state
        currentZoom = 1;
        videoTrack = null;
        capabilities = null;
        flashMode = 'off';

        console.log('✅ Camera stopped');

    } catch (error) {
        console.error('⚠️ Stop error:', error);
    }
}

// ============================================================================
// FLASH/TORCH CONTROLS
// ============================================================================

function createFlashControls() {
    // Check if controls already exist
    let flashBtn = document.getElementById('cameraFlashBtn');
    if (flashBtn) return;

    // Create flash toggle button
    flashBtn = document.createElement('button');
    flashBtn.id = 'cameraFlashBtn';
    flashBtn.className = 'camera-control-btn flash-btn';
    flashBtn.innerHTML = getFlashIcon('off');
    flashBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(0,0,0,0.5);
        border: none;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        color: white;
        font-size: 24px;
        cursor: pointer;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    flashBtn.onclick = toggleFlash;

    // Add to camera container
    const cameraContainer = videoElement.parentElement;
    if (cameraContainer) {
        cameraContainer.style.position = 'relative';
        cameraContainer.appendChild(flashBtn);
    }

    console.log('✅ Flash controls created');
}

function removeFlashControls() {
    const flashBtn = document.getElementById('cameraFlashBtn');
    if (flashBtn) {
        flashBtn.remove();
    }
}

async function toggleFlash() {
    const modes = ['off', 'on', 'auto'];
    const currentIndex = modes.indexOf(flashMode);
    flashMode = modes[(currentIndex + 1) % modes.length];

    await applyFlashMode();

    // Update button icon
    const flashBtn = document.getElementById('cameraFlashBtn');
    if (flashBtn) {
        flashBtn.innerHTML = getFlashIcon(flashMode);
    }

    console.log(`📸 Flash mode: ${flashMode}`);
}

async function applyFlashMode() {
    if (!videoTrack || !capabilities || !capabilities.torch) {
        console.log('⚠️ Flash not supported');
        return;
    }

    try {
        const constraints = {
            advanced: [{
                torch: flashMode === 'on'
            }]
        };

        await videoTrack.applyConstraints(constraints);
        console.log(`✅ Flash ${flashMode}`);

    } catch (error) {
        console.error('Flash error:', error);
    }
}

function getFlashIcon(mode) {
    const icons = {
        'off': '⚡',
        'on': '💡',
        'auto': '🔆'
    };
    return icons[mode] || '⚡';
}

// ============================================================================
// AUTO-ROTATION HANDLING
// ============================================================================

function setupOrientationListener() {
    // Listen for orientation changes
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    // Listen for device orientation (for manual rotation detection)
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleDeviceOrientation);
    }

    console.log('✅ Orientation listeners setup');
}

async function handleOrientationChange() {
    if (orientationLocked) return;

    const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

    if (newOrientation !== currentOrientation) {
        console.log(`🔄 Orientation changed: ${currentOrientation} → ${newOrientation}`);
        currentOrientation = newOrientation;

        // Reinitialize camera with new aspect ratio
        if (currentStream) {
            await initCamera(videoElement.id);
        }
    }
}

function handleDeviceOrientation(event) {
    // Can use this for more precise rotation detection
    // event.beta (front-to-back tilt)
    // event.gamma (left-to-right tilt)
    // event.alpha (compass direction)
}

// ============================================================================
// PHOTO CAPTURE
// ============================================================================

async function takePhoto(quality = 0.95) {
    if (!currentStream || !videoElement) {
        throw new Error('Camera not initialized');
    }

    console.log('📸 Taking photo...');

    try {
        // Create canvas if needed
        if (!canvasElement) {
            canvasElement = document.createElement('canvas');
        }

        // Set canvas size to match video
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;

        // Draw current frame
        const ctx = canvasElement.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

        // Auto-orient for barcodes (detect and rotate if needed)
        const oriented = await autoOrientBarcode(canvasElement);

        // Convert to blob
        const blob = await new Promise((resolve, reject) => {
            oriented.toBlob(
                (blob) => blob ? resolve(blob) : reject(new Error('Blob creation failed')),
                'image/jpeg',
                quality
            );
        });

        // Create data URL
        const dataUrl = oriented.toDataURL('image/jpeg', quality);

        // CRITICAL FIX: Ensure video continues playing after photo
        if (videoElement.paused) {
            await videoElement.play();
        }

        console.log('✅ Photo captured');

        return {
            blob: blob,
            dataUrl: dataUrl,
            width: oriented.width,
            height: oriented.height,
            size: blob.size,
            timestamp: new Date().toISOString(),
            orientation: currentOrientation
        };

    } catch (error) {
        console.error('❌ Photo capture failed:', error);

        // CRITICAL FIX: Ensure video restarts even on error
        try {
            if (videoElement && videoElement.paused) {
                await videoElement.play();
            }
        } catch (e) {
            console.error('Could not restart video:', e);
        }

        throw error;
    }
}

// ============================================================================
// BARCODE AUTO-ORIENTATION
// ============================================================================

async function autoOrientBarcode(canvas) {
    console.log('🔍 Auto-orienting barcode...');

    try {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Detect barcode orientation using edge detection
        const orientation = detectBarcodeOrientation(imageData);

        if (orientation && orientation.needsRotation) {
            console.log(`🔄 Rotating ${orientation.angle}°`);

            // Create new canvas with rotated dimensions
            const rotated = document.createElement('canvas');

            if (orientation.angle === 90 || orientation.angle === 270) {
                rotated.width = canvas.height;
                rotated.height = canvas.width;
            } else {
                rotated.width = canvas.width;
                rotated.height = canvas.height;
            }

            const rotCtx = rotated.getContext('2d');
            rotCtx.translate(rotated.width / 2, rotated.height / 2);
            rotCtx.rotate((orientation.angle * Math.PI) / 180);
            rotCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

            return rotated;
        }

        return canvas;

    } catch (error) {
        console.error('Orientation error:', error);
        return canvas; // Return original on error
    }
}

function detectBarcodeOrientation(imageData) {
    // Simple edge detection to find barcode lines
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    let verticalEdges = 0;
    let horizontalEdges = 0;

    // Sample middle section where barcode likely is
    const startY = Math.floor(height * 0.3);
    const endY = Math.floor(height * 0.7);
    const startX = Math.floor(width * 0.3);
    const endX = Math.floor(width * 0.7);

    // Count vertical vs horizontal edges
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX - 1; x++) {
            const i = (y * width + x) * 4;
            const nextX = i + 4;
            const nextY = i + (width * 4);

            // Check horizontal edge (vertical barcode lines)
            if (nextX < data.length) {
                const diffX = Math.abs(data[i] - data[nextX]);
                if (diffX > 30) verticalEdges++;
            }

            // Check vertical edge (horizontal barcode lines)
            if (nextY < data.length) {
                const diffY = Math.abs(data[i] - data[nextY]);
                if (diffY > 30) horizontalEdges++;
            }
        }
    }

    // If horizontal edges dominate, barcode is sideways
    if (horizontalEdges > verticalEdges * 1.5) {
        return {
            needsRotation: true,
            angle: 90, // Rotate to make lines vertical
            confidence: horizontalEdges / (verticalEdges + horizontalEdges)
        };
    }

    return {
        needsRotation: false,
        angle: 0,
        confidence: verticalEdges / (verticalEdges + horizontalEdges)
    };
}

// ============================================================================
// VIDEO RECORDING (30s MAX)
// ============================================================================

async function startRecording() {
    if (!currentStream) {
        throw new Error('Camera not initialized');
    }

    if (isRecording) {
        console.log('⚠️ Already recording');
        return;
    }

    console.log('🎥 Starting recording (30s max)...');

    try {
        recordedChunks = [];

        const options = {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 2500000
        };

        mediaRecorder = new MediaRecorder(currentStream, options);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            console.log('🎥 Recording stopped');
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            handleRecordingComplete(blob);
        };

        mediaRecorder.start();
        isRecording = true;
        recordingStartTime = Date.now();

        // Auto-stop after 30 seconds
        recordingTimer = setTimeout(() => {
            if (isRecording) {
                console.log('⏱️ 30s limit reached - stopping recording');
                stopRecording();
            }
        }, MAX_VIDEO_DURATION * 1000);

        console.log('✅ Recording started');
        updateRecordingUI();

    } catch (error) {
        console.error('❌ Recording start failed:', error);
        isRecording = false;
        throw error;
    }
}

function stopRecording() {
    if (!isRecording || !mediaRecorder) {
        return;
    }

    console.log('🛑 Stopping recording...');

    if (recordingTimer) {
        clearTimeout(recordingTimer);
        recordingTimer = null;
    }

    mediaRecorder.stop();
    isRecording = false;
    recordingStartTime = null;

    updateRecordingUI();
}

function handleRecordingComplete(blob) {
    const duration = recordingStartTime
        ? (Date.now() - recordingStartTime) / 1000
        : 0;

    console.log(`✅ Recording complete: ${duration.toFixed(1)}s, ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

    // Dispatch custom event with video blob
    const event = new CustomEvent('videoRecorded', {
        detail: {
            blob: blob,
            duration: duration,
            size: blob.size,
            timestamp: new Date().toISOString()
        }
    });

    window.dispatchEvent(event);
}

function updateRecordingUI() {
    const recordBtn = document.getElementById('recordBtn');
    if (recordBtn) {
        recordBtn.textContent = isRecording ? '⏹ Stop Recording' : '🎥 Record Video';
        recordBtn.style.background = isRecording ? 'var(--danger)' : 'var(--primary)';
    }

    // Show/hide timer
    let timerDisplay = document.getElementById('recordingTimer');
    if (isRecording) {
        if (!timerDisplay) {
            timerDisplay = document.createElement('div');
            timerDisplay.id = 'recordingTimer';
            timerDisplay.style.cssText = `
                position: absolute;
                top: 80px;
                right: 20px;
                background: rgba(255,0,0,0.8);
                color: white;
                padding: 10px 15px;
                border-radius: 20px;
                font-weight: bold;
                z-index: 1000;
            `;
            videoElement.parentElement.appendChild(timerDisplay);
        }

        // Update timer every second
        const updateTimer = () => {
            if (!isRecording) {
                if (timerDisplay) timerDisplay.remove();
                return;
            }

            const elapsed = (Date.now() - recordingStartTime) / 1000;
            const remaining = MAX_VIDEO_DURATION - elapsed;
            timerDisplay.textContent = `🔴 ${remaining.toFixed(0)}s`;

            setTimeout(updateTimer, 1000);
        };

        updateTimer();
    } else if (timerDisplay) {
        timerDisplay.remove();
    }
}

// ============================================================================
// CV BARCODE DETECTION & AUTO-ZOOM
// ============================================================================

function startBarcodeDetection() {
    if (!window.BarcodeDetector) {
        console.log('⚠️ Barcode detection not supported in this browser');
        return;
    }

    console.log('🔍 Starting barcode detection...');

    barcodeDetectionTimer = setInterval(async () => {
        await detectAndZoomBarcode();
    }, BARCODE_DETECTION_INTERVAL);
}

function stopBarcodeDetection() {
    if (barcodeDetectionTimer) {
        clearInterval(barcodeDetectionTimer);
        barcodeDetectionTimer = null;
        console.log('🛑 Barcode detection stopped');
    }
}

async function detectAndZoomBarcode() {
    if (!videoElement || !currentStream) return;

    try {
        const barcodeDetector = new BarcodeDetector({
            formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
        });

        const barcodes = await barcodeDetector.detect(videoElement);

        if (barcodes.length > 0) {
            const barcode = barcodes[0];
            console.log(`📊 Barcode detected: ${barcode.rawValue}`);

            // Calculate barcode position and size
            const bounds = barcode.boundingBox;
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;

            // Zoom in if barcode is small
            const barcodeArea = bounds.width * bounds.height;
            const videoArea = videoElement.videoWidth * videoElement.videoHeight;
            const fillRatio = barcodeArea / videoArea;

            if (fillRatio < 0.1 && currentZoom < maxZoom) {
                // Barcode is small, zoom in
                await setZoom(Math.min(currentZoom * 1.2, maxZoom));
                console.log(`🔍 Auto-zoom to ${currentZoom.toFixed(1)}x`);
            }

            // Highlight barcode on video overlay (optional)
            highlightBarcode(bounds);
        }

    } catch (error) {
        // Barcode detection not supported or failed
        stopBarcodeDetection();
    }
}

function highlightBarcode(bounds) {
    // Create or update overlay canvas
    let overlay = document.getElementById('barcodeOverlay');
    if (!overlay) {
        overlay = document.createElement('canvas');
        overlay.id = 'barcodeOverlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 999;
        `;
        videoElement.parentElement.appendChild(overlay);
    }

    overlay.width = videoElement.clientWidth;
    overlay.height = videoElement.clientHeight;

    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw rectangle around barcode
    const scaleX = overlay.width / videoElement.videoWidth;
    const scaleY = overlay.height / videoElement.videoHeight;

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.strokeRect(
        bounds.x * scaleX,
        bounds.y * scaleY,
        bounds.width * scaleX,
        bounds.height * scaleY
    );

    // Clear after 500ms
    setTimeout(() => {
        ctx.clearRect(0, 0, overlay.width, overlay.height);
    }, 500);
}

// ============================================================================
// PINCH ZOOM (existing implementation)
// ============================================================================

function setupTouchGestures() {
    if (!videoElement) return;

    videoElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    videoElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    videoElement.addEventListener('touchend', handleTouchEnd, { passive: false });

    console.log('✅ Touch gestures enabled');
}

function handleTouchStart(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        isGesturing = true;
        touchDistance = getTouchDistance(e.touches[0], e.touches[1]);
    }
}

function handleTouchMove(e) {
    if (!isGesturing || e.touches.length !== 2) return;

    e.preventDefault();

    const newDistance = getTouchDistance(e.touches[0], e.touches[1]);
    const scale = newDistance / touchDistance;

    const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom * scale));
    setZoom(newZoom);

    touchDistance = newDistance;
}

function handleTouchEnd(e) {
    if (e.touches.length < 2) {
        isGesturing = false;
    }
}

function getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

async function setZoom(zoom) {
    if (!videoTrack || !capabilities || !capabilities.zoom) return;

    currentZoom = Math.max(minZoom, Math.min(maxZoom, zoom));

    try {
        await videoTrack.applyConstraints({
            advanced: [{ zoom: currentZoom }]
        });
    } catch (error) {
        console.error('Zoom error:', error);
    }
}

// ============================================================================
// EXPORT MODULE FUNCTIONS
// ============================================================================

window.cameraModule = {
    init: initCamera,
    stop: stopCamera,
    takePhoto: takePhoto,
    startRecording: startRecording,
    stopRecording: stopRecording,
    toggleFlash: toggleFlash,
    setZoom: setZoom,
    getCurrentZoom: () => currentZoom,
    getCapabilities: () => capabilities,
    getOrientation: () => currentOrientation,
    lockOrientation: (locked) => { orientationLocked = locked; }
};

// Legacy exports for compatibility
window.initCamera = initCamera;
window.stopCamera = stopCamera;
window.takePhoto = takePhoto;
window.toggleRecording = () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
};

console.log('✅ Camera module v2.3.0 loaded');

})();
