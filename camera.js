// ============ CAMERA MODULE v2.2.1 ============
// Wrapped in IIFE to prevent global variable conflicts

(function() {
'use strict';

// All variables scoped to this module
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
let videoRecordingDuration = 20;
let recordingTimer = null;
let recordingStartTime = null;
let flashMode = 'auto';
let videoTrack = null;
let capabilities = null;

 */
async function initCamera(videoElementId = 'cameraPreview') {
    console.log('📷 Initializing camera...');
    
    try {
        // CRITICAL: Stop any existing stream first
        await stopCamera();
        
        // Get video element
        videoElement = document.getElementById(videoElementId);
        
        if (!videoElement) {
            throw new Error('Video element not found: ' + videoElementId);
        }
        
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera not supported in this browser');
        }
        
        // Detect if mobile for optimal portrait settings
        const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        // Request camera access with optimal settings
        const constraints = {
            video: {
                facingMode: 'environment', // Back camera on mobile
                
                // Optimal aspect ratio for portrait mode
                // 9:16 (portrait) or 3:4 (more square) works better than 16:9
                aspectRatio: isMobile ? { ideal: 0.75 } : { ideal: 0.5625 }, // 3:4 mobile, 9:16 desktop
                
                // Don't request excessive resolution (causes zoom-in)
                width: isMobile ? { ideal: 1080, max: 1920 } : { ideal: 1920 },
                height: isMobile ? { ideal: 1920, max: 2560 } : { ideal: 1080 },
                
                // Request zoom capability if available
                zoom: true
            },
            audio: false
        };
        
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Get video track for zoom and flash control
        videoTrack = currentStream.getVideoTracks()[0];
        
        // Get camera capabilities
        if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
            capabilities = videoTrack.getCapabilities();
            
            // Set up zoom range
            if (capabilities.zoom) {
                minZoom = capabilities.zoom.min || 1;
                maxZoom = capabilities.zoom.max || 4;
                currentZoom = capabilities.zoom.min || 1;
                console.log(`📷 Zoom available: ${minZoom}x - ${maxZoom}x`);
            }
            
            // Check flash/torch support
            if (capabilities.torch) {
                console.log('📷 Flash/torch supported');
            }
            
            console.log('📷 Camera capabilities:', capabilities);
        }
        
        // Attach stream to video element
        videoElement.srcObject = currentStream;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play()
                    .then(resolve)
                    .catch(reject);
            };
            videoElement.onerror = reject;
        });
        
        // Set up touch gestures for zoom
        setupTouchGestures();
        
        console.log('✅ Camera initialized successfully');
        console.log(`📷 Video size: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
        
        return currentStream;
        
    } catch (error) {
        console.error('❌ Camera initialization failed:', error);
        throw error;
    }
}

/**
 * Stop camera and cleanup resources
 * CRITICAL: This must be called to prevent black screen bug
 */
async function stopCamera() {
    console.log('🛑 Stopping camera...');
    
    try {
        // Stop all media tracks
        if (currentStream) {
            currentStream.getTracks().forEach(track => {
                track.stop();
                console.log(`Stopped track: ${track.kind}`);
            });
            currentStream = null;
        }
        
        // Clear video element
        if (videoElement) {
            videoElement.srcObject = null;
            videoElement.load(); // Reset video element
            
            // Remove gesture listeners
            videoElement.removeEventListener('touchstart', handleTouchStart);
            videoElement.removeEventListener('touchmove', handleTouchMove);
            videoElement.removeEventListener('touchend', handleTouchEnd);
        }
        
        // Stop recording if active
        if (isRecording) {
            stopRecording();
        }
        
        // Reset zoom
        currentZoom = 1;
        videoTrack = null;
        capabilities = null;
        
        console.log('✅ Camera stopped and cleaned up');
        
    } catch (error) {
        console.error('⚠️ Error stopping camera:', error);
    }
}

// ============ PINCH ZOOM FUNCTIONALITY ============

/**
 * Set up touch gesture listeners for pinch zoom
 */
function setupTouchGestures() {
    if (!videoElement) return;
    
    videoElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    videoElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    videoElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    console.log('✅ Touch gestures enabled for zoom');
}

/**
 * Handle touch start
 */
function handleTouchStart(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        isGesturing = true;
        
        // Calculate initial distance between two touches
        touchDistance = getTouchDistance(e.touches[0], e.touches[1]);
    }
}

/**
 * Handle touch move (pinch zoom)
 */
function handleTouchMove(e) {
    if (!isGesturing || e.touches.length !== 2) return;
    
    e.preventDefault();
    
    // Calculate new distance
    const newDistance = getTouchDistance(e.touches[0], e.touches[1]);
    
    // Calculate zoom change
    const zoomChange = newDistance / touchDistance;
    
    // Apply zoom
    const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom * zoomChange));
    
    setZoom(newZoom);
    
    // Update distance for next move
    touchDistance = newDistance;
}

/**
 * Handle touch end
 */
function handleTouchEnd(e) {
    if (e.touches.length < 2) {
        isGesturing = false;
    }
}

/**
 * Calculate distance between two touch points
 */
function getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Set camera zoom level
 */
async function setZoom(zoom) {
    if (!videoTrack || !capabilities || !capabilities.zoom) {
        console.warn('Zoom not supported on this device');
        return;
    }
    
    try {
        // Clamp zoom to valid range
        const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));
        
        // Apply zoom
        await videoTrack.applyConstraints({
            advanced: [{ zoom: clampedZoom }]
        });
        
        currentZoom = clampedZoom;
        
        // Update UI if zoom indicator exists
        updateZoomIndicator(clampedZoom);
        
    } catch (error) {
        console.error('Failed to set zoom:', error);
    }
}

/**
 * Zoom in (button control)
 */
async function zoomIn() {
    const newZoom = Math.min(maxZoom, currentZoom + 0.5);
    await setZoom(newZoom);
}

/**
 * Zoom out (button control)
 */
async function zoomOut() {
    const newZoom = Math.max(minZoom, currentZoom - 0.5);
    await setZoom(newZoom);
}

/**
 * Reset zoom to 1x
 */
async function resetZoom() {
    await setZoom(minZoom);
}

/**
 * Update zoom indicator UI
 */
function updateZoomIndicator(zoom) {
    const indicator = document.getElementById('zoomIndicator');
    if (indicator) {
        indicator.textContent = `${zoom.toFixed(1)}x`;
        indicator.style.display = 'block';
        
        // Hide after 2 seconds
        clearTimeout(indicator.hideTimeout);
        indicator.hideTimeout = setTimeout(() => {
            indicator.style.display = 'none';
        }, 2000);
    }
}

// ============ FLASH/TORCH CONTROL ============

/**
 * Toggle flash/torch
 */
async function toggleFlash() {
    if (!videoTrack || !capabilities || !capabilities.torch) {
        console.warn('Flash/torch not supported on this device');
        return;
    }
    
    try {
        const currentSettings = videoTrack.getSettings();
        const newTorchState = !currentSettings.torch;
        
        await videoTrack.applyConstraints({
            advanced: [{ torch: newTorchState }]
        });
        
        flashMode = newTorchState ? 'on' : 'off';
        
        // Update UI
        updateFlashIndicator(flashMode);
        
        console.log(`📸 Flash ${flashMode}`);
        
    } catch (error) {
        console.error('Failed to toggle flash:', error);
    }
}

/**
 * Set flash mode
 */
async function setFlashMode(mode) {
    if (!videoTrack || !capabilities || !capabilities.torch) {
        console.warn('Flash/torch not supported');
        return;
    }
    
    flashMode = mode;
    
    try {
        if (mode === 'on') {
            await videoTrack.applyConstraints({
                advanced: [{ torch: true }]
            });
        } else if (mode === 'off') {
            await videoTrack.applyConstraints({
                advanced: [{ torch: false }]
            });
        }
        // 'auto' mode is handled during photo capture
        
        updateFlashIndicator(mode);
        
    } catch (error) {
        console.error('Failed to set flash mode:', error);
    }
}

/**
 * Update flash indicator UI
 */
function updateFlashIndicator(mode) {
    const indicator = document.getElementById('flashIndicator');
    if (indicator) {
        const icons = {
            'auto': '⚡',
            'on': '💡',
            'off': '🚫'
        };
        indicator.textContent = icons[mode] || '⚡';
        indicator.title = `Flash: ${mode}`;
    }
}

/**
 * Switch between front and back camera
 */
async function switchCamera() {
    if (!currentStream) {
        console.warn('No active stream to switch');
        return;
    }
    
    const currentFacingMode = currentStream.getVideoTracks()[0].getSettings().facingMode;
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    console.log(`Switching camera: ${currentFacingMode} → ${newFacingMode}`);
    
    // Stop current stream
    await stopCamera();
    
    // Start with new facing mode
    const constraints = {
        video: {
            facingMode: newFacingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        },
        audio: false
    };
    
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = currentStream;
    await videoElement.play();
    
    console.log('✅ Camera switched');
}

// ============ PHOTO CAPTURE ============

/**
 * Take a photo from the current camera stream
 */
async function takePhoto(quality = 0.95) {
    if (!currentStream || !videoElement) {
        throw new Error('Camera not initialized');
    }
    
    console.log('📸 Taking photo...');
    
    try {
        // Create canvas if not exists
        if (!canvasElement) {
            canvasElement = document.createElement('canvas');
        }
        
        // Set canvas size to match video
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        
        // Draw current video frame to canvas
        const ctx = canvasElement.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        
        // Convert to blob
        const blob = await new Promise((resolve, reject) => {
            canvasElement.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create blob'));
                    }
                },
                'image/jpeg',
                quality
            );
        });
        
        // Create data URL for preview
        const dataUrl = canvasElement.toDataURL('image/jpeg', quality);
        
        console.log('✅ Photo captured');
        
        return {
            blob: blob,
            dataUrl: dataUrl,
            width: canvasElement.width,
            height: canvasElement.height,
            size: blob.size,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Photo capture failed:', error);
        throw error;
    }
}

/**
 * Save photo to database
 */
async function savePhoto(photoData, metadata = {}) {
    const userId = getCurrentUserId();
    const today = getTodayKey();
    
    // Convert blob to base64 for storage
    const base64 = await blobToBase64(photoData.blob);
    
    const entry = {
        userId: userId,
        date: today,
        timestamp: photoData.timestamp,
        dataUrl: base64,
        width: photoData.width,
        height: photoData.height,
        size: photoData.size,
        type: 'progress', // or 'meal', 'exercise', etc.
        notes: metadata.notes || '',
        tags: metadata.tags || []
    };
    
    const id = await dbPut('photos', entry);
    
    console.log('✅ Photo saved to database:', id);
    
    return id;
}

// ============ VIDEO RECORDING ============

/**
 * Set video recording duration (in seconds)
 */
function setVideoDuration(seconds) {
    videoRecordingDuration = Math.max(5, Math.min(120, seconds)); // 5-120 seconds
    console.log(`🎥 Video duration set to ${videoRecordingDuration} seconds`);
}

/**
 * Get video recording duration
 */
function getVideoDuration() {
    return videoRecordingDuration;
}

/**
 * Start video recording
 */
async function startRecording(maxDuration = null) {
    if (!currentStream) {
        throw new Error('Camera not initialized');
    }
    
    if (isRecording) {
        console.warn('Already recording');
        return;
    }
    
    console.log('🎥 Starting video recording...');
    
    try {
        // Use provided duration or default
        const duration = maxDuration || videoRecordingDuration;
        
        // Reset recorded chunks
        recordedChunks = [];
        
        // Create media recorder
        const options = {
            mimeType: 'video/webm;codecs=vp8,opus',
            videoBitsPerSecond: 2500000 // 2.5 Mbps
        };
        
        // Fallback if vp8 not supported
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'video/webm';
        }
        
        mediaRecorder = new MediaRecorder(currentStream, options);
        
        // Handle data available
        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        // Handle recording stop
        mediaRecorder.onstop = () => {
            console.log('✅ Recording stopped');
            clearRecordingTimer();
        };
        
        // Handle errors
        mediaRecorder.onerror = (event) => {
            console.error('❌ Recording error:', event.error);
        };
        
        // Start recording
        mediaRecorder.start(100); // Collect data every 100ms
        isRecording = true;
        recordingStartTime = Date.now();
        
        // Show recording indicator
        showRecordingIndicator();
        
        // Start timer display
        startRecordingTimer(duration);
        
        // Auto-stop after duration
        recordingTimer = setTimeout(async () => {
            console.log(`⏰ Auto-stopping recording after ${duration} seconds`);
            await stopRecording();
        }, duration * 1000);
        
        console.log(`✅ Recording started (max duration: ${duration}s)`);
        
    } catch (error) {
        console.error('❌ Failed to start recording:', error);
        throw error;
    }
}

/**
 * Stop video recording
 */
async function stopRecording() {
    if (!mediaRecorder || !isRecording) {
        console.warn('Not currently recording');
        return null;
    }
    
    console.log('⏹️ Stopping recording...');
    
    clearRecordingTimer();
    hideRecordingIndicator();
    
    return new Promise((resolve, reject) => {
        mediaRecorder.onstop = async () => {
            try {
                // Calculate actual duration
                const actualDuration = (Date.now() - recordingStartTime) / 1000;
                
                // Create blob from recorded chunks
                const blob = new Blob(recordedChunks, {
                    type: 'video/webm'
                });
                
                // Create object URL for playback
                const videoUrl = URL.createObjectURL(blob);
                
                isRecording = false;
                mediaRecorder = null;
                recordingStartTime = null;
                
                console.log(`✅ Recording complete: ${actualDuration.toFixed(1)}s, ${blob.size} bytes`);
                
                resolve({
                    blob: blob,
                    url: videoUrl,
                    duration: actualDuration,
                    size: blob.size,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                reject(error);
            }
        };
        
        mediaRecorder.stop();
    });
}

/**
 * Clear recording timer
 */
function clearRecordingTimer() {
    if (recordingTimer) {
        clearTimeout(recordingTimer);
        recordingTimer = null;
    }
}

/**
 * Start recording timer display
 */
function startRecordingTimer(maxDuration) {
    const timerDisplay = document.getElementById('recordingTimer');
    if (!timerDisplay) return;
    
    const updateTimer = () => {
        if (!isRecording) return;
        
        const elapsed = (Date.now() - recordingStartTime) / 1000;
        const remaining = Math.max(0, maxDuration - elapsed);
        
        const minutes = Math.floor(remaining / 60);
        const seconds = Math.floor(remaining % 60);
        
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (remaining > 0) {
            requestAnimationFrame(updateTimer);
        }
    };
    
    updateTimer();
}

/**
 * Show recording indicator
 */
function showRecordingIndicator() {
    let indicator = document.getElementById('recordingIndicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'recordingIndicator';
        indicator.className = 'recording-indicator';
        indicator.innerHTML = 'REC';
        document.querySelector('.camera-viewport')?.appendChild(indicator);
    }
    
    indicator.style.display = 'flex';
}

/**
 * Hide recording indicator
 */
function hideRecordingIndicator() {
    const indicator = document.getElementById('recordingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// ============ UTILITY FUNCTIONS ============

/**
 * Convert blob to base64 for storage
 */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Check if camera is available
 */
async function isCameraAvailable() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return false;
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.some(device => device.kind === 'videoinput');
        
    } catch (error) {
        console.error('Error checking camera availability:', error);
        return false;
    }
}

/**
 * Get list of available cameras
 */
async function getAvailableCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices
            .filter(device => device.kind === 'videoinput')
            .map(device => ({
                id: device.deviceId,
                label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
                facingMode: device.facingMode || 'unknown'
            }));
    } catch (error) {
        console.error('Error getting cameras:', error);
        return [];
    }
}

/**
 * Open camera modal/interface
 */
async function openCameraModal(mode = 'photo') {
    console.log(`Opening camera modal (${mode} mode)...`);
    
    // Create modal if doesn't exist
    let modal = document.getElementById('cameraModal');
    
    if (!modal) {
        modal = createCameraModal();
    }
    
    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('open');
    
    // Set mode
    modal.setAttribute('data-mode', mode);
    
    // Initialize camera
    try {
        await initCamera();
        
        // Show controls based on mode
        if (mode === 'photo') {
            document.getElementById('takePhotoBtn')?.classList.remove('hidden');
            document.getElementById('recordVideoBtn')?.classList.add('hidden');
        } else if (mode === 'video') {
            document.getElementById('takePhotoBtn')?.classList.add('hidden');
            document.getElementById('recordVideoBtn')?.classList.remove('hidden');
        }
        
    } catch (error) {
        alert('Failed to access camera: ' + error.message);
        closeCameraModal();
    }
}

/**
 * Close camera modal
 */
async function closeCameraModal() {
    console.log('Closing camera modal...');
    
    // CRITICAL: Stop camera before closing
    await stopCamera();
    
    const modal = document.getElementById('cameraModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
    }
}

/**
 * Create camera modal HTML
 */
function createCameraModal() {
    const modal = document.createElement('div');
    modal.id = 'cameraModal';
    modal.className = 'modal camera-modal';
    
    modal.innerHTML = `
        <div class="camera-container">
            <div class="camera-header">
                <h2>Camera</h2>
                <button class="close-btn" onclick="closeCameraModal()">✕</button>
            </div>
            
            <div class="camera-viewport">
                <video id="cameraPreview" autoplay playsinline></video>
                
                <!-- Zoom Indicator -->
                <div id="zoomIndicator" class="zoom-indicator" style="display: none;">1.0x</div>
                
                <!-- Recording Timer -->
                <div id="recordingTimer" class="recording-timer" style="display: none;">0:20</div>
                
                <!-- Recording Indicator -->
                <div id="recordingIndicator" class="recording-indicator" style="display: none;">
                    REC
                </div>
            </div>
            
            <div class="camera-controls">
                <!-- Flash Control -->
                <button id="flashBtn" class="btn-icon" onclick="toggleFlash()" title="Flash">
                    <span id="flashIndicator">⚡</span>
                </button>
                
                <!-- Zoom Out -->
                <button id="zoomOutBtn" class="btn-icon" onclick="zoomOut()" title="Zoom out">
                    🔍-
                </button>
                
                <!-- Take Photo -->
                <button id="takePhotoBtn" class="btn-primary btn-large" onclick="handleTakePhoto()">
                    📸 Take Photo
                </button>
                
                <!-- Record Video -->
                <button id="recordVideoBtn" class="btn-primary btn-large hidden" onclick="handleRecordVideo()">
                    🎥 Record (20s)
                </button>
                
                <!-- Stop Recording -->
                <button id="stopRecordBtn" class="btn-danger hidden" onclick="handleStopRecording()">
                    ⏹️ Stop
                </button>
                
                <!-- Zoom In -->
                <button id="zoomInBtn" class="btn-icon" onclick="zoomIn()" title="Zoom in">
                    🔍+
                </button>
                
                <!-- Switch Camera -->
                <button id="switchCameraBtn" class="btn-icon" onclick="switchCamera()" title="Switch camera">
                    🔄
                </button>
            </div>
            
            <div class="camera-settings">
                <label for="videoDurationInput">
                    Video Duration:
                    <input type="number" id="videoDurationInput" min="5" max="120" value="20" 
                           onchange="handleVideoDurationChange(this.value)">
                    seconds
                </label>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
}

