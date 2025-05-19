// document.addEventListener('keydown', function(e) {
//  if (
//     e.key === 'F12' ||
//     (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
//     (e.ctrlKey && e.key === 'U')
//   ) {
//     e.preventDefault();
//     console.log("Blocked key:", e.key);
//   }
//   if (e.key === 'Escape') {
//     e.preventDefault(); // Stops the default action (if any)
//     e.stopPropagation(); // Prevents the event from bubbling up
//     console.log('Escape key disabled.');
//   }
//        if (e.key === 'F5' || e.keyCode === 116 || 
//             ((e.metaKey || e.ctrlKey) && e.key === 'r')) {
//             e.preventDefault();
//             e.stopPropagation();
//             showNotification("Page refresh is not allowed during the exam.");
//             return false;
//         }
        
//         // F11 key or Command+Shift+F (Mac fullscreen)
//         if (e.key === 'F11' || e.keyCode === 122 || 
//             (e.metaKey && e.shiftKey && e.key === 'f')) {
//             e.preventDefault();
//             e.stopPropagation();
//             showNotification("Exiting fullscreen is not allowed during the exam.");
//             enterFullscreen(); // Force back to fullscreen
//             return false;
//         }
        
//         // Command+W (Mac window close)
//         if ((e.metaKey && e.key === 'w') || (e.key === 'F4' && e.altKey)) {
//             e.preventDefault();
//             e.stopPropagation();
//             showNotification("Closing the window is not allowed during the exam.");
//             return false;
//         }
//   // Prevent Ctrl+R (refresh)
//   if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.keyCode === 82)) {
//     e.preventDefault();
//     e.stopPropagation();
//     showNotification("Page refresh is not allowed during the exam.");
//     return false;
//   }
// });
// function initializeExamTimer() {
//     // Check if there's a saved timer state
//     const savedEndTime = localStorage.getItem('examEndTime');
    
//     if (savedEndTime) {
//         // Resume timer if already started
//         endTime = parseInt(savedEndTime);
        
//         // Check if the saved end time is in the past
//         if (Date.now() > endTime) {
//             // Clear the saved time and start fresh
//             localStorage.removeItem('examEndTime');
//             endTime = Date.now() + examDuration;
//             localStorage.setItem('examEndTime', endTime);
//         }
//     } else {
//         // Set end time based on exam duration
//         endTime = Date.now() + examDuration;
//         localStorage.setItem('examEndTime', endTime);
//     }
    
//     // Check if we're within the exam schedule window
//     const now = Date.now();
//     if (now < scheduledAt) {
//         alert("The exam has not started yet. Please come back at the scheduled time.");
//         return false;
//     }
    
//     if (now > scheduleTill) {
//         alert("The exam period has ended.");
//         return false;
//     }
    
//     // Start the timer interval
//     examTimerInterval = setInterval(updateExamTimer, 1000);
//     return true;
// }

// function updateExamTimer() {
//     const currentTime = Date.now();
//     timeRemaining = endTime - currentTime;
    
//     if (timeRemaining <= 0) {
//         // Time's up!
//         clearInterval(examTimerInterval);
//         document.getElementById('timeDisplay').textContent = "00:00:00";
//         showNotification("Time's up! Your exam is being submitted.", 'error');
//         submitExam("timeout");
//         return;
//     }

//     // Convert remaining time to hours, minutes, seconds
//     const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
//     const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
//     const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    
//     // Format time as HH:MM:SS
//     const formattedTime = 
//         (hours < 10 ? "0" + hours : hours) + ":" +
//         (minutes < 10 ? "0" + minutes : minutes) + ":" +
//         (seconds < 10 ? "0" + seconds : seconds);
        
//     document.getElementById('timeDisplay').textContent = formattedTime;
    
//     // Create warning if less than 5 minutes remaining
//     if (timeRemaining < 5 * 60 * 1000 && timeRemaining > 4.9 * 60 * 1000) {
//         showNotification("Warning: Less than 5 minutes remaining!");
//     }
    

