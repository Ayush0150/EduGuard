const WebSocket = require("ws");

const dash = new WebSocket("ws://127.0.0.1:8080");
const dev = new WebSocket("ws://127.0.0.1:8080");
const cats = new Set();
let gotCtrl = false,
  gotAck = false;

dev.on("open", () => {
  dev.send(JSON.stringify({ type: "register", device: "CLASSROOM-707" }));
  setTimeout(() => {
    const payloads = [
      {
        category: "arduino",
        payload:
          "class:707,P:2,PT:9,TP:1,AC:0,EM:0,GS:410,T:19:30,isSystemActive:true,isPresent:true,isTeacherAbsent:false,isACReq:false,isEmergencyReq:false,isWashroomDirty:false",
      },
      {
        category: "wifi",
        payload:
          "rssi=-42,ip=192.168.0.112,reconnects=0,uptime=1234,channel=6,ssid=ACTFIBERNET,mac=AA:BB:CC:DD:EE:FF",
      },
      {
        category: "gsm",
        payload:
          "signal=18,operator=Jio,battery=4.1V,reg=0:1,imei=865456789012345,iccid=8991500000000000001,sim=READY,net=GSM,gsmReady=true",
      },
      {
        category: "esp",
        payload:
          "heap=123456,minHeap=98000,cpuMHz=240,flashKB=4096,resetReason=1,uptime=1234,temp=48.3,cores=2",
      },
      {
        category: "device",
        payload:
          "firmware=2.1.0,chip=ESP32-D0WDQ6,rev=1,cores=2,sdk=v4.4.4,mac=AA:BB:CC:DD:EE:FF,flashMB=4",
      },
    ];
    for (const p of payloads) {
      dev.send(
        JSON.stringify({ type: "telemetry", device: "CLASSROOM-707", ...p })
      );
    }
  }, 400);
});

dev.on("message", (msg) => {
  const d = JSON.parse(msg);
  if (d.type === "control") {
    console.log("DEV_CMD:" + d.command);
    dev.send(
      JSON.stringify({
        type: "control_ack",
        device: "CLASSROOM-707",
        command: d.command,
      })
    );
  }
});

dash.on("open", () => {
  setTimeout(() => {
    dash.send(
      JSON.stringify({
        type: "control",
        device: "CLASSROOM-707",
        command: "AC_REQUEST",
      })
    );
  }, 1200);
});

dash.on("message", (msg) => {
  const d = JSON.parse(msg);
  if (d.type === "telemetry") cats.add(d.category);
  if (d.type === "control_status") {
    gotCtrl = true;
    console.log("CTRL_STATUS:" + d.status);
  }
  if (d.type === "control_ack") {
    gotAck = true;
    console.log("CTRL_ACK:" + d.command);
  }
  if (d.type === "device_status") console.log("DEV_ONLINE:" + d.online);

  if (cats.size >= 5 && gotCtrl && gotAck) {
    console.log("CATEGORIES:" + [...cats].sort().join(","));
    console.log("ALL_PASS");
    process.exit(0);
  }
});

setTimeout(() => {
  console.error(
    "TIMEOUT cats=" +
      [...cats].join(",") +
      ",ctrl=" +
      gotCtrl +
      ",ack=" +
      gotAck
  );
  process.exit(1);
}, 10000);
