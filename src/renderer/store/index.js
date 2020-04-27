import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    loadingMainConfig: true
  },
  getters: {
    isLoading (state) {
      return state.loadingMainConfig
    }
  }
})

export default store
