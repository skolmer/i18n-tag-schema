const logs = {
  log: [],
  trace: [],
  warn: [],
  info: [],
  error: [],
  debug: []
}

export default {
  log: (msg) => { logs.log.push(msg) },
  trace: (msg) => { logs.trace.push(msg) },
  warn: (msg) => { logs.warn.push(msg) },
  info: (msg) => { logs.info.push(msg) },
  error: (msg) => { logs.error.push(msg) },
  debug: (msg) => { logs.debug.push(msg) },
  clear: () => { Object.keys(logs).forEach((key) => logs[key] = []) },
  get: (log) => logs[log],
  group: () => {},
  groupEnd: () => {}
}

