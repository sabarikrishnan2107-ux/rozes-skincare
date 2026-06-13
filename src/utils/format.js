import moment from 'moment';

export const fmtAED = (n) => `${(Number(n) || 0).toLocaleString()} AED`;

export const fmtNumber = (n) =>
  new Intl.NumberFormat('en-US').format(Number(n) || 0);

export const fmtDate = (d) => d ? moment(d).format('MMM D, YYYY') : '';
export const fmtDateShort = (d) => d ? moment(d).format('MMM D') : '';

export const todayISO = () => moment().format('YYYY-MM-DD');
