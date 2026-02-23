import { useEffect, useState } from "react";

export default function DashboardHome() {
  const [liveData, setLiveData] = useState("Waiting for data...");

  useEffect(() => {
    const socket = new WebSocket("ws://192.168.0.112:8081");

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
    </div>
  );
}
