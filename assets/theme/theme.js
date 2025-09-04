const colors = {
  primary: '#000',
  primaryTextWhite: '#DEDFE0',
  primaryTextGrey: '#525C65',
  greyverse: '#a5a5a5ff',
  secondaryOrange: '#CB653F',
  blueDark: '#0D171F',
  secondary: '#bfc3c7',
  background: '#101A22',
  backgroundBlueNavy: '#111E27',
  tabInactive: '#eee',
  tabActive: '#000',
  text: '#333',
  textActive: '#fff',
};

const bibleCategory = {
  pentateuch: '#9e3c18ff',       // red-ish
  historical: '#763907ff',       // orange
  wisdom: '#0e421cff',           // yellow
  major_prophet: '#250b4eff',    // green
  minor_prophet: '#032049ff',    // blue
  gospel: '#87391cff',          // red-ish
  history: '#845EC2',          // purple
  pauline_epistle: '#083901ff',  // teal
  general_epistle: '#8a3f01da',  // light orange
  prophecy: '#5a0000ff',         // bright yellow
};

const fonts = {
  regular: 'Inter-Regular',
  bold: 'Inter-Bold',
  semiBold: 'Inter-semi-Bold',
  size: {
    title: 24,
    body: 18,
    small: 14,
    tab: 16,
  },
};

const spacing = {
  outerPadding: 16,
  innerPadding: 12,
};

export default { colors, fonts, spacing, bibleCategory };