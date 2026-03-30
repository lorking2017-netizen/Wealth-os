
function show(id){
document.querySelectorAll('section').forEach(s=>s.style.display='none');
document.getElementById(id).style.display='block';
}

function savePortfolio(){
localStorage.setItem('nw', document.getElementById('nwInput').value);
document.getElementById('nw').innerText = localStorage.getItem('nw');
}

function saveAlloc(){
localStorage.setItem('alloc', JSON.stringify({
stocks:stocks.value,
commodities:commodities.value,
cash:cash.value
}));
}

function addTx(){
let list = JSON.parse(localStorage.getItem('tx')||'[]');
list.push({
amount:amount.value,
type:type.value
});
localStorage.setItem('tx', JSON.stringify(list));
render();
}

function render(){
let list = JSON.parse(localStorage.getItem('tx')||'[]');
document.getElementById('list').innerHTML = list.map(x=>`<li>${x.type}: ${x.amount}</li>`).join('');
document.getElementById('nw').innerText = localStorage.getItem('nw')||0;
}

render();
