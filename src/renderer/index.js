import Vue from 'vue'
import App from '@/App.vue'
import store from '@/store'
import router from '@/router'

new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
