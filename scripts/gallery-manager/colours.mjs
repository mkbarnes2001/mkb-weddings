const colours = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  grey: '\x1b[90m',
};

export function ok(text) {
  console.log(`${colours.green}${text}${colours.reset}`);
}

export function warn(text) {
  console.log(`${colours.yellow}${text}${colours.reset}`);
}

export function err(text) {
  console.log(`${colours.red}${text}${colours.reset}`);
}

export function info(text) {
  console.log(`${colours.blue}${text}${colours.reset}`);
}

export function muted(text) {
  console.log(`${colours.grey}${text}${colours.reset}`);
}
