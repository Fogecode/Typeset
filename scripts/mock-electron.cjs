// Electron stand-in: records what would have been opened instead of launching.
const opened = [];
module.exports = {
  shell: {
    openPath: async (p) => { opened.push(p); return ''; },
    openExternal: async (u) => { opened.push(u); return ''; },
  },
  opened,
};
