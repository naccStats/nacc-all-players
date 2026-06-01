/* Shared chart styling constants — import these instead of redefining per-page. */

export const TB = {
  bg: 'rgba(13,7,24,0.97)',
  bc: 'rgba(212,168,67,0.32)',
};

export const T = { color: '#7D7263' };

export const SL = { color: 'rgba(212,168,67,0.08)', type: 'dashed' };

export const baseTooltip = {
  backgroundColor: TB.bg,
  borderColor:     TB.bc,
  borderWidth:     1,
  textStyle:       { color: '#EDE0C4', fontSize: 11 },
};
