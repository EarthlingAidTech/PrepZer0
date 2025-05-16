document.addEventListener('keydown', function(e) {
 if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
    (e.ctrlKey && e.key === 'U')
  ) {
    e.preventDefault();
    console.log("Blocked key:", e.key);
  }
  if (e.key === 'Escape') {
    e.preventDefault(); // Stops the default action (if any)
    e.stopPropagation(); // Prevents the event from bubbling up
    console.log('Escape key disabled.');
  }
       if (e.key === 'F5' || e.keyCode === 116 || 
            ((e.metaKey || e.ctrlKey) && e.key === 'r')) {
            e.preventDefault();
            e.stopPropagation();
            showNotification("Page refresh is not allowed during the exam.");
            return false;
        }
        
        // F11 key or Command+Shift+F (Mac fullscreen)
        if (e.key === 'F11' || e.keyCode === 122 || 
            (e.metaKey && e.shiftKey && e.key === 'f')) {
            e.preventDefault();
            e.stopPropagation();
            showNotification("Exiting fullscreen is not allowed during the exam.");
            enterFullscreen(); // Force back to fullscreen
            return false;
        }
        
        // Command+W (Mac window close)
        if ((e.metaKey && e.key === 'w') || (e.key === 'F4' && e.altKey)) {
            e.preventDefault();
            e.stopPropagation();
            showNotification("Closing the window is not allowed during the exam.");
            return false;
        }
  // Prevent Ctrl+R (refresh)
  if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.keyCode === 82)) {
    e.preventDefault();
    e.stopPropagation();
    showNotification("Page refresh is not allowed during the exam.");
    return false;
  }
});
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
    
    // Check if we're within the exam schedule window
    const now = Date.now();
    if (now < scheduledAt) {
        alert("The exam has not started yet. Please come back at the scheduled time.");
        return false;
    }
    
    if (now > scheduleTill) {
        alert("The exam period has ended.");
        return false;
    }
    
    // Start the timer interval
    examTimerInterval = setInterval(updateExamTimer, 1000);
    return true;
}

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
    
    // // Create warning if less than 1 minute remaining
    // if (timeRemaining < 60 * 1000 && timeRemaining > 59 * 1000) {
    //     alert("Warning: Less than 1 minute remaining!");
    // }
}

