
// Camera Test Utility
function testCameraAccess() {
  console.log("Testing camera access...");
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error("getUserMedia not supported");
    return;
  }
  
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      console.log("Camera access granted, tracks:", stream.getTracks().length);
      stream.getTracks().forEach(track => {
        console.log("Track:", track.label, "enabled:", track.enabled);
        track.stop();
      });
    })
    .catch(error => {
      console.error("Camera access failed:", error);
    });
}

// Run test
testCameraAccess();

