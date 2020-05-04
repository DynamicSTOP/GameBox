(function () {
  console.log('Hi! I am in a page scope! Much Powa! Very unsafe!')
  console.log('foo is currently', window.foo)
  console.log('this means you can change something through js in page scope here')

  XMLHttpRequest.prototype.oldSend = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.send = function () {
    // there you can log requests
    console.log('AJAX request was sent. May be you want to intercept it?', ...arguments);
    this.oldSend.call(this, ...arguments);
  }

  XMLHttpRequest.prototype.oldOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function () {
    // there you can log requests
    console.log('AJAX request was open. May be you want to intercept it?', ...arguments)
    this.oldOpen.call(this, ...arguments);
  }
})();
