function show(id){
  document.querySelectorAll('section').forEach(s=>s.style.display='none');
  document.getElementById(id).style.display='block';
}

function savePortfolio(){
  const nw = document.getElementById('nwInput').value;
  localStorage.setItem('nw', nw);
  document.getElementById('nw').innerText = nw;
}

function saveAlloc(){
  const stocks = document.getElementById('stocks').value;
  const commodities = document.getElementById('commodities').value;
  const cash = document.getElementById('cash').value;

  localStorage.setItem('alloc', JSON.stringify({
    stocks,
    commodities,
    cash
  }));
}

function addTx(){
  const amount = document.getElementById('amount').value;
  const type = document.getElementById('type').value;

  let list = JSON.parse(localStorage.getItem('tx')||'[]');
  list.push({ amount, type });

  localStorage.setItem('tx', JSON.stringify(list));
  render();
}

function render(){
  let list = JSON.parse(localStorage.getItem('tx')||'[]');

  document.getElementById('list').innerHTML =
    list.map(x=>`<li>${x.type}: ${x.amount}</li>`).join('');

  document.getElementById('nw').innerText =
    localStorage.getItem('nw') || 0;
}

render();
