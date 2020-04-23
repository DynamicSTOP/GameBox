import Vue from 'vue'
import App from '@/App.vue'

function receiveMessage (event) {
  if (event.data) {
    try {
      const data = JSON.parse(event.data)
      if (data.sender === 'main') {
        console.log('renderer', data)
      }
    } catch (e) {
    }
  }
}

window.addEventListener('message', receiveMessage, false)

window.postMessage(JSON.stringify({
  sender: 'renderer',
  mes: 'hello from rendererrrr!'
}))
console.log('message sent')

new Vue({
  components: { App },
  // router,
  // store,
  template: '<App/>'
}).$mount('#app')
