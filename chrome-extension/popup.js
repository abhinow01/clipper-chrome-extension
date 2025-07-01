document.getElementById('startBtn').addEventListener('click', () => {
  const url = document.getElementById('youtubeUrl').value.trim();
  const startTime = document.getElementById('startTime').value.trim();
  const endTime = document.getElementById('endTime').value.trim();
  const button = document.getElementById('startBtn');
  const buttonText = document.getElementById('buttonText');
  const statusMessage = document.getElementById('statusMessage');

  // Clear previous status
  statusMessage.classList.remove('show', 'success', 'error');

  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    showStatus("Please enter a valid YouTube link.", 'error');
    return;
  }

  if (!startTime || !endTime) {
    showStatus("Please enter both start and end times.", 'error');
    return;
  }

  console.log("Sending URL to background:", url); 
  console.log("Start time:", startTime, "End time:", endTime);

  // Show processing state
  button.disabled = true;
  button.classList.add('processing');
  buttonText.textContent = 'Processing...';

fetch("http://localhost:4567/clip", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    url: url,
    startTime: startTime,
    endTime: endTime
  })
})
.then(res => {
  console.log("Response status:", res.status);
  console.log("Response ok:", res.ok);

  if (!res.ok) {
    throw new Error(`Server responded with status: ${res.status}`);
  }

  return res.blob(); // <-- response is a binary video, not JSON
})
.then(blob => {
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = 'clip.mp4';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);

  showStatus("Clip downloaded successfully!", 'success');
  resetButton();
})
.catch(err => {
  console.error("Clip download error:", err);

  if (err.name === 'TypeError' && err.message.includes('fetch')) {
    showStatus("Could not connect to clipper engine. Is the app running?", 'error');
  } else if (err.message.includes('status:')) {
    showStatus(`Server error: ${err.message}`, 'error');
  } else {
    showStatus("An unexpected error occurred. Please try again.", 'error');
  }

  resetButton();
});

  function resetButton() {
    setTimeout(() => {
      button.disabled = false;
      button.classList.remove('processing');
      buttonText.textContent = 'Clip Video';
    }, 1000);
  }

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.classList.add('show', type);
    
    setTimeout(() => {
      statusMessage.classList.remove('show');
    }, 4000);
  }
});

// Add input validation and formatting
document.getElementById('startTime').addEventListener('input', formatTimeInput);
document.getElementById('endTime').addEventListener('input', formatTimeInput);

function formatTimeInput(event) {
  let value = event.target.value.replace(/[^\d:]/g, '');
  
  // Auto-format to mm:ss if user enters numbers only
  if (value.length === 3 && !value.includes(':')) {
    value = value.charAt(0) + ':' + value.slice(1);
  } else if (value.length === 4 && !value.includes(':')) {
    value = value.slice(0, 2) + ':' + value.slice(2);
  }
  
  event.target.value = value;
}

// Add URL validation styling
document.getElementById('youtubeUrl').addEventListener('input', function(event) {
  const url = event.target.value.trim();
  const input = event.target;
  
  if (url && !url.includes("youtube.com") && !url.includes("youtu.be")) {
    input.style.borderColor = 'rgba(231, 76, 60, 0.5)';
  } else {
    input.style.borderColor = 'rgba(255,255,255,0.2)';
  }
});

// Add smooth focus transitions
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('focus', function() {
    this.parentElement.style.transform = 'scale(1.02)';
  });
  
  input.addEventListener('blur', function() {
    this.parentElement.style.transform = 'scale(1)';
  });
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    document.getElementById('startBtn').click();
  }
});

document.getElementById('downloadBackendBtn').addEventListener("click" , ()=>{
  const platform = navigator.platform.toLowerCase();
  let backendUrl ='';
  if(platform.includes('win')){
    backendUrl = 'https://yourdomain.com/executables/backend-windows.exe';
  }else if (platform.includes('mac')){
    backendUrl = 'https://yourdomain.com/executables/backend-macos'
  }else if(platform.includes('linux')) {
    backendUrl = 'https://yourdomain.com/executables/backend-linux';
  }else {
    showStatus("Unsupported OS. Please check GitHub releases.", 'error');
    return;
  }
  chrome.downloads.download({
    url: backendUrl,
    filename: backendUrl.split('/').pop(),
    saveAs: true
  }, (downloadId) => {
    if (downloadId) {
      showStatus("Download started. Run the file to enable clipping.", 'success');
    } else {
      showStatus("Failed to download. Try again.", 'error');
    }
  });
})