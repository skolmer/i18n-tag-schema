const logs = {
  log: [],
  error: []
}

export default {
  log: (msg) => { logs.log.push(msg) },
  error: (msg) => { logs.error.push(msg) },
  clear: () => { Object.keys(logs).forEach((key) => logs[key] = []) },
  get: (log) => logs[log]
}