// }

  let examDuration = 60 * 60 * 1000; // 60 minutes in milliseconds
        let scheduledAt = new Date().getTime(); 
        let scheduleTill = new Date().getTime() + (3 * 60 * 60 * 1000); // 3 hours from now
        let examTimerInterval = null;
        let endTime = null;
        let timeRemaining = examDuration;
        let pingInterval = null;

        // Exam navigation variables
        let currentQuestionType = "mcq";
        let currentQuestionIndex = 0;

        // Question tracking
        let answeredQuestions = {
            mcq: Array(3).fill(false),
            coding: Array(2).fill(false)
        };

        // Integrity Monitoring Variables
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

        // Disable keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (localStorage.getItem('examStarted') === "true") {
                // Prevent dev tools and refresh
                if (e.key === 'F12' || 
                    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || 
                    (e.ctrlKey && e.key === 'U') ||
                    e.key === 'Escape' ||
                    e.key === 'F5' || 
                    ((e.metaKey || e.ctrlKey) && e.key === 'r') ||
                    e.key === 'F11' || 
                    (e.metaKey && e.shiftKey && e.key === 'f') ||
                    (e.metaKey && e.key === 'w') || 
                    (e.key === 'F4' && e.altKey)) {
                        
                    e.preventDefault();
                    e.stopPropagation();
                    showNotification("This action is not allowed during the exam.");
                    return false;
                }
            }
        });

        // Prevent right-click context menu
        document.addEventListener('contextmenu', event => event.preventDefault());

        // Initialize exam timer
        function initializeExamTimer() {
            // Check if there's a saved timer state
            const savedEndTime = localStorage.getItem('examEndTime');
            
            if (savedEndTime) {
                // Resume timer if already started
                endTime = parseInt(savedEndTime);
                
                // Check if the saved end time is in the past
                if (Date.now() > endTime) {
                    // Clear the saved time and start fresh
                    localStorage.removeItem('examEndTime');
                    endTime = Date.now() + examDuration;
                    localStorage.setItem('examEndTime', endTime);
                }
            } else {
                // Set end time based on exam duration
                endTime = Date.now() + examDuration;
                localStorage.setItem('examEndTime', endTime);
            }
            
            // Start the timer interval
            examTimerInterval = setInterval(updateExamTimer, 1000);
            return true;
        }

        // Update the timer display
        function updateExamTimer() {
            const currentTime = Date.now();
            timeRemaining = endTime - currentTime;
            
            if (timeRemaining <= 0) {
                // Time's up!
                clearInterval(examTimerInterval);
                document.getElementById('timeDisplay').textContent = "00:00:00";
                showNotification("Time's up! Your exam is being submitted.", 'error');
                submitExam("timeout");
                return;
            }

            // Convert remaining time to hours, minutes, seconds
            const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
            const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
            
            // Format time as HH:MM:SS
            const formattedTime = 
                (hours < 10 ? "0" + hours : hours) + ":" +
                (minutes < 10 ? "0" + minutes : minutes) + ":" +
                (seconds < 10 ? "0" + seconds : seconds);
                
            document.getElementById('timeDisplay').textContent = formattedTime;
            
            // Create warning if less than 5 minutes remaining
            if (timeRemaining < 5 * 60 * 1000 && timeRemaining > 4.9 * 60 * 1000) {
                showNotification("Warning: Less than 5 minutes remaining!");
            }
        }

        // Notification system
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
            }, 5000);
            
            return notification;
        }

        // Violations modal
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

        // Update UI with current integrity values
        function updateUI() {
            if (localStorage.getItem('examStarted') == "true") {
                document.getElementById('tabChangeCount').textContent = tabChangeCount;
                document.getElementById('mouseOutCount').textContent = mouseOutCount;
                document.getElementById('fullscreenExitCount').textContent = fullscreenExitCount;
                document.getElementById('copyAttemptCount').textContent = copyAttemptCount;
                document.getElementById('pasteAttemptCount').textContent = pasteAttemptCount;
                document.getElementById('focusChangeCount').textContent = focusChangeCount;
                document.getElementById('refreshViolationCount').textContent = refreshViolationCount;
                document.getElementById('totalViolations').textContent = totalViolations;
            }
        }
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
        

        // Update status message
        function updateStatus(message) {
            if (localStorage.getItem('examStarted') == "true") {
                document.getElementById('lastEvent').textContent = message;
            }
        }

        // Handle tab change events
        function handleTabChange() {
            if (localStorage.getItem('examStarted') == "true") {
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
            if (localStorage.getItem('examStarted') == "true") {
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
            if (localStorage.getItem('examStarted') == "true") {
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

        // Enter fullscreen mode
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

        // Handle fullscreen change events
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
                }
                updateStatus("Fullscreen entered");
            }
        }

        // Start webcam capture
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

        // Send activity ping to server
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
    

        // Prevent back button
        function preventBackButton() {
            window.history.pushState(null, "", window.location.href);
            window.onpopstate = function() {
                window.history.pushState(null, "", window.location.href);
            };
        }

        // Handle refresh detection
        function handleRefreshDetection() {
            // Check if there's a saved refresh count
            let refreshCount = parseInt(localStorage.getItem('examRefreshCount') || '0');
            if (localStorage.getItem('examStarted') == "true") {
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
