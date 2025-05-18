

//     // Integrity monitoring variables
let tabChangeCount = 0;
let mouseOutCount = 0;
let fullscreenExitCount = 0;
let copyAttemptCount = 0;
let pasteAttemptCount = 0;
let focusChangeCount = 0;
let refreshViolationCount = 0;
let isFullscreenActive = false;
let totalViolations = 0;
let lastTabFocusTime = 0;
const TAB_FOCUS_COOLDOWN = 1000;
const MAX_ALLOWED_REFRESHES = 2; 
let resizeAttempts = 0;
let lastResizeTime = 0;
const RESIZE_COOLDOWN = 500; 
const MAX_RESIZE_ATTEMPTS = 2;

// Add refreshViolationCount to the updateUI function
function updateUI() {
    if (localStorage.getItem('examStarted')=="true"){
    document.getElementById('tabChangeCount').textContent = tabChangeCount;
    document.getElementById('mouseOutCount').textContent = mouseOutCount;
    document.getElementById('fullscreenExitCount').textContent = fullscreenExitCount;
    document.getElementById('copyAttemptCount').textContent = copyAttemptCount;
    document.getElementById('pasteAttemptCount').textContent = pasteAttemptCount;
    document.getElementById('focusChangeCount').textContent = focusChangeCount;
    document.getElementById('refreshViolationCount').textContent = refreshViolationCount; // Add this line
    document.getElementById('totalViolations').textContent = totalViolations;
    }
}
function showViolationModal() {
    // Create modal container
    const modalOverlay = document.createElement('div');
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100%';
    modalOverlay.style.height = '100%';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.zIndex = '10000';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#fff';
    modalContent.style.padding = '25px';
    modalContent.style.borderRadius = '10px';
    modalContent.style.maxWidth = '500px';
    modalContent.style.width = '80%';
    modalContent.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
    modalContent.style.textAlign = 'center';
    
    // Add warning icon
    const warningIcon = document.createElement('div');
    warningIcon.innerHTML = '⚠️';
    warningIcon.style.fontSize = '4rem';
    warningIcon.style.marginBottom = '15px';
    modalContent.appendChild(warningIcon);
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = 'Critical Violation Alert';
    title.style.color = '#d9534f';
    title.style.marginBottom = '15px';
    modalContent.appendChild(title);
    
    // Add message
    const message = document.createElement('p');
    message.textContent = `You have committed 3 or more integrity violations. Your exam will be automatically submitted.`;
    message.style.marginBottom = '20px';
    message.style.fontSize = '1.1rem';
    modalContent.appendChild(message);
    
    // Add violations list
    const violationsList = document.createElement('div');
    violationsList.style.textAlign = 'left';
    violationsList.style.marginBottom = '20px';
    violationsList.style.padding = '10px';
    violationsList.style.backgroundColor = '#f8d7da';
    violationsList.style.borderRadius = '5px';
    
    let violationsHTML = '<strong>Violations detected:</strong><ul style="margin-top: 10px;">';
    
    // Add each violation type with count
    if (tabChangeCount > 0) violationsHTML += `<li>Tab changes: ${tabChangeCount}</li>`;
    if (mouseOutCount > 0) violationsHTML += `<li>Mouse left window: ${mouseOutCount}</li>`;
    if (fullscreenExitCount > 0) violationsHTML += `<li>Fullscreen exits: ${fullscreenExitCount}</li>`;
    if (copyAttemptCount > 0) violationsHTML += `<li>Copy attempts: ${copyAttemptCount}</li>`;
    if (pasteAttemptCount > 0) violationsHTML += `<li>Paste attempts: ${pasteAttemptCount}</li>`;
    if (focusChangeCount > 0) violationsHTML += `<li>Focus changes: ${focusChangeCount}</li>`;
    if (refreshViolationCount > 0) violationsHTML += `<li>Page refreshes: ${refreshViolationCount}</li>`;
    
    violationsHTML += '</ul>';
    violationsList.innerHTML = violationsHTML;
    modalContent.appendChild(violationsList);
    
    // Add countdown text
    const countdown = document.createElement('p');
    countdown.textContent = 'Submitting exam in 5 seconds...';
    countdown.style.fontWeight = 'bold';
    modalContent.appendChild(countdown);
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Start countdown
    let seconds = 5;
    const countdownInterval = setInterval(() => {
        seconds--;
        countdown.textContent = `Submitting exam in ${seconds} second${seconds !== 1 ? 's' : ''}...`;
        
        if (seconds <= 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);
    
    return modalOverlay;
}
function showNotification(message, type = 'warning') {
    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notificationContainer';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '10px';
        notificationContainer.style.right = '10px';
        notificationContainer.style.zIndex = '9999';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.backgroundColor = type === 'warning' ? '#fff3cd' : '#f8d7da';
    notification.style.color = type === 'warning' ? '#856404' : '#721c24';
    notification.style.padding = '10px 15px';
    notification.style.marginBottom = '10px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.width = '300px';
    notification.style.animation = 'fadeIn 0.3s ease-out';
    notification.innerHTML = message;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 8000);
    
    return notification;
}

window.addEventListener('resize', () => {
    if (localStorage.getItem('examStarted') == "true") {
        const currentTime = Date.now();
        // Check if we're within the cooldown period
        if (currentTime - lastResizeTime < RESIZE_COOLDOWN) {
            // Count this as another attempt within the same period
            resizeAttempts++;
            
            // Check if max attempts exceeded
            if (resizeAttempts >= MAX_RESIZE_ATTEMPTS) {
                // Only show notification and count as violation if not due to Mac-specific events
                // like Mission Control or fullscreen transitions
                if (Math.abs(window.innerHeight - window.screen.height) > 100) {
                    showNotification(`DevTools detected! Your exam is being monitored.`, 'error');
                    
                    // Show the violation modal and submit exam after delay
                    const modalOverlay = showViolationModal();
                    setTimeout(() => {
                        submitExam("resize_violations");
                    }, 5000);
                }
            }
        } else {
            // First resize attempt in a new period
            resizeAttempts = 1;
            if(resizeAttempts > 1) {
                showNotification(`Window resize detected. This is being monitored.`);
            }
        }
        
        // Update the timestamp
        lastResizeTime = currentTime;
        
        // Check if total violations are too high
        checkAndSubmitTest();
    }
});



document.addEventListener('contextmenu', event => event.preventDefault());

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }
`;
document.head.appendChild(style);
// Create a function to handle refresh detection
function handleRefreshDetection() {
    // Check if there's a saved refresh count
    let refreshCount = parseInt(localStorage.getItem('examRefreshCount') || '0');
    if(localStorage.getItem('examStarted') == "true"){
        refreshCount++;
        localStorage.setItem('examRefreshCount', refreshCount.toString());
    }
   
    
    // Count this as a violation if it's not the first load
    if (refreshCount > 1) {
        refreshViolationCount = refreshCount - 1; // Don't count the initial load
        totalViolations += 1; // Increment total violations by 1 for this refresh
        
        // Send refresh event to server for logging
        sendIntegrityUpdate("pageRefresh");
        updateStatus("Page refresh detected");
        updateUI();
        
        // Check if exceeded maximum allowed refreshes
        if (refreshCount > MAX_ALLOWED_REFRESHES) {
            showNotification(`Maximum page refreshes (${MAX_ALLOWED_REFRESHES}) exceeded. Your exam is being submitted.`, 'error');
            submitExam("excessive_refreshes");
            return false;
        }
    }
    
    return true;
}

// Modify the DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', function() {
    // Check if exam has started
    const examStarted = localStorage.getItem('examStarted');
    function sendActivityPing() {
        
        fetch('/dashboard/see-active', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                examId: document.querySelector('input[name="examId"]').value,  // Use the template variable
                userId: document.querySelector('input[name="userId"]').value,  // Use the template variable
                timestamp: new Date().toISOString()
            })
        })
        .then(response => {
            if (!response.ok) {
                console.error('Failed to send activity ping');
                
            }else{
                
            }
        })
        .catch(error => {
           
           
        });
    }
    
    // Send first ping immediately
    sendActivityPing();
    const pingInterval = setInterval(sendActivityPing, 20000);

    if (examStarted === 'true') {
        // Add refresh violation elements to the integrity panel
        const integrityCols = document.querySelectorAll('#examin .col-md-6');
        if (integrityCols.length > 1) {
            const refreshViolationItem = document.createElement('div');
            refreshViolationItem.className = 'integrity-item';
            refreshViolationItem.innerHTML = '<strong>Refresh Violations:</strong> <span id="refreshViolationCount" class="badge badge-secondary">0</span>';
            integrityCols[1].appendChild(refreshViolationItem);
        }
        
        // Handle refresh detection
        if (!handleRefreshDetection()) {
            return; // Stop if refresh limit exceeded
        }
        
        // Continue with normal exam loading
        document.getElementById("startExamBtn").style.display = "none";
        document.getElementById("examContent").style.display = "block";
        document.getElementById("examin").style.display = "block"; // Make sure the integrity panel is visible
        
        if (initializeExamTimer()) {
            loadExamState();
            enterFullscreen();
            preventBackButton();
            startWebcamCapture();
        } else {
            // If initialization failed, clear localStorage
            localStorage.removeItem('examStarted');
            localStorage.removeItem('examEndTime');
            localStorage.removeItem('examMcqAnswers');
            localStorage.removeItem('examCodingAnswers');
            localStorage.removeItem('examRefreshCount');
        }
    } else {
        // Add refresh violation element to the integrity panel for when exam starts
        const integrityCols = document.querySelectorAll('#examin .col-md-6');
        if (integrityCols.length > 1) {
            const refreshViolationItem = document.createElement('div');
            refreshViolationItem.className = 'integrity-item';
            refreshViolationItem.innerHTML = '<strong>Refresh Violations:</strong> <span id="refreshViolationCount" class="badge badge-secondary">0</span>';
            integrityCols[1].appendChild(refreshViolationItem);
        }
        
        // Reset refresh count when exam starts
        document.getElementById("startExamBtn").addEventListener("click", function() {
            enterFullscreen()
            localStorage.setItem('examRefreshCount', '0');
            // Rest of your existing start exam code...
        });
    }
    
    // Rest of your existing DOMContentLoaded code...
}); 

// Exam navigation variables

let maxAllowedRefreshes = 2; // Set your desired threshold
// Prevent F5 (refresh) and F11 (fullscreen toggle) keyboard shortcuts

// Add this to the DOMContentLoaded event listener

// Send integrity updates to server
function sendIntegrityUpdate(eventType) {
    if (localStorage.getItem('examStarted')=="true"){
        const data = {
        examId: document.querySelector('input[name="examId"]').value, 
        userId:document.querySelector('input[name="userId"]').value, 
        eventType: eventType
    };

    fetch('/update-integrity', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => console.log('Integrity event logged:', data))
    .catch(error => console.error('Error sending integrity update:', error));
    }

}

// Update UI elements for integrity monitoring

// Update status message
function updateStatus(message) {
    if (localStorage.getItem('examStarted')=="true"){
    document.getElementById('lastEvent').textContent = message;
    }
}

// Handle tab change events
function handleTabChange() {
    if (localStorage.getItem('examStarted')=="true"){
    if (document.hidden) {
        // Only count tab change if it's not immediately after a focus change
        const currentTime = Date.now();
        if (currentTime - lastTabFocusTime > TAB_FOCUS_COOLDOWN) {
            tabChangeCount++;
            totalViolations++;
            sendIntegrityUpdate("tabChanges");
            updateStatus("Tab change detected");
            updateUI();
            checkAndSubmitTest();
        }
    }
}
}

// Handle mouse leaving the window
function handleMouseOut(event) {
    if (localStorage.getItem('examStarted')=="true"){
    if (event.clientX < 0 || event.clientX > window.innerWidth - 1 || event.clientY < 0 || event.clientY > window.innerHeight - 1) {
        mouseOutCount++;
        totalViolations++;
        sendIntegrityUpdate("mouseOuts");
        updateStatus("Mouse left workspace");
        showNotification("Mouse Going Out is not allowed");
        updateUI();
        checkAndSubmitTest();
    }
}
}

// Handle window focus changes
function handleFocusChange(event) {
    if (localStorage.getItem('examStarted')=="true"){
    if (event.type === 'blur') {
        // Only count focus change if it's not immediately after a tab change
        const currentTime = Date.now();
        if (currentTime - lastTabFocusTime > TAB_FOCUS_COOLDOWN) {
            focusChangeCount++;
            lastTabFocusTime = currentTime;
            
            // Check if this is coming from a tab change or standalone focus change
            if (!document.hidden) {
                // If document is not hidden, this is a standalone focus change
                totalViolations++;
                sendIntegrityUpdate("focusChanges");
                updateStatus("Focus change detected");
                updateUI();
                checkAndSubmitTest();
            }
        }
    }
}
}

function enterFullscreen() {
    const elem = document.documentElement;
    
    // Don't attempt to enter fullscreen if already in fullscreen mode
    if (document.fullscreenElement || document.webkitFullscreenElement || 
        document.mozFullScreenElement || document.msFullscreenElement) {
        return;
    }
    
    try {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) { // Safari
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) { // Firefox
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) { // IE/Edge
            elem.msRequestFullscreen();
        }
    } catch (error) {
        console.error("Fullscreen error:", error);
        showNotification("Fullscreen mode failed. Please try again.");
    }
}
// Update the fullscreenchange event listener to handle all browser prefixes
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
document.addEventListener('mozfullscreenchange', handleFullscreenChange); // Firefox
document.addEventListener('MSFullscreenChange', handleFullscreenChange); // IE/Edge
document.addEventListener('visibilitychange', handleTabChange);
window.addEventListener('blur', handleFocusChange);
window.addEventListener('focus', handleFocusChange);
document.addEventListener('copy', (e) => {
    e.preventDefault();
    copyAttemptCount++;
    sendIntegrityUpdate("copyAttempts");
    updateStatus("Copy attempt detected");
    updateUI();
});

document.addEventListener('paste', (e) => {
    e.preventDefault();
    pasteAttemptCount++;
    sendIntegrityUpdate("pasteAttempts");
    updateStatus("Paste attempt detected");
    updateUI();
});

function handleFullscreenChange() {

    if (!document.fullscreenElement && !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && !document.msFullscreenElement) {
        fullscreenExitCount++;
        totalViolations++;
        showNotification("Exiting fullscreen is not allowed during the exam.");
        
        // Give a short delay before forcing back to fullscreen (helps with Mac transition)
        setTimeout(enterFullscreen, 500);
        
        sendIntegrityUpdate("fullscreenExits");
        updateStatus("Fullscreen exited");
        updateUI();
        checkAndSubmitTest();
    } else {
        if (!isFullscreenActive) {
            document.addEventListener('mouseout', handleMouseOut);
            isFullscreenActive = true;
            setTimeout(() => {
                const btn = document.getElementById('myButton');
                if (btn) btn.click();
            }, 2000);
        }
        updateStatus("Fullscreen entered");
    }
}

function startWebcamCapture() {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    // Check if media devices API is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("MediaDevices API not supported");
        showNotification("Your browser doesn't support webcam capture. Please use a modern browser.", 'error');
        return;
    }

    navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: "user"
        } 
    })
    .then((stream) => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        
        // Wait for video to be ready
        video.onloadedmetadata = () => {
            // Set up snapshot interval
            setInterval(() => {
                try {
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    canvas.toBlob((blob) => {
                        if (!blob) return;
                        
                        const formData = new FormData();
                        formData.append('image', blob, `capture-${Date.now()}.png`);
                        formData.append('userId',document.querySelector('input[name="userId"]').value);
                        formData.append('examId', document.querySelector('input[name="examId"]').value);
                        
                        fetch('/save-image', { 
                            method: 'POST',
                            body: formData,
                        })
                        .then(response => response.json())
                        .then(data => console.log('Image saved:', data))
                        .catch(error => console.error('Error saving image:', error));
                    }, 'image/png');
                } catch (err) {
                    console.error("Error capturing webcam frame:", err);
                }
            }, 5000);
        };
    })
    .catch((error) => {
        console.error("Error accessing webcam:", error);
        showNotification("Unable to access the webcam. Please ensure your camera is connected and you've allowed permission.", 'error');
    });
}
function preventBackButton() {
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = function() {
        window.history.pushState(null, "", window.location.href);
    };
}



// Auto-submit test if too many violations
function checkAndSubmitTest() {
    if (localStorage.getItem('examStarted')=="true"){
    if (totalViolations >= 3) {
        updateStatus("Auto-submitting test due to integrity violations");
        const modalOverlay = showViolationModal();
            
            // Set timeout to submit after 5 seconds
            setTimeout(() => {
                // Submit the exam after showing the modal for 5 seconds
                submitExam();
            }, 5000);
        console.log("Auto-submitting test due to 3 or more integrity violations");
        
    }
}
}

// Submit exam with reason
function submitExam(reason = "normal") {
    // Set a flag to prevent refresh detection during submission
    localStorage.setItem('examSubmitting', 'true');
    
    clearInterval(examTimerInterval);
    console.log(`Submitting exam: ${reason}`);
    localStorage.setItem('examStarted', 'false');
    // Clear all localStorage items first
    localStorage.removeItem('examStarted');
    localStorage.removeItem('examEndTime');
    localStorage.removeItem('examMcqAnswers');
    localStorage.removeItem('examCodingAnswers');
    localStorage.removeItem('examRefreshCount');
    
    // Submit the form
    document.getElementById('examForm').submit();
    
    // Use a small timeout before redirect to allow form submission to complete
    setTimeout(() => {
        window.location.href = '/dashboard';
    }, 1000);
}
document.addEventListener('click', () => {
    if (!document.fullscreenElement && examTimerInterval) {
        enterFullscreen();
        updateStatus("Fullscreen mode ensured after click");
    }
});
function updateScreenConfiguration() {
  // Get the screen configuration element
  const screenConfigElement = document.getElementById('screenConfig');
  
  // If the element doesn't exist, return
  if (!screenConfigElement) {
    console.error('Screen configuration element not found');
    return;
  }
  
  // Set a loading message
  screenConfigElement.textContent = 'Detecting screen configuration...';
  
  // Setup timeout to handle case where configuration can't be detected
  const timeout = setTimeout(() => {
    screenConfigElement.textContent = 'Screen configuration unavailable';
  }, 2000);
  
  // Get and display the screen configuration
  try {
    // Get window dimensions
    const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    
    // Get screen dimensions
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    
    // Get device pixel ratio for detecting high-DPI displays
    const pixelRatio = window.devicePixelRatio || 1;
    
    // Get color depth
    const colorDepth = window.screen.colorDepth;
    
    // Clear the timeout since we got the data
    clearTimeout(timeout);
    
    // Format and display the configuration
    const configText = `${width}x${height} (Window), ${screenWidth}x${screenHeight} (Screen), ${pixelRatio}x (Pixel Ratio), ${colorDepth}-bit color`;
    screenConfigElement.textContent = configText;
    
    // Log the configuration for debugging
    console.log('Screen configuration:', configText);
    
    // Return the configuration in case it's needed elsewhere
    return {
      window: { width, height },
      screen: { width: screenWidth, height: screenHeight },
      pixelRatio,
      colorDepth
    };
  } catch (error) {
    // Clear the timeout and show error
    clearTimeout(timeout);
    console.error('Error detecting screen configuration:', error);
    screenConfigElement.textContent = 'Error detecting screen configuration';
  }
}

