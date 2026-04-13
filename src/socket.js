import AsyncStorage from "@react-native-async-storage/async-storage";
import { io } from "socket.io-client";

// export const socket = io("http://localhost:3001", {
//   transports: ["websocket"],
//   autoConnect: true,
// });

// console.log("Connected?", socket.connected);

// https://api.prolificdesigns.mokhsh.com
// https://api.mokhsh.com
// https://api.prolificdesigns.mokhsh.com

const socket = io("https://api.mokhsh.info", {
  path: "/api/socket.io/", 
   //transports: ["websocket"],
  transports: ["polling", "websocket"],
  autoConnect: true,
});

socket.on("connect", async() => {
  console.log("Connected with ID:", socket.id);

   try {
    const userString = await AsyncStorage.getItem("PM_USER"); 
    if (userString) {
      const user = JSON.parse(userString); 
      console.log("User:", user);

      const user_id = user?.id; 
      console.log("User ID:", user_id);

      if (user_id) {
        socket.emit("register", user_id); 
      }
    } else {
      console.log("No PM_USER found in AsyncStorage");
    }
  } catch (err) {
    console.error("Error reading PM_USER:", err);
  }
});

socket.on("connect_error", (error) => {
  console.log("Connection error:", error);
});

console.warn("Connected?", socket.connected);

socket.on("connect", () => {
  console.log("✅ Connected with ID:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error.message);
  console.error(error);
});

socket.on("disconnect", (reason) => {
  console.warn("⚠️ Disconnected:", reason);
});


socket.io.on("open", () => {
  console.log("🚀 Initial transport:", socket.io.engine.transport.name);
});


// 1. Real connection (reliable)
socket.on("connect", () => {
  console.log("🔗 Connected:", socket.id);
});

socket.on("hello_a_user_joined", (id) => {
    console.log("A user joined:", id);
});

// 2. Initial transport (polling or websocket)
socket.io.on("open", () => {
  console.log("🚀 Initial transport =", socket.io.engine.transport.name);
});

// 3. Upgraded to websocket
socket.io.on("upgrade", (transport) => {
  console.log("⬆️ Transport upgraded to =", transport.name);
});

// 4. WebSocket upgrade failed
socket.io.on("upgradeError", (err) => {
  console.error(" WebSocket upgrade failed:", err);
});

// 5. Disconnected
socket.on("disconnect", (reason) => {
  console.warn("⚠️ Disconnected:", reason);
});


socket.on("connect", () => {
  console.log("🟢 Connected?", socket.connected); // true
});

export default socket;  // <-- default export
