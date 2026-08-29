function periodStart(period = 'all', now = new Date()) {
  const d = new Date(now);
  if (period === 'day') return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (period === 'week') {
    const day = d.getDay() || 7;
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    start.setDate(start.getDate() - day + 1);
    return start;
  }
  if (period === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  if (period === 'year') return new Date(d.getFullYear(), 0, 1);
  return null;
}

function periodLabel(period = 'all') {
  return ({ day: 'Hôm nay', week: 'Tuần này', month: 'Tháng này', year: 'Năm nay', all: 'Tổng hợp' })[period] || 'Tổng hợp';
}

module.exports = { periodStart, periodLabel };
