const colors = {
  primary: '#000',
  primaryTextWhite: '#DEDFE0',
  primaryTextGrey: '#525C65',
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
  pentateuch: '#CB653F',       // red-ish
  historical: '#fe9540da',       // orange
  wisdom: '#0a6a01ff',           // yellow
  major_prophet: '#845EC2',    // green
  minor_prophet: '#036afcff',    // blue
  gospel: '#CB653F',          // red-ish
  history: '#845EC2',          // purple
  pauline_epistle: '#036afcff',  // teal
  general_epistle: '#fe9540da',  // light orange
  prophecy: '#F9F871',         // bright yellow
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