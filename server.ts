import { createApp } from './app-server.mjs';

const server = createApp();

server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => {
  console.log('Portfolio admin server is running');
});

