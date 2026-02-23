import { useEffect, useState } from "react";

export default function DashboardHome() {
  const [liveData, setLiveData] = useState("Waiting for data...");

  const sendCommand = async (cmd) => {
    await fetch("http://192.168.0.112:8080/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device: "CLASSROOM-706",
        command: cmd,
      }),
    });
  };

  useEffect(() => {
    const socket = new WebSocket("ws://192.168.0.112:8080");

    socket.onmessage = (event) => {
      console.log("Live Data:", event.data);
      setLiveData(event.data);
    };

    return () => socket.close();
  }, []);

  return (
    <div>
      <h2>Classroom 706 Live Data</h2>
      <p>{liveData}</p>

      <button onClick={() => sendCommand("AC_REQUEST")}>AC Request</button>

      <button onClick={() => sendCommand("EMERGENCY_REQ")}>Emergency</button>

      <button onClick={() => sendCommand("WASHROOM_REQUEST")}>Washroom</button>

      <button onClick={() => sendCommand("TEACHER_FORCE_PRESENT")}>
        Mark Teacher Present
      </button>
    </div>
  );
}
