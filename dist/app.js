'use strict';

import particles_config from './particles-config.json' assert { type: 'json' };
import EUR_DATA from './EuropeDays.json' assert { type: 'json' };

let euro_trip;
let curr_state;

// Set exchange rates
// TODO: Setup api connection
fx.base = 'EUR';
fx.rates = {
  EUR: 1,
  GBP: 0.8849,
  CZK: 23.5328,
  CHF: 0.995,
  BAM: 1.9558,
  TRY: 21.1465,
};
fx.settings = {
  from: 'EUR',
  to: 'EUR',
};

class Trip {
  constructor(_days) {
    this.past_days = [];
    this.days = _days;
    this.total_budget = 0;
    this.total_spent = 0;

    for (let day of this.days) {
      this.total_budget += day.budget;
    }

    this.budget_remaining = this.total_budget;
    this.today = this.days[0];
  }

  addSpendToday = (spent, type) => {
    this.today.actual += spent;
    this.today.diff = this.today.budget - this.today.actual;
    this.today.transactions.push({ spent, type });
  };

  toNextDay = () => {
    this.total_spent += this.today.actual;
    this.past_days.push(this.today);
    this.days.shift();

    // Adjusting budget for remaining days.
    for (let day of this.days) {
      // a day's budget +
      // the difference in today's spend vs budget, now to be divided up * the proportion of total budget that a day's budget is
      day.budget += this.today.diff * (day.budget / (this.budget_remaining - this.today.budget));
    }

    this.budget_remaining = this.total_budget - this.total_spent;
    this.today = this.days[0];
  };
}

https: window.addEventListener('load', () => {
  // Initialize background particles
  particlesJS('particles', particles_config);

  // Initialize service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.log(`Service Worker error: ${err}`));
  }

  // Get/set EuropeDays data in local storage
  if (!localStorage.getItem('europeDays')) {
    euro_trip = new Trip(EUR_DATA);
    localStorage.setItem('europeDays', JSON.stringify(euro_trip));
  } else {
    let _days = JSON.parse(localStorage.getItem('europeDays')).days;
    euro_trip = new Trip(_days);
  }

  // Get/set app state in local storage
  if (!localStorage.getItem('currState')) {
    curr_state = euro_trip.today;
    localStorage.setItem('currState', JSON.stringify(curr_state));
  } else {
    curr_state = JSON.parse(localStorage.getItem('currState'));
  }

  // Update HTML with curr_state data
  updateAppContent();

  // Currency input mask for spend amount input
  let num_mask = IMask(document.getElementById('num_amount'), {
    mask: Number,
    scale: 2,
    signed: false,
    thousandsSeparator: ',',
    padFractionalZeros: true,
    normalizeZeros: true,
    radix: '.',
  });
});

document.getElementById('frm_add-spend').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));

  // convert currency based on sel_currency value
  data.amount = fx.convert(+data.amount, { from: data.currency });

  euro_trip.addSpendToday(+data.amount, data.type);
  curr_state = euro_trip.today;
  updateAppContent();

  return false;
});

const formInputs = document.querySelectorAll('#num_amount, #sel_currency, #sel_spendtype');
formInputs.forEach((input) => {
  input.addEventListener('input', () => {
    let values = [];
    formInputs.forEach((el) => values.push(el.value));
    // btn_add button is disabled if any input's value is ''
    document.getElementById('btn_add').disabled = values.includes('');
  });
});

document.getElementById('btn_submit').addEventListener('click', () => {
  euro_trip.toNextDay();
  curr_state = euro_trip.today;
  updateAppContent();
});

const updateAppContent = () => {
  // Update local storage
  localStorage.setItem('currState', JSON.stringify(curr_state));
  localStorage.setItem('europeDays', JSON.stringify(euro_trip));

  // Set locale currency
  let xr;
  let xr_sym;

  switch (curr_state.country) {
    case 'United Kingdom':
      xr = 'GBP';
      xr_sym = '\u20A4';
      break;
    case 'Czech Republic':
      xr = 'CZK';
      xr_sym = 'K' + '\u010d' + ' ';
      break;
    case 'Switzerland':
      xr = 'CHF';
      xr_sym = 'CHF ';
      break;
    case 'Bosnia & Herzegovina':
      xr = 'BAM';
      xr_sym = 'KM ';
      break;
    case 'Turkey':
      xr = 'TRY';
      xr_sym = 'TL ';
      break;
    default:
      xr = 'EUR';
      xr_sym = '\u20AC';
      break;
  }

  // Update HTML
  const budget_rem = curr_state.budget - curr_state.actual;
  document.getElementById('--code').innerHTML = curr_state.code;
  document.getElementById('--city').innerHTML = curr_state.city;
  let __budget_rem = document.getElementById('--budget_rem');
  __budget_rem.innerHTML = `${xr_sym}${fx.convert(budget_rem, { to: xr }).toFixed(2)}`;

  // Adjust --budget_rem h1 font-size relatively
  if (__budget_rem.innerHTML.length > 10) {
    __budget_rem.style.fontSize = '3rem';
  } else if (__budget_rem.innerHTML.length > 8) {
    __budget_rem.style.fontSize = '3.5rem';
  } else {
    __budget_rem.style.fontSize = '4rem';
  }

  // Set date
  const date = moment(curr_state.date, 'YYYYMMDD');
  const today = moment().startOf('day');
  const date_diff = Math.round(moment.duration(date - today).asDays());
  let rel_date;

  // Relative date (2 days ago, yesterday, tomorrow, etc.)
  if (date_diff == 1) {
    rel_date = 'Tomorrow';
  } else if (date_diff == -1) {
    rel_date = 'Yesterday';
  } else if (date_diff < -1) {
    rel_date = `${Math.abs(date_diff)} days ago`;
  } else {
    // Do not display --rel_date div
    rel_date = 'none';
  }

  document.getElementById('--date').innerHTML = date.format('MMMM Do');
  document.getElementById('--rel_date').style.display = rel_date;
  document.getElementById('--rel_date').innerHTML = rel_date;

  // Reset inputs
  document.getElementById('num_amount').value = '';
  document.getElementById('sel_currency').value = xr;
  document.getElementById('sel_spendtype').value = '';

  // Set background Image
  document.getElementById(
    'particles'
  ).style.backgroundImage = `url('./assets/${curr_state.code}.jpg')`;
};
