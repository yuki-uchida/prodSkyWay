(async function main() {
  const ConType = document.getElementById('ConnectionType');
  console.log('start');
  ConType.innerHTML = navigator.connection.type;
  navigator.connection.addEventListener( 'typechage', type => {
    console.log(type);
    ConType.innerHTML = type;
  });
})();
