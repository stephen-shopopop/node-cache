import { Console } from 'node:console';
import dockerCompose from 'docker-compose';
import isCI from 'is-ci';
import path from 'node:path';

const logger = new Console({ stderr: process.stderr, stdout: process.stdout });

export default async function () {
  logger.time('global-teardown');

  if (isCI) {
    // ️️️✅ Best Practice: Leave the DB up in dev environment
    await dockerCompose.down({
      config: 'compose.yml',
      cwd: path.join(process.cwd())
    });
  }

  // 👍🏼 We're ready
  logger.timeEnd('global-teardown');
}
