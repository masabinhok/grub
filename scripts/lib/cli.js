'use strict';

const { ASSETS_DIR } = require('./constants');

const makeReaders = (argv) => ({
  hasFlag: (name) => argv.includes(`--${name}`),
  getOpt: (name, fallback = null) => {
    const i = argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
    if (i === -1) return fallback;
    if (argv[i].includes('=')) return argv[i].slice(argv[i].indexOf('=') + 1);
    return argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
  },
});

function parseArgs(argv = process.argv.slice(2)) {
  const { hasFlag, getOpt } = makeReaders(argv);
  return {
    dryRun: hasFlag('dry-run'),
    offline: hasFlag('offline'),
    apology: hasFlag('apology'),
    simulateDays: getOpt('days', process.env.PET_SIMULATE_DAYS || null),
    user: getOpt('user', process.env.PET_USERNAME || null),
    outDir: getOpt('outdir', ASSETS_DIR),
    only: getOpt('only', null),
    config: getOpt('config', process.env.GRUB_CONFIG || null),
    forceMood: getOpt('mood', null),
    // Experimental. Renders every card without its background or border.
    // Treated as a preview by update_pet.js, so it can never overwrite assets/.
    bare: hasFlag('bare'),
    includePrivate: hasFlag('include-private') || process.env.PET_INCLUDE_PRIVATE === '1',
    help: hasFlag('help') || hasFlag('h'),
  };
}

module.exports = { parseArgs };