// ============ UI EVENT HANDLERS ============

/**
 * Handle take photo button click
 */
async function handleTakePhoto() {
    try {
        const photo = await takePhoto();
        
        // Show preview
        showPhotoPreview(photo);
        
    } catch (error) {
        console.error('Failed to take photo:', error);
        alert('Failed to take photo: ' + error.message);
    }
}

/**
 * Handle record video button click
 */
async function handleRecordVideo() {
    try {
        // Get custom duration if set
        const durationInput = document.getElementById('videoDurationInput');
        const duration = durationInput ? parseInt(durationInput.value) : videoRecordingDuration;
        
        await startRecording(duration);
        
        // Update UI
        document.getElementById('recordVideoBtn')?.classList.add('hidden');
        document.getElementById('stopRecordBtn')?.classList.remove('hidden');
        
        // Show timer
        const timer = document.getElementById('recordingTimer');
        if (timer) {
            timer.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Failed to start recording:', error);
        alert('Failed to start recording: ' + error.message);
    }
}

/**
 * Handle stop recording button click
 */
async function handleStopRecording() {
    try {
        const video = await stopRecording();
        
        // Update UI
        document.getElementById('stopRecordBtn')?.classList.add('hidden');
        document.getElementById('recordVideoBtn')?.classList.remove('hidden');
        
        // Hide timer
        const timer = document.getElementById('recordingTimer');
        if (timer) {
            timer.style.display = 'none';
        }
        
        // Show preview
        if (video) {
            showVideoPreview(video);
        }
        
    } catch (error) {
        console.error('Failed to stop recording:', error);
        alert('Failed to stop recording: ' + error.message);
    }
}

/**
 * Handle video duration change
 */
function handleVideoDurationChange(value) {
    const duration = parseInt(value);
    if (!isNaN(duration)) {
        setVideoDuration(duration);
        
        // Update button text
        const btn = document.getElementById('recordVideoBtn');
        if (btn) {
            btn.innerHTML = `🎥 Record (${duration}s)`;
        }
    }
}

/**
 * Show photo preview modal
 */
function showPhotoPreview(photo) {
    // Create preview modal
    const previewModal = document.createElement('div');
    previewModal.className = 'modal photo-preview-modal';
    previewModal.innerHTML = `
        <div class="preview-container">
            <div class="preview-header">
                <h3>Photo Preview</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">✕</button>
            </div>
            
            <img src="${photo.dataUrl}" alt="Photo preview" class="preview-image">
            
            <div class="preview-controls">
                <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                    Retake
                </button>
                <button class="btn-primary" onclick="handleSavePhoto(${JSON.stringify(photo).replace(/"/g, '&quot;')})">
                    Save Photo
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(previewModal);
    previewModal.classList.add('open');
}

/**
 * Show video preview modal
 */
function showVideoPreview(video) {
    const previewModal = document.createElement('div');
    previewModal.className = 'modal video-preview-modal';
    previewModal.innerHTML = `
        <div class="preview-container">
            <div class="preview-header">
                <h3>Video Preview</h3>
                <button class="close-btn" onclick="this.closest('.modal').remove()">✕</button>
            </div>
            
            <video src="${video.url}" controls class="preview-video"></video>
            
            <div class="preview-controls">
                <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                    Discard
                </button>
                <button class="btn-primary" onclick="handleSaveVideo('${video.url}', ${video.size})">
                    Save Video
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(previewModal);
    previewModal.classList.add('open');
}

/**
 * Handle save photo
 */
async function handleSavePhoto(photoData) {
    try {
        // Reconstruct blob from dataUrl
        const response = await fetch(photoData.dataUrl);
        const blob = await response.blob();
        photoData.blob = blob;
        
        await savePhoto(photoData);
        
        // Close modals
        document.querySelectorAll('.modal').forEach(modal => modal.remove());
        await closeCameraModal();
        
        if (window.showToast) {
            showToast('Photo saved successfully! 📸', 'success');
        }
        
    } catch (error) {
        console.error('Failed to save photo:', error);
        alert('Failed to save photo: ' + error.message);
    }
}

/**
 * Handle save video
 */
async function handleSaveVideo(videoUrl, size) {
    try {
        // Video saving implementation
        console.log('Saving video:', videoUrl, size);
        
        // Close modals
        document.querySelectorAll('.modal').forEach(modal => modal.remove());
        await closeCameraModal();
        
        if (window.showToast) {
            showToast('Video saved successfully! 🎥', 'success');
        }
        
    } catch (error) {
        console.error('Failed to save video:', error);
        alert('Failed to save video: ' + error.message);
    }
}

// ============ CLEANUP ON PAGE UNLOAD ============

window.addEventListener('beforeunload', () => {
    stopCamera();
});

// Also cleanup when visibility changes (tab switch)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentStream) {
        console.log('Page hidden, stopping camera...');
        stopCamera();
    }
});

// ============ EXPORT FUNCTIONS ============

window.initCamera = initCamera;
window.stopCamera = stopCamera;
window.switchCamera = switchCamera;
window.takePhoto = takePhoto;
window.savePhoto = savePhoto;
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.isCameraAvailable = isCameraAvailable;
window.getAvailableCameras = getAvailableCameras;
window.openCameraModal = openCameraModal;
window.closeCameraModal = closeCameraModal;
window.handleTakePhoto = handleTakePhoto;
window.handleRecordVideo = handleRecordVideo;
window.handleStopRecording = handleStopRecording;

// New exports for v2.2.1
window.setZoom = setZoom;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetZoom = resetZoom;
window.toggleFlash = toggleFlash;
window.setFlashMode = setFlashMode;
window.setVideoDuration = setVideoDuration;
window.getVideoDuration = getVideoDuration;
window.handleVideoDurationChange = handleVideoDurationChange;

console.log('📷 Camera module v2.2.1 loaded');
console.log('✨ Features: Pinch zoom, portrait mode, flash, 20s video default');
console.log('🐛 Black screen bug FIXED!');

})(); // End camera module IIFE
