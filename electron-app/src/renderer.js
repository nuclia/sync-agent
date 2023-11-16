async function updateProcessStatus() {
  try {
    const isRunning = await window.electron.getProcessStatus();
    console.log("is running update", isRunning);
    if (isRunning) {
      document.getElementById("startBtn").style.display = "none";
      document.getElementById("stopBtn").style.display = "block";
    } else {
      document.getElementById("startBtn").style.display = "block";
      document.getElementById("stopBtn").style.display = "none";
    }
    document.getElementById("processStatus").textContent = isRunning
      ? "Running"
      : "Not Running";
  } catch (error) {
    console.error("Error getting process status:", error);
  }
}

document.getElementById("startBtn").addEventListener("click", () => {
  window.electron.startProcess();
  setTimeout(updateProcessStatus, 100); // Update status after a short delay to allow the process to start
});

document.getElementById("stopBtn").addEventListener("click", () => {
  window.electron.stopProcess();
  setTimeout(updateProcessStatus, 100); // Update status after a short delay to allow the process to stop
});

window.electron.onUpdateProcessStatus(() => {
  console.log("onUpdateProcessStatus");
  setTimeout(updateProcessStatus, 100); // Update status after a short delay to allow the process to start
});
