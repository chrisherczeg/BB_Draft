import { io } from 'socket.io-client';

// Same-origin connection: dev uses the Vite proxy, prod serves from the Node server.
const socket = io({ autoConnect: true });

export default socket;
