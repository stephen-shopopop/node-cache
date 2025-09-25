import { Console } from 'node:console';
import dockerCompose from 'docker-compose';
import net from 'node:net';

const logger = new Console({ stderr: process.stderr, stdout: process.stdout });

const isPortReachable = async (port, host = 'localhost', timeout = 1000) => {
  return await new Promise((resolve) => {
    const socket = new net.Socket();

    const onError = () => {
      socket.destroy() && resolve(false);
    };

    socket.setTimeout(timeout);
    socket.once('error', onError);
    socket.once('timeout', onError);

    socket.connect(port, host, () => {
      socket.end() && resolve(true);
    });
  });
};

// ️️️✅ Best Practice: force UTC
process.env.TZ = 'UTC';

export default async function setup() {
  logger.time('global-setup');

  // ️️️✅ Best Practice: Speed up during development, if already live then do nothing
  const isDBReachable = await isPortReachable(6379);

  if (!isDBReachable) {
    // ️️️✅ Best Practice: Start the infrastructure within a test hook
    await dockerCompose.upAll({
      config: 'compose.yml',
      cwd: path.join(process.cwd()),
      log: true
    });
  }

  // ... Put your setup

  // 👍🏼 We're ready
  logger.timeEnd('global-setup');
}
