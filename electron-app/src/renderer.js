async function updateProcessStatus() {
  try {
    const isRunning = await window.electron.getProcessStatus();
    console.log("is running update", isRunning);
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
