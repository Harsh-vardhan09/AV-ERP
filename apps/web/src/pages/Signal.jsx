import React, { useState, useEffect } from "react";
import axios from "axios";

const AttendanceApp = () => {
  const [broadcastSignal, setBroadcastSignal] = useState(null);
  const [passkey, setPasskey] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");

  // Function to detect broadcast (could be BLE/Wi-Fi)
  const detectBroadcast = () => {
    navigator.bluetooth.requestDevice({
      filters: [{ services: ['battery_service'] }],
    }).then(device => {
      // Simulate detection of a broadcasted passkey from the teacher
      const signalDetected = "some-broadcast-signal";
      setBroadcastSignal(signalDetected);
    }).catch(error => {
      console.error("Error detecting signal:", error);
    });
  };

  // Submit passkey and signal to backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${import.meta.env.VITE_PORT}/submit-attendance`, {
        passkey,
        broadcastSignal,
      });

      if (response.data.success) {
        setAttendanceStatus("Attendance Marked Successfully!");
      } else {
        setAttendanceStatus("Failed to mark attendance: " + response.data.message);
      }
    } catch (error) {
      console.error("Error submitting attendance:", error);
    }
  };

  return (
    <div>
      <h1>Attendance System</h1>
      <button onClick={detectBroadcast}>Detect Broadcast Signal</button>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={passkey}
          onChange={(e) => setPasskey(e.target.value)}
          placeholder="Enter Passkey"
          required
        />
        <button type="submit">Submit Attendance</button>
      </form>
      <p>{attendanceStatus}</p>
    </div>
  );
};

export default AttendanceApp;
