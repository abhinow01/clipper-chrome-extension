chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message:", message); // ✅ LOG

  if (message.action === "openWallpaper") {
    try {
      let url = message.videoUrl;
      const cleanURL = new URL(url);
      let videoId = cleanURL.searchParams.get("v");

      if (!videoId && url.includes("youtu.be")) {
        videoId = url.split("/").pop();
      }

      if (!videoId) {
        console.error("Video ID not found.");
        return;
      }

      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&modestbranding=1`;

      chrome.windows.create({
        url: embedUrl,
        type: "popup",
        focused: true, // set to true for testing
        width: 1280,
        height: 720,
        top: 0,
        left: 0
      });

      sendResponse({ status: "success" });
    } catch (err) {
      console.error("Error in background script:", err);
      sendResponse({ status: "error", error: err.message });
    }
  }
  return true; // Needed for async sendResponse
});
