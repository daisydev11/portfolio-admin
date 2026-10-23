import { createApp } from './server.mjs';

const server = createApp();

server.listen(Number(process.env.PORT || 3000), () => {
  console.log('Portfolio admin server is running');
});
