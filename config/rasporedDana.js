// ISO dani u tjednu: 1=ponedjeljak ... 7=nedjelja
const RASPORED_DANA = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6]
};

function izracunajOffsetDana(brojDanaTjedno, redniIndeksUSplitu) {
  const ciljaniDan = RASPORED_DANA[brojDanaTjedno][redniIndeksUSplitu];
  const danasDan = new Date().getDay();
  const isoTodayDay = danasDan === 0 ? 7 : danasDan;
  return (ciljaniDan - isoTodayDay + 7) % 7;
}

module.exports = { RASPORED_DANA, izracunajOffsetDana };
